// This service now acts as a client to our own secure backend, hosted on Vercel.

const resizeImage = (file: File, maxWidth: number = 1024, maxHeight: number = 1024): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        const resizedFile = new File([blob!], file.name, { type: file.type });
        resolve(resizedFile);
      }, file.type, 0.8); // 80% quality
    };

    img.src = URL.createObjectURL(file);
  });
};

const fileToBase64 = async (file: File): Promise<{mimeType: string, data: string}> => {
  const resizedFile = await resizeImage(file); // Resize before conversion
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(resizedFile);
    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || resizedFile.type;
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
  try {
    // We now use a relative path, which will automatically point to our Vercel Serverless Function.
    const response = await fetch(`/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseClone = response.clone(); // Clone for fallback to avoid body stream read error

    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      // If response is not JSON (e.g., HTML error page), get text from clone instead
      const text = await responseClone.text();
      throw new Error(`Server error (${response.status}): ${text.substring(0, 200)}...`);
    }

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
  targetArea: string,
  wasOriginallyRight: boolean = false
): Promise<string> => {
  const bodyPartImageBase64 = await fileToBase64(bodyPartImage);
  const tattooDesignImageBase64 = await fileToBase64(tattooDesignImage);

  return postToApi({
    type: 'simulator',
    payload: {
      bodyPartImage: bodyPartImageBase64,
      tattooDesignImage: tattooDesignImageBase64,
      targetArea,
      wasOriginallyRight,
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
