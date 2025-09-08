import type { PixelCrop } from 'react-image-crop';

export const flipImageHorizontally = (imageFile: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      if (typeof e.target?.result !== 'string') {
        return reject(new Error("Failed to read file for flipping."));
      }
      img.src = e.target.result;
    };
    reader.onerror = reject;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error("Could not get canvas context for flipping."));
      }

      // Flip the context horizontally
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      // Draw the image
      ctx.drawImage(img, 0, 0);

      // Get the flipped image as a file
      canvas.toBlob((blob) => {
        if (!blob) {
          return reject(new Error("Failed to create blob from canvas."));
        }
        const flippedFile = new File([blob], imageFile.name, { type: imageFile.type });
        resolve(flippedFile);
      }, imageFile.type);
    };

    img.onerror = reject;

    reader.readAsDataURL(imageFile);
  });
};

export const getCroppedImg = (
  imageFile: File,
  crop: PixelCrop,
  imageElement: HTMLImageElement
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const originalImage = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      if (typeof e.target?.result !== 'string') {
        return reject(new Error("Failed to read file for cropping."));
      }
      originalImage.src = e.target.result;
    };
    reader.onerror = reject;

    originalImage.onload = () => {
      const canvas = document.createElement('canvas');

      const scaleX = originalImage.naturalWidth / imageElement.width;
      const scaleY = originalImage.naturalHeight / imageElement.height;
      
      canvas.width = Math.floor(crop.width * scaleX);
      canvas.height = Math.floor(crop.height * scaleY);

      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error("Could not get canvas context for cropping."));
      }

      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
      canvas.height = Math.floor(crop.height * scaleY * pixelRatio);
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.imageSmoothingQuality = 'high';
      
      const sourceX = crop.x * scaleX;
      const sourceY = crop.y * scaleY;
      const sourceWidth = crop.width * scaleX;
      const sourceHeight = crop.height * scaleY;

      ctx.drawImage(
        originalImage,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        sourceWidth,
        sourceHeight
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          return reject(new Error("Failed to create blob from cropped canvas."));
        }
        const croppedFile = new File([blob], imageFile.name, { type: imageFile.type });
        resolve(croppedFile);
      }, imageFile.type);
    };
    originalImage.onerror = reject;

    reader.readAsDataURL(imageFile);
  });
};
