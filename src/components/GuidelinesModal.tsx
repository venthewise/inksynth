import React, { useEffect } from 'react';
import { CloseIcon } from './Icons';

interface GuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuidelinesModal: React.FC<GuidelinesModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="relative bg-zinc-950/80 border border-zinc-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6 md:p-8 text-white transform opacity-0 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fade-in-scale 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        <div className="flex justify-between items-start">
          <h2 id="modal-title" className="text-3xl font-serif text-white">Image Guidelines</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors" aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="mt-6 space-y-6 text-zinc-300 font-sans">
          <div>
            <h3 className="font-semibold text-lg text-white mb-2">For the Body Part Photo:</h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><span className="font-medium text-zinc-200">Good, Even Lighting:</span> Use bright, natural light. Avoid harsh shadows or dark rooms.</li>
              <li><span className="font-medium text-zinc-200">High Resolution & Sharp Focus:</span> A clear, high-resolution photo is crucial.</li>
              <li><span className="font-medium text-zinc-200">Clear, Unobstructed View:</span> Ensure the skin area is free of clothing, jewelry, or significant hair.</li>
              <li><span className="font-medium text-zinc-200">Straight-On Angle:</span> Take the photo from a direct perspective to avoid distortion.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white mb-2">For the Tattoo Design Image:</h3>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><span className="font-medium text-zinc-200">Clean Background (Most Important):</span> Use a plain white or transparent background. A PNG with a transparent background is ideal.</li>
              <li><span className="font-medium text-zinc-200">High Resolution:</span> A low-resolution design will look pixelated when applied.</li>
              <li><span className="font-medium text-zinc-200">High Contrast:</span> Designs with clear, well-defined lines produce the best results.</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 text-right">
            <button
                onClick={onClose}
                className="bg-accent-600 text-white font-semibold py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-accent-500 duration-300"
            >
                Got It
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
