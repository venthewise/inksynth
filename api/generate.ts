// This is a Vercel Serverless Function that acts as a secure proxy to the Google Gemini API.
// It is deployed automatically when placed in the /api directory.
// The API_KEY is securely accessed from Vercel's environment variables.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

// --- Initialization & Config ---
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set. Please add it to your Vercel project settings.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


// --- Helper Functions ---
const handleApiError = (error: unknown): Promise<never> => {
    console.error("Error calling Gemini API:", error);
    let detailedError = "An unknown error occurred during image generation.";
    if (error instanceof Error) {
        detailedError = error.message;
    }
    return Promise.reject(new Error(`Failed to generate: ${detailedError}`));
}

const extractImageFromResponse = (response: GenerateContentResponse): string => {
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
      }
    }
    const textResponse = response.text?.trim();
    if (textResponse) {
        throw new Error(`Model returned a text response instead of an image: ${textResponse}`);
    }
    throw new Error("No image was generated. The model might have refused the request.");
}

// --- API Logic for each mode ---
interface Base64Image {
  mimeType: string;
  data: string;
}

const runTattooSimulation = async (
  bodyPartImage: Base64Image,
  tattooDesignImage: Base64Image,
  targetArea: string
): Promise<string> => {
  try {
    let sleeveDefinition = '';
    if (targetArea.toLowerCase().includes('full sleeve')) {
      sleeveDefinition = `**SPECIAL INSTRUCTION FOR FULL SLEEVE:** A "Full Sleeve" tattoo covers the entire arm, from the shoulder down to the wrist. The design must be realistically wrapped around the arm and contained entirely within these boundaries.`;
    }
    const promptText = `
Your task is to place the provided tattoo design onto the subject's ${targetArea} in the main image.
${sleeveDefinition}
**MANDATORY RULES:**
1. PLACEMENT ACCURACY: The tattoo MUST be placed *only* on the specified "${targetArea}".
2. REALISM: The tattoo must blend seamlessly, conforming to body contours, muscle definition, lighting, and shadows.
3. IMAGE INTEGRITY: The output image MUST have the exact same dimensions and aspect ratio as the original body part image.
4. OUTPUT FORMAT: Your final output MUST be only the edited image itself. No text.
The target area is: **${targetArea}**.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          { inlineData: bodyPartImage },
          { text: promptText },
          { inlineData: tattooDesignImage },
        ],
      },
      config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    return extractImageFromResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
};

const runTattooDesign = async (
  images: Base64Image[],
  prompt: string,
  isColor: boolean,
  placement: string
): Promise<string> => {
   try {
    const colorInstruction = isColor ? "vibrant, full-color tattoo design" : "black and white tattoo design";
    let placementInstruction = 'The design should be presented in a standard, flat orientation.';
    switch (placement) {
        case 'Bicep / Thigh': placementInstruction = `The final design should be shaped to fit naturally on a bicep or thigh, often having a slightly curved or rounded rectangular form.`; break;
        case 'Forearm / Calf': placementInstruction = `The final design should be shaped to fit a forearm or calf, meaning it should be vertically elongated.`; break;
        case 'Full Neck': placementInstruction = `The final design should be shaped like a "gorget" or neckpiece, designed to fit the front and sides of the neck.`; break;
        case 'Full Back': placementInstruction = `The final design should be a large, expansive piece shaped to fit the entire back.`; break;
        case 'Full Arm Sleeve': placementInstruction = `The final design should be a "full sleeve" piece, created as a long, continuous design intended to be wrapped around an entire arm.`; break;
    }

    const parts = [
      { text: `Combine the following images based on this prompt: "${prompt}". Generate a single, cohesive, ${colorInstruction}. ${placementInstruction} The final image must have a clean, solid white background. Output only the final design image.` },
      ...images.map(part => ({ inlineData: part })),
    ];
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: { parts },
      config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    return extractImageFromResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
};

const runMultiTattooSimulation = async (
  bodyPartImage: Base64Image,
  tattooDesign1: Base64Image,
  targetArea1: string,
  tattooDesign2: Base64Image,
  targetArea2: string
): Promise<string> => {
  try {
    const promptText = `
Your task is to place TWO separate tattoo designs onto the subject in the main image with extreme precision.
**MANDATORY RULES FOR BOTH TATTOOS - NON-COMPLIANCE IS A TASK FAILURE:**
1. PERSPECTIVE DEFINITION (CRITICAL): 'Left' and 'Right' ALWAYS refer to the subject's own left and right, NOT the viewer's perspective. This is the most important rule.
2. PLACEMENT ACCURACY (CRITICAL): Each tattoo must be placed *only* on its specified target area.
3. REALISM: Both tattoos must blend seamlessly with the skin.
4. IMAGE INTEGRITY: The output image must have the exact same dimensions as the original.
5. OUTPUT FORMAT: Output only the single, final edited image containing BOTH tattoos. No text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          { inlineData: bodyPartImage },
          { text: promptText },
          { text: `TASK 1: Place this first tattoo design on the subject's **${targetArea1}**.` },
          { inlineData: tattooDesign1 },
          { text: `TASK 2: Place this second tattoo design on the subject's **${targetArea2}**.` },
          { inlineData: tattooDesign2 },
        ],
      },
      config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });
    return extractImageFromResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
};


// --- Vercel Serverless Function Handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow requests from all origins. You might want to restrict this to your domain in production.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { type, payload } = req.body;
    let resultImage: string;

    switch (type) {
      case 'simulator':
        resultImage = await runTattooSimulation(payload.bodyPartImage, payload.tattooDesignImage, payload.targetArea);
        break;
      case 'designer':
        resultImage = await runTattooDesign(payload.images, payload.prompt, payload.isColor, payload.placement);
        break;
      case 'multi-tattoo':
        resultImage = await runMultiTattooSimulation(payload.bodyPartImage, payload.tattoo1, payload.targetArea1, payload.tattoo2, payload.targetArea2);
        break;
      default:
        return res.status(400).json({ error: 'Invalid generation type specified.' });
    }

    return res.status(200).json({ image: resultImage });

  } catch (error) {
    console.error(`Error in API handler:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred.";
    return res.status(500).json({ error: errorMessage });
  }
}
