import React, { useState, useEffect, useRef } from 'react';
import ReactCrop, { type Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { getCroppedImg } from './utils';
import { ImageFile } from '../types';

interface ImageCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: ImageFile;
  onComplete: (file: File) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ isOpen, onClose, imageFile, onComplete }) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
      width,
      height
    );
    setCrop(initialCrop);
  };

  const handleSave = async () => {
    if (!completedCrop || !imageFile || !imgRef.current) {
        return;
    }
    try {
        const croppedFile = await getCroppedImg(imageFile.file, completedCrop, imgRef.current);
        onComplete(croppedFile);
    } catch (e) {
        console.error("Cropping failed:", e);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative bg-zinc-950/80 border border-zinc-800 rounded-xl shadow-2xl max-w-3xl w-full mx-4 p-6 md:p-8 text-white transform opacity-0 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fade-in-scale 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        <h2 className="text-2xl font-serif text-white">Crop Image</h2>
        <div className="mt-4 text-zinc-400 bg-zinc-900/40 p-3 rounded-md border border-zinc-800 text-sm">
          <p><span className='font-bold text-zinc-300'>Tip:</span> Crop the image to focus on the essential areas. While this can help with precision, remember that the final generation quality still depends on a well-lit, high-resolution source image.</p>
        </div>
        <div className='mt-6 max-h-[60vh] overflow-y-auto bg-black/30 p-2 rounded-lg'>
            <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={undefined} // Free crop
                minWidth={50}
                minHeight={50}
            >
                <img ref={imgRef} src={imageFile.previewUrl} alt="Crop preview" onLoad={onImageLoad} style={{ maxHeight: '55vh' }}/>
            </ReactCrop>
        </div>
        <div className="mt-8 flex justify-end gap-4">
            <button
                onClick={onClose}
                className="border border-zinc-700 text-zinc-300 font-medium py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-zinc-800 hover:text-white duration-300"
            >
                Cancel
            </button>
            <button
                onClick={handleSave}
                disabled={!completedCrop?.width || !completedCrop?.height}
                className="bg-accent-600 text-white font-semibold py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-accent-500 duration-300 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed disabled:scale-100"
            >
                Save Crop
            </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-scale {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-scale {
            animation: fade-in-scale 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
};
