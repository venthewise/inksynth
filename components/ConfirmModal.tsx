
import React, { useEffect } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, children }) => {
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
        className="relative bg-zinc-950/80 border border-zinc-800 rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6 md:p-8 text-white transform opacity-0 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'fade-in-scale 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        <h2 id="modal-title" className="text-2xl font-serif text-white">{title}</h2>
        <div className="mt-4 text-zinc-300 font-sans">
          {children}
        </div>
        <div className="mt-8 flex justify-end gap-4">
            <button
                onClick={onClose}
                className="border border-zinc-700 text-zinc-300 font-medium py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-zinc-800 hover:text-white duration-300"
            >
                Cancel
            </button>
            <button
                onClick={onConfirm}
                className="bg-accent-600 text-white font-semibold py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-accent-500 duration-300"
            >
                Continue
            </button>
        </div>
      </div>
       {/* Re-using styles from GuidelinesModal */}
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
