
import React, { useEffect } from 'react';
import { CloseIcon, WandIcon } from './Icons';

interface MultiTattooModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MultiTattooModal: React.FC<MultiTattooModalProps> = ({ isOpen, onClose }) => {
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
          <h2 id="modal-title" className="text-3xl font-serif text-white flex items-center gap-3"><WandIcon className="w-7 h-7" /> Multi-Tattoo Simulator</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors" aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="mt-6 space-y-4 text-zinc-300 font-sans">
            <p>Welcome to the Multi-Tattoo simulator! This feature lets you preview two different tattoos on the same photo at once.</p>
            <div>
                <h3 className="font-semibold text-lg text-white mb-2">For the Best Results:</h3>
                <ul className="list-disc list-inside space-y-2 pl-2">
                    <li><span className="font-medium text-zinc-200">Match Design to Body Part:</span> Ensure your tattoo designs are appropriate for the body parts you select. For example, use a long, vertical design for a forearm, not a large, square one.</li>
                    <li><span className="font-medium text-zinc-200">Follow Image Guidelines:</span> High-quality, well-lit photos are essential. Remember that tattoo designs should have a clean, white, or transparent background.</li>
                    <li><span className="font-medium text-zinc-200">Be Specific:</span> Clearly select the target area for each tattoo to help the AI understand the precise placement.</li>
                </ul>
            </div>
            <p className="text-sm text-zinc-400 pt-2">This is a creative tool. The AI will do its best to blend the tattoos realistically, but results may vary.</p>
        </div>
        <div className="mt-8 text-right">
            <button
                onClick={onClose}
                className="bg-accent-600 text-white font-semibold py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-accent-500 duration-300"
            >
                Let's Go!
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
