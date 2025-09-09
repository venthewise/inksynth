import React from 'react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Privacy Policy</h2>

        <div className="text-zinc-300 space-y-4">
          <section>
            <h3 className="text-lg font-semibold text-white mb-2">Data Collection</h3>
            <p>InkSynth processes images you upload for tattoo simulation purposes only. We do not store, share, or retain your images after processing.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">Image Processing</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Images are sent to Google's Gemini AI service for processing</li>
              <li>Processing happens in real-time and images are not stored on our servers</li>
              <li>Generated results are displayed to you and then discarded</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">Third-Party Services</h3>
            <p>We use Google's Gemini AI service for image generation. Their privacy policy applies to the processing of your images.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-white mb-2">Your Rights</h3>
            <p>You can stop using the service at any time. We recommend not uploading sensitive personal information.</p>
          </section>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="bg-accent-600 text-white px-4 py-2 rounded-lg hover:bg-accent-500 transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};