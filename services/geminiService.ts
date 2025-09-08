// This service now acts as a client to our own secure backend API on Google Cloud Run.

// **IMPORTANT**: Replace this placeholder with your actual Cloud Run service URL after deployment.
const API_BASE_URL = 'https://inksynth-backend-870686277575.us-central1.run.app'; 

const fileToBase64 = (file: File): Promise<{mimeType: string, data: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || file.type;
      if (!data || !mimeType) {
        reject(new Error("Invalid file format."));
        return;
      }
      resolve({ mimeType, data });
    };
    reader.onerror = (error) => reject(error);
  });
};

// Generic function to handle API requests to our backend
async function postToApi(payload: object): Promise<string> {
  if (API_BASE_URL.includes('xxxxxxxx')) {
    throw new Error("API service URL is not configured. Please update the placeholder in services/geminiService.ts");
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Server responded with status: ${response.status}`);
    }

    if (!result.image) {
      throw new Error("API response did not contain an image.");
    }
    
    return result.image;
  } catch (error) {
     console.error(`Error during API call:`, error);
     const errorMessage = error instanceof Error ? error.message : "An unknown network error occurred.";
     throw new Error(errorMessage);
  }
}

export const generateTattooSimulation = async (
  bodyPartImage: File,
  tattooDesignImage: File,
  targetArea: string
): Promise<string> => {
  const bodyPartImageBase64 = await fileToBase64(bodyPartImage);
  const tattooDesignImageBase64 = await fileToBase64(tattooDesignImage);
  
  return postToApi({
    type: 'simulator',
    payload: {
      bodyPartImage: bodyPartImageBase64,
      tattooDesignImage: tattooDesignImageBase64,
      targetArea,
    }
  });
};

export const generateTattooDesign = async (
  images: File[],
  prompt: string,
  isColor: boolean,
  placement: string
): Promise<string> => {
  const imagePartsPromises = images.map(file => fileToBase64(file));
  const imagePartsBase64 = await Promise.all(imagePartsPromises);

  return postToApi({
    type: 'designer',
    payload: {
      images: imagePartsBase64,
      prompt,
      isColor,
      placement,
    }
  });
};

export const generateMultiTattooSimulation = async (
  bodyPartImage: File,
  tattooDesign1: File,
  targetArea1: string,
  tattooDesign2: File,
  targetArea2: string
): Promise<string> => {
  const bodyPartImageBase64 = await fileToBase64(bodyPartImage);
  const tattoo1Base64 = await fileToBase64(tattooDesign1);
  const tattoo2Base64 = await fileToBase64(tattooDesign2);

  return postToApi({
    type: 'multi-tattoo',
    payload: {
      bodyPartImage: bodyPartImageBase64,
      tattoo1: tattoo1Base64,
      targetArea1,
      tattoo2: tattoo2Base64,
      targetArea2,
    }
  });
};
