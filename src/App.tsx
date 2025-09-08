
import React, { useState, useCallback, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { generateTattooSimulation, generateTattooDesign, generateMultiTattooSimulation } from './services/geminiService';
import { ImageFile } from './types';
import { BodyIcon, TattooIcon, SparklesIcon, DownloadIcon, RegenerateIcon, InfoIcon, WandIcon, ShareIcon, CropIcon, FlipIcon } from './components/Icons';
import { GuidelinesModal } from './components/GuidelinesModal';
import { ConfirmModal } from './components/ConfirmModal';
import { MultiTattooModal } from './components/MultiTattooModal';
import { ImageCropperModal } from './components/ImageCropperModal';
import { flipImageHorizontally } from './components/utils';

const TARGET_AREAS = ["Neck", "Chest", "Back", "Right Shoulder", "Left Shoulder", "Right Bicep", "Left Bicep", "Right Forearm", "Left Forearm", "Full Sleeve (Right Arm)", "Full Sleeve (Left Arm)", "Right Thigh", "Left Thigh", "Right Calf", "Left Calf"];
const PLACEMENT_OPTIONS = ["Standard (Flat)", "Bicep / Thigh", "Forearm / Calf", "Full Neck", "Full Back", "Full Arm Sleeve"];
type Mode = 'simulator' | 'designer' | 'multi-tattoo';

const base64toFile = (base64: string, filename: string): File => {
  const arr = base64.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

function App() {
  // Common State
  const [mode, setMode] = useState<Mode>('simulator');
  const [error, setError] = useState<string | null>(null);
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [croppingState, setCroppingState] = useState<{ image: ImageFile; onSave: (newFile: File) => void; } | null>(null);


  // Simulator State
  const [bodyPartImage, setBodyPartImage] = useState<ImageFile | null>(null);
  const [tattooDesignImage, setTattooDesignImage] = useState<ImageFile | null>(null);
  const [targetArea, setTargetArea] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [contrastLevel, setContrastLevel] = useState<number>(100);
  const [isOtherTargetArea, setIsOtherTargetArea] = useState<boolean>(false);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Designer State
  const [designerImages, setDesignerImages] = useState<(ImageFile | null)[]>([null, null, null]);
  const [designerPrompt, setDesignerPrompt] = useState<string>('');
  const [generatedDesign, setGeneratedDesign] = useState<ImageFile | null>(null);
  const [isGeneratingDesign, setIsGeneratingDesign] = useState<boolean>(false);
  const [designerError, setDesignerError] = useState<string | null>(null);
  const [isColorDesign, setIsColorDesign] = useState<boolean>(false);
  const [designerPlacement, setDesignerPlacement] = useState<string>('Standard (Flat)');

  // Multi-Tattoo State
  const [multiBodyPartImage, setMultiBodyPartImage] = useState<ImageFile | null>(null);
  const [multiTattooImage1, setMultiTattooImage1] = useState<ImageFile | null>(null);
  const [multiTattooImage2, setMultiTattooImage2] = useState<ImageFile | null>(null);
  const [multiTargetArea1, setMultiTargetArea1] = useState<string | null>(null);
  const [multiTargetArea2, setMultiTargetArea2] = useState<string | null>(null);
  const [isGeneratingMulti, setIsGeneratingMulti] = useState<boolean>(false);
  const [isRegeneratingMulti, setIsRegeneratingMulti] = useState<boolean>(false);
  const [multiTattooError, setMultiTattooError] = useState<string | null>(null);
  const [generatedMultiImage, setGeneratedMultiImage] = useState<string | null>(null);
  const [isMultiModalOpen, setIsMultiModalOpen] = useState(false);
  const [hasSeenMultiModal, setHasSeenMultiModal] = useState(false);
  const [isOtherTargetArea1, setIsOtherTargetArea1] = useState<boolean>(false);
  const [isOtherTargetArea2, setIsOtherTargetArea2] = useState<boolean>(false);

  useEffect(() => {
    // Check for duplicate target areas in multi-tattoo mode
    if (mode === 'multi-tattoo' && multiTargetArea1 && multiTargetArea2 && multiTargetArea1 === multiTargetArea2) {
      setMultiTattooError("Target areas cannot be the same. Please choose a different location for one tattoo.");
    } 
    // Clear the specific error if the condition is resolved
    else if (multiTattooError === "Target areas cannot be the same. Please choose a different location for one tattoo.") {
      setMultiTattooError(null);
    }
  }, [mode, multiTargetArea1, multiTargetArea2, multiTattooError]);

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    if (newMode === 'multi-tattoo' && !hasSeenMultiModal) {
      setIsMultiModalOpen(true);
      setHasSeenMultiModal(true);
    }
  };

  const handleCroppedImageSave = (newFile: File, originalSetter: (file: ImageFile | null) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        originalSetter({ file: newFile, previewUrl: reader.result as string });
    };
    reader.readAsDataURL(newFile);
    setCroppingState(null); // Close modal
  };

  const handleDesignerFileSelect = (file: File, index: number) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const newImageFile = { file, previewUrl: reader.result as string };
      const updatedImages = [...designerImages];
      updatedImages[index] = newImageFile;
      setDesignerImages(updatedImages);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateDesign = async () => {
    const filesToUpload = designerImages.filter((img): img is ImageFile => img !== null).map(img => img.file);
    if (filesToUpload.length === 0 || !designerPrompt) {
      setDesignerError('Please upload at least one image and provide a prompt.');
      return;
    }
    setIsGeneratingDesign(true);
    setDesignerError(null);
    setGeneratedDesign(null);
    try {
      const resultBase64 = await generateTattooDesign(filesToUpload, designerPrompt, isColorDesign, designerPlacement);
      const resultFile = base64toFile(resultBase64, 'generated-design.png');
      setGeneratedDesign({ file: resultFile, previewUrl: resultBase64 });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setDesignerError(errorMessage);
    } finally {
      setIsGeneratingDesign(false);
    }
  };
  
  const handleUseDesign = () => {
    if (!generatedDesign) return;
    setTattooDesignImage(generatedDesign);
    setMode('simulator');
    setGeneratedDesign(null);
    setDesignerImages([null, null, null]);
    setDesignerPrompt('');
    setIsColorDesign(false);
    setDesignerPlacement('Standard (Flat)');
  };

  const handleSimulatorFileSelect = useCallback((file: File, type: 'body' | 'tattoo') => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const newImageFile = { file, previewUrl: reader.result as string };
      if (type === 'body') {
        setBodyPartImage(newImageFile);
        setTargetArea(null);
      } else {
        setTattooDesignImage(newImageFile);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const runSimulation = async () => {
    if (!bodyPartImage || !tattooDesignImage || !targetArea) {
      setError('Please upload both images and select a target area before generating.');
      return;
    }
    setError(null);
    try {
      let finalBodyImageFile = bodyPartImage.file;
      let finalTargetArea = targetArea;

      // If a 'Right' body part is selected, flip the image and target the 'Left' side.
      if (targetArea.includes('Right')) {
        finalBodyImageFile = await flipImageHorizontally(bodyPartImage.file);
        finalTargetArea = targetArea.replace('Right', 'Left');
      }

      const result = await generateTattooSimulation(finalBodyImageFile, tattooDesignImage.file, finalTargetArea);
      setGeneratedImage(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    }
  };

  const handleShare = async (image: string | null) => {
    if (!image) return;
    try {
        const imageFile = base64toFile(image, 'tattoo-simulation.png');
        const shareData = {
            files: [imageFile],
            title: 'My InkSynth Tattoo Simulation',
            text: 'Check out my virtual tattoo try-on! Created with #InkSynth.',
        };
        if (navigator.canShare && navigator.canShare({ files: [imageFile] })) {
            await navigator.share(shareData);
        } else {
            alert('Sharing files is not supported on your browser.');
        }
    } catch (error) {
        if ((error as Error).name !== 'AbortError') {
            console.error('Sharing failed:', error);
            alert('An error occurred while sharing.');
        }
    }
  };

  const handleSubmit = () => {
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setIsConfirmModalOpen(false);
    setContrastLevel(100);
    // The output should be flipped if the input was a 'Right' side, 
    // to match the original photo's orientation.
    setIsFlipped(targetArea?.includes('Right') ?? false);
    setIsLoading(true);
    setGeneratedImage(null);
    await runSimulation();
    setIsLoading(false);
  };

  const handleRegenerate = async () => {
    setContrastLevel(100);
    // The output should be flipped if the input was a 'Right' side, 
    // to match the original photo's orientation.
    setIsFlipped(targetArea?.includes('Right') ?? false);
    setIsRegenerating(true);
    await runSimulation();
    setIsRegenerating(false);
  };

  const handleReset = () => {
    setBodyPartImage(null);
    setTattooDesignImage(null);
    setGeneratedImage(null);
    setTargetArea(null);
    setError(null);
    setIsLoading(false);
    setIsRegenerating(false);
    setContrastLevel(100);
    setIsFlipped(false);
    setIsOtherTargetArea(false);
  };
  
  const handleDownload = (image: string | null, filename: string, isFlipped: boolean = false) => {
    if (!image) return;

    if (!isFlipped) {
      const link = document.createElement('a');
      link.href = image;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const img = new Image();
    img.src = image;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error("Could not get canvas context for flipping.");
        const link = document.createElement('a');
        link.href = image;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.onerror = () => {
        console.error("Failed to load image for flipping, downloading original.");
        const link = document.createElement('a');
        link.href = image!;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };


  const handleDownloadDesign = () => {
    if (!generatedDesign) return;
    handleDownload(generatedDesign.previewUrl, 'generated-tattoo-design.png');
  };

  // Multi-Tattoo handlers
  const handleMultiFileSelect = useCallback((file: File, type: 'body' | 'tattoo1' | 'tattoo2') => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImageFile = { file, previewUrl: reader.result as string };
        if (type === 'body') {
            setMultiBodyPartImage(newImageFile);
            setMultiTargetArea1(null);
            setMultiTargetArea2(null);
        } else if (type === 'tattoo1') {
            setMultiTattooImage1(newImageFile);
        } else {
            setMultiTattooImage2(newImageFile);
        }
      };
      reader.readAsDataURL(file);
  }, []);

  const runMultiSimulation = async () => {
      if (!multiBodyPartImage || !multiTattooImage1 || !multiTattooImage2 || !multiTargetArea1 || !multiTargetArea2) {
        setMultiTattooError('Please upload all three images and select a target area for each tattoo before generating.');
        return;
      }
      if (multiTargetArea1 === multiTargetArea2) {
        setMultiTattooError('Target areas cannot be the same. Please choose a different location for one tattoo.');
        return;
      }
      setMultiTattooError(null);
      try {
          const result = await generateMultiTattooSimulation(multiBodyPartImage.file, multiTattooImage1.file, multiTargetArea1, multiTattooImage2.file, multiTargetArea2);
          setGeneratedMultiImage(result);
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          setMultiTattooError(errorMessage);
      }
  };

  const handleGenerateMulti = async () => {
      setContrastLevel(100);
      setIsFlipped(false);
      setIsGeneratingMulti(true);
      setGeneratedMultiImage(null);
      await runMultiSimulation();
      setIsGeneratingMulti(false);
  };
  
  const handleRegenerateMulti = async () => {
      setContrastLevel(100);
      setIsFlipped(false);
      setIsRegeneratingMulti(true);
      await runMultiSimulation();
      setIsRegeneratingMulti(false);
  };
  
  const handleResetMulti = () => {
      setMultiBodyPartImage(null);
      setMultiTattooImage1(null);
      setMultiTattooImage2(null);
      setMultiTargetArea1(null);
      setMultiTargetArea2(null);
      setGeneratedMultiImage(null);
      setMultiTattooError(null);
      setIsGeneratingMulti(false);
      setIsRegeneratingMulti(false);
      setContrastLevel(100);
      setIsFlipped(false);
      setIsOtherTargetArea1(false);
      setIsOtherTargetArea2(false);
  };

  const renderSimulator = () => (
    <>
      {generatedImage ? (
        <div className="flex flex-col items-center">
          <div className="w-full max-w-2xl bg-black/30 border border-zinc-800 p-2 rounded-lg">
            <img src={generatedImage} alt="Generated Tattoo" className="w-full h-auto rounded-md transition-all duration-300" style={{ filter: `contrast(${contrastLevel}%)`, transform: isFlipped ? 'scaleX(-1)' : 'none' }} />
          </div>

          <div className="w-full max-w-2xl mt-6">
            <label htmlFor="contrast-slider" className="block text-sm font-medium text-zinc-300 mb-2 text-center">
                Adjust Contrast
            </label>
            <input
                id="contrast-slider"
                type="range"
                min="50"
                max="150"
                value={contrastLevel}
                onChange={(e) => setContrastLevel(Number(e.target.value))}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-accent-500"
            />
          </div>

          <div className="w-full max-w-2xl mt-6 text-center text-zinc-400 bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
            <p>Don't like the current result? The InkSynth engine can still make mistakes, especially if the images don't meet our recommended guidelines. But don't worry, just <span className="font-semibold text-zinc-300">Regenerate it!</span></p>
          </div>

          {error && <p className="text-red-400 mt-4 bg-red-500/10 p-3 rounded-md max-w-2xl w-full text-center border border-red-500/20">{error}</p>}
          <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
            <button onClick={() => handleDownload(generatedImage, 'tattoo-simulation.png', isFlipped)} disabled={isRegenerating} className="bg-accent-600 text-white font-semibold py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-accent-500 duration-300 flex items-center gap-2 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed disabled:scale-100">
              <DownloadIcon /> Download
            </button>
            <button onClick={() => setIsFlipped(!isFlipped)} disabled={isRegenerating} className="bg-zinc-700 text-white font-semibold py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-zinc-600 duration-300 flex items-center gap-2 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed disabled:scale-100">
                <FlipIcon /> Flip
            </button>
            {navigator.share && (
              <button onClick={() => handleShare(generatedImage)} disabled={isRegenerating} className="bg-zinc-700 text-white font-semibold py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-zinc-600 duration-300 flex items-center gap-2 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed disabled:scale-100">
                  <ShareIcon /> Share
              </button>
            )}
            <button onClick={handleRegenerate} disabled={isRegenerating} className="bg-zinc-700 text-white font-semibold py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-zinc-600 duration-300 flex items-center gap-2 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed disabled:scale-100">
              {isRegenerating ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <RegenerateIcon />}
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
            <button onClick={handleReset} disabled={isRegenerating} className="border border-zinc-700 text-zinc-300 font-medium py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-zinc-800 hover:text-white duration-300 disabled:border-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed disabled:scale-100">
              Start Over
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="text-right mb-4">
            <button onClick={() => setIsGuidelinesOpen(true)} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors duration-200 text-sm font-medium">
              <InfoIcon /> View Guidelines
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="relative">
                <ImageUploader id="body-part-uploader" onFileSelect={(file) => handleSimulatorFileSelect(file, 'body')} previewUrl={bodyPartImage?.previewUrl || null} title="1. Upload Body Part Photo" icon={<BodyIcon />} containerHeight='h-80' />
                {bodyPartImage && (
                    <button onClick={() => setCroppingState({ image: bodyPartImage, onSave: (newFile) => handleCroppedImageSave(newFile, setBodyPartImage) })} className="absolute top-14 right-2 bg-black/60 backdrop-blur-sm text-white font-semibold py-2 px-3 rounded-full transition-all transform hover:scale-105 duration-300 flex items-center gap-2 text-sm">
                        <CropIcon /> Crop
                    </button>
                )}
            </div>
            <div className={`transition-opacity duration-500 relative ${bodyPartImage ? 'opacity-100' : 'opacity-40 md:opacity-100'}`}>
              <ImageUploader id="tattoo-design-uploader" onFileSelect={(file) => handleSimulatorFileSelect(file, 'tattoo')} previewUrl={tattooDesignImage?.previewUrl || null} title="2. Upload Tattoo Design" icon={<TattooIcon />} disabled={!bodyPartImage} containerHeight='h-80' />
              {tattooDesignImage && (
                <button onClick={() => setCroppingState({ image: tattooDesignImage, onSave: (newFile) => handleCroppedImageSave(newFile, setTattooDesignImage) })} className="absolute top-14 right-2 bg-black/60 backdrop-blur-sm text-white font-semibold py-2 px-3 rounded-full transition-all transform hover:scale-105 duration-300 flex items-center gap-2 text-sm">
                    <CropIcon /> Crop
                </button>
              )}
            </div>
          </div>
          {bodyPartImage && (
            <div className="mt-8 text-center transition-opacity duration-500">
              <h3 className="text-lg font-medium text-zinc-200 mb-4">3. On what part of the body is the tattoo?</h3>
              <div className="flex flex-wrap justify-center gap-3">
                {TARGET_AREAS.map(area => (
                  <button key={area} onClick={() => { setTargetArea(area); setIsOtherTargetArea(false); }} className={`px-4 py-2 text-sm font-medium rounded-full border transition-all duration-200 ${targetArea === area && !isOtherTargetArea ? 'bg-accent-600 text-white border-accent-600 scale-105' : 'bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600'}`}>
                    {area}
                  </button>
                ))}
                <button key="others" onClick={() => { setTargetArea(''); setIsOtherTargetArea(true); }} className={`px-4 py-2 text-sm font-medium rounded-full border transition-all duration-200 ${isOtherTargetArea ? 'bg-accent-600 text-white border-accent-600 scale-105' : 'bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600'}`}>
                  Other...
                </button>
              </div>
              {isOtherTargetArea && (
                <div className="mt-4 max-w-md mx-auto text-left animate-fade-in">
                    <label htmlFor="other-body-part" className="block text-sm font-medium text-zinc-300 mb-2">Please specify the body part:</label>
                    <input id="other-body-part" type="text" value={targetArea || ''} onChange={(e) => setTargetArea(e.target.value)} placeholder="e.g., Left Hand, Right Foot" className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2 text-zinc-200 focus:ring-1 focus:ring-accent-500 focus:border-accent-500 transition" />
                    <div className="text-xs text-amber-400 mt-2 bg-amber-950/50 p-2 rounded-md border border-amber-500/20 flex items-start gap-2">
                        <InfoIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Note: The simulator is optimized for the default body parts. Results for custom areas may vary in accuracy.</span>
                    </div>
                </div>
              )}
            </div>
          )}
          <div className="mt-8 text-center">
            {error && <p className="text-red-400 mb-4 bg-red-500/10 p-3 rounded-md max-w-2xl mx-auto border border-red-500/20">{error}</p>}
            <button onClick={handleSubmit} disabled={!bodyPartImage || !tattooDesignImage || !targetArea || isLoading} className="bg-accent-600 text-white disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed font-semibold py-3 px-10 rounded-full transition-all transform hover:scale-105 hover:bg-accent-500 duration-300 shadow-lg shadow-blue-900/20 disabled:shadow-none disabled:scale-100 flex items-center justify-center mx-auto mt-4">
              {isLoading ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Generating...</>) : (<><SparklesIcon className="mr-2" />Generate Simulation</>)}
            </button>
          </div>
        </div>
      )}
    </>
  );

  const renderMultiTattoo = () => (
    <>
      {generatedMultiImage ? (
          <div className="flex flex-col items-center">
            <div className="w-full max-w-2xl bg-black/30 border border-zinc-800 p-2 rounded-lg">
                <img src={generatedMultiImage} alt="Generated Multi-Tattoo" className="w-full h-auto rounded-md transition-all duration-300" style={{ filter: `contrast(${contrastLevel}%)`, transform: isFlipped ? 'scaleX(-1)' : 'none' }} />
            </div>

            <div className="w-full max-w-2xl mt-6">
                <label htmlFor="contrast-slider-multi" className="block text-sm font-medium text-zinc-300 mb-2 text-center">
                    Adjust Contrast
                </label>
                <input
                    id="contrast-slider-multi" type="range" min="50" max="150" value={contrastLevel}
                    onChange={(e) => setContrastLevel(Number(e.target.value))}
                    className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-accent-500" />
            </div>

            <div className="w-full max-w-2xl mt-6 text-center text-zinc-400 bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
              <p>Don't like the current result? The InkSynth engine can still make mistakes, especially if the images don't meet our recommended guidelines. But don't worry, just <span className="font-semibold text-zinc-300">Regenerate it!</span></p>
            </div>

            {multiTattooError && <p className="text-red-400 mt-4 bg-red-500/10 p-3 rounded-md max-w-2xl w-full text-center border border-red-500/20">{multiTattooError}</p>}
            <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
                <button onClick={() => handleDownload(generatedMultiImage, 'multi-tattoo-simulation.png', isFlipped)} disabled={isRegeneratingMulti} className="bg-accent-600 text-white font-semibold py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-accent-500 duration-300 flex items-center gap-2 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed disabled:scale-100">
                    <DownloadIcon /> Download
                </button>
                <button onClick={() => setIsFlipped(!isFlipped)} disabled={isRegeneratingMulti} className="bg-zinc-700 text-white font-semibold py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-zinc-600 duration-300 flex items-center gap-2 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed disabled:scale-100">
                    <FlipIcon /> Flip
                </button>
                {navigator.share && (
                    <button onClick={() => handleShare(generatedMultiImage)} disabled={isRegeneratingMulti} className="bg-zinc-700 text-white font-semibold py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-zinc-600 duration-300 flex items-center gap-2 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed disabled:scale-100">
                        <ShareIcon /> Share
                    </button>
                )}
                <button onClick={handleRegenerateMulti} disabled={isRegeneratingMulti} className="bg-zinc-700 text-white font-semibold py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-zinc-600 duration-300 flex items-center gap-2 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed disabled:scale-100">
                    {isRegeneratingMulti ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <RegenerateIcon />}
                    {isRegeneratingMulti ? 'Regenerating...' : 'Regenerate'}
                </button>
                <button onClick={handleResetMulti} disabled={isRegeneratingMulti} className="border border-zinc-700 text-zinc-300 font-medium py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-zinc-800 hover:text-white duration-300 disabled:border-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed disabled:scale-100">
                    Start Over
                </button>
            </div>
        </div>
      ) : (
        <div>
            <div className="relative">
                <ImageUploader id="multi-body-uploader" onFileSelect={(file) => handleMultiFileSelect(file, 'body')} previewUrl={multiBodyPartImage?.previewUrl || null} title="1. Upload Body Part Photo" icon={<BodyIcon />} containerHeight='h-80' />
                {multiBodyPartImage && (
                    <button onClick={() => setCroppingState({ image: multiBodyPartImage, onSave: (newFile) => handleCroppedImageSave(newFile, setMultiBodyPartImage) })} className="absolute top-14 right-2 bg-black/60 backdrop-blur-sm text-white font-semibold py-2 px-3 rounded-full transition-all transform hover:scale-105 duration-300 flex items-center gap-2 text-sm">
                        <CropIcon /> Crop
                    </button>
                )}
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-start mt-8 transition-opacity duration-500 ${multiBodyPartImage ? 'opacity-100' : 'opacity-40'}`}>
                <div className="relative">
                    <ImageUploader id="multi-tattoo1-uploader" onFileSelect={(file) => handleMultiFileSelect(file, 'tattoo1')} previewUrl={multiTattooImage1?.previewUrl || null} title="2. Upload First Tattoo" icon={<TattooIcon />} disabled={!multiBodyPartImage} containerHeight='h-72' />
                    {multiTattooImage1 && (
                      <button onClick={() => setCroppingState({ image: multiTattooImage1, onSave: (newFile) => handleCroppedImageSave(newFile, setMultiTattooImage1) })} className="absolute top-14 right-2 bg-black/60 backdrop-blur-sm text-white font-semibold py-2 px-3 rounded-full transition-all transform hover:scale-105 duration-300 flex items-center gap-2 text-sm">
                          <CropIcon /> Crop
                      </button>
                    )}
                    {multiBodyPartImage && (
                        <div className="mt-6 text-center">
                            <h3 className="text-base font-medium text-zinc-200 mb-3">Target Area for First Tattoo</h3>
                            <div className="flex flex-wrap justify-center gap-2">
                                {TARGET_AREAS.map(area => (
                                    <button key={`t1-${area}`} onClick={() => { setMultiTargetArea1(area); setIsOtherTargetArea1(false); }} className={`px-3 py-1 text-sm font-medium rounded-full border transition-all duration-200 ${multiTargetArea1 === area && !isOtherTargetArea1 ? 'bg-accent-600 text-white border-accent-600' : 'bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}>{area}</button>
                                ))}
                                <button key="t1-others" onClick={() => { setMultiTargetArea1(''); setIsOtherTargetArea1(true); }} className={`px-3 py-1 text-sm font-medium rounded-full border transition-all duration-200 ${isOtherTargetArea1 ? 'bg-accent-600 text-white border-accent-600' : 'bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}>Other...</button>
                            </div>
                            {isOtherTargetArea1 && (
                                <div className="mt-3 text-left animate-fade-in">
                                    <input type="text" value={multiTargetArea1 || ''} onChange={(e) => setMultiTargetArea1(e.target.value)} placeholder="e.g., Left Hand" className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2 text-sm text-zinc-200 focus:ring-1 focus:ring-accent-500"/>
                                    <div className="text-xs text-amber-400 mt-2 bg-amber-950/50 p-2 rounded-md border border-amber-500/20 flex items-start gap-2">
                                      <InfoIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                      <span>Note: Results for custom areas may vary.</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="relative">
                    <ImageUploader id="multi-tattoo2-uploader" onFileSelect={(file) => handleMultiFileSelect(file, 'tattoo2')} previewUrl={multiTattooImage2?.previewUrl || null} title="3. Upload Second Tattoo" icon={<TattooIcon />} disabled={!multiBodyPartImage} containerHeight='h-72' />
                     {multiTattooImage2 && (
                        <button onClick={() => setCroppingState({ image: multiTattooImage2, onSave: (newFile) => handleCroppedImageSave(newFile, setMultiTattooImage2) })} className="absolute top-14 right-2 bg-black/60 backdrop-blur-sm text-white font-semibold py-2 px-3 rounded-full transition-all transform hover:scale-105 duration-300 flex items-center gap-2 text-sm">
                            <CropIcon /> Crop
                        </button>
                     )}
                     {multiBodyPartImage && (
                        <div className="mt-6 text-center">
                            <h3 className="text-base font-medium text-zinc-200 mb-3">Target Area for Second Tattoo</h3>
                            <div className="flex flex-wrap justify-center gap-2">
                                {TARGET_AREAS.map(area => (
                                    <button key={`t2-${area}`} onClick={() => { setMultiTargetArea2(area); setIsOtherTargetArea2(false); }} className={`px-3 py-1 text-sm font-medium rounded-full border transition-all duration-200 ${multiTargetArea2 === area && !isOtherTargetArea2 ? 'bg-accent-600 text-white border-accent-600' : 'bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}>{area}</button>
                                ))}
                                <button key="t2-others" onClick={() => { setMultiTargetArea2(''); setIsOtherTargetArea2(true); }} className={`px-3 py-1 text-sm font-medium rounded-full border transition-all duration-200 ${isOtherTargetArea2 ? 'bg-accent-600 text-white border-accent-600' : 'bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800'}`}>Other...</button>
                            </div>
                            {isOtherTargetArea2 && (
                                <div className="mt-3 text-left animate-fade-in">
                                    <input type="text" value={multiTargetArea2 || ''} onChange={(e) => setMultiTargetArea2(e.target.value)} placeholder="e.g., Right Foot" className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2 text-sm text-zinc-200 focus:ring-1 focus:ring-accent-500"/>
                                    <div className="text-xs text-amber-400 mt-2 bg-amber-950/50 p-2 rounded-md border border-amber-500/20 flex items-start gap-2">
                                      <InfoIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                      <span>Note: Results for custom areas may vary.</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-8 text-center">
                {multiTattooError && <p className="text-red-400 mb-4 bg-red-500/10 p-3 rounded-md max-w-2xl mx-auto border border-red-500/20">{multiTattooError}</p>}
                <button onClick={handleGenerateMulti} disabled={!multiBodyPartImage || !multiTattooImage1 || !multiTattooImage2 || !multiTargetArea1 || !multiTargetArea2 || isGeneratingMulti || (multiTargetArea1 && multiTargetArea2 && multiTargetArea1 === multiTargetArea2)} className="bg-accent-600 text-white disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed font-semibold py-3 px-10 rounded-full transition-all transform hover:scale-105 hover:bg-accent-500 duration-300 shadow-lg shadow-blue-900/20 disabled:shadow-none disabled:scale-100 flex items-center justify-center mx-auto mt-4">
                    {isGeneratingMulti ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Generating...</>) : (<><WandIcon className="mr-2" />Generate Multi-Simulation</>)}
                </button>
            </div>
        </div>
      )}
    </>
  );

  const renderDesigner = () => (
    <div>
      <p className="text-center text-zinc-400 mb-8 max-w-3xl mx-auto">Combine up to 3 images with a text prompt to generate a unique tattoo design.</p>
      
      {generatedDesign ? (
         <div className="flex flex-col items-center">
            <div className="w-full max-w-lg bg-black/30 border border-zinc-800 p-2 rounded-lg">
                <img src={generatedDesign.previewUrl} alt="Generated Design" className="w-full h-auto rounded-md" />
            </div>
            {designerError && <p className="text-red-400 mt-4 bg-red-500/10 p-3 rounded-md max-w-lg w-full text-center border border-red-500/20">{designerError}</p>}
            <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
                <button onClick={handleUseDesign} className="bg-accent-600 text-white font-semibold py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-accent-500 duration-300 flex items-center gap-2">
                    <TattooIcon /> Use this Design
                </button>
                <button onClick={handleDownloadDesign} className="bg-zinc-700 text-white font-semibold py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-zinc-600 duration-300 flex items-center gap-2">
                    <DownloadIcon /> Download Design
                </button>
                <button onClick={() => {
                  setGeneratedDesign(null);
                  setIsColorDesign(false);
                  setDesignerPlacement('Standard (Flat)');
                }} className="border border-zinc-700 text-zinc-300 font-medium py-2 px-5 rounded-full transition-all transform hover:scale-105 hover:bg-zinc-800 hover:text-white duration-300">
                    Create Another
                </button>
            </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {[0, 1, 2].map(index => (
                  <div className="relative" key={index}>
                    <ImageUploader
                        id={`designer-uploader-${index}`}
                        onFileSelect={(file) => handleDesignerFileSelect(file, index)}
                        previewUrl={designerImages[index]?.previewUrl || null}
                        title={`Image ${index + 1}`}
                        icon={<TattooIcon />}
                        containerHeight="h-60"
                    />
                    {designerImages[index] && (
                       <button onClick={() => {
                           const currentImage = designerImages[index];
                           if (currentImage) {
                               setCroppingState({
                                   image: currentImage,
                                   onSave: (newFile) => handleCroppedImageSave(newFile, (img) => {
                                       const updated = [...designerImages];
                                       updated[index] = img;
                                       setDesignerImages(updated);
                                   })
                               });
                           }
                       }} className="absolute top-14 right-2 bg-black/60 backdrop-blur-sm text-white font-semibold py-2 px-3 rounded-full transition-all transform hover:scale-105 duration-300 flex items-center gap-2 text-sm">
                           <CropIcon /> Crop
                       </button>
                    )}
                  </div>
              ))}
          </div>

          <div className="mb-6">
              <div className="mb-6 text-center">
                  <label className="block text-lg font-medium text-zinc-200 mb-3">1. Choose your style</label>
                  <div className="inline-flex rounded-full bg-zinc-900 p-1 border border-zinc-700">
                      <button
                          onClick={() => setIsColorDesign(false)}
                          className={`px-6 py-2 text-sm font-semibold rounded-full transition-colors duration-300 ${!isColorDesign ? 'bg-accent-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                      >
                          Black & White
                      </button>
                      <button
                          onClick={() => setIsColorDesign(true)}
                          className={`px-6 py-2 text-sm font-semibold rounded-full transition-colors duration-300 ${isColorDesign ? 'bg-accent-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                      >
                          Color
                      </button>
                  </div>
              </div>

              <div className="mb-6 text-center">
                  <label className="block text-lg font-medium text-zinc-200 mb-3">2. Shape it for a body part</label>
                    <div className="flex flex-wrap justify-center gap-3">
                        {PLACEMENT_OPTIONS.map(option => (
                            <button
                                key={option}
                                onClick={() => setDesignerPlacement(option)}
                                className={`px-4 py-2 text-sm font-medium rounded-full border transition-all duration-200 ${designerPlacement === option ? 'bg-accent-600 text-white border-accent-600 scale-105' : 'bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-600'}`}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
              </div>

              <label htmlFor="designer-prompt" className="block text-lg font-medium text-zinc-200 mb-3 text-center">3. Let's get creative! How do you want these images designed?</label>
              <textarea
                  id="designer-prompt"
                  value={designerPrompt}
                  onChange={(e) => setDesignerPrompt(e.target.value)}
                  placeholder="e.g., Combine the images to create a watercolor splash style design"
                  className="w-full bg-zinc-950/50 border border-zinc-700 rounded-lg p-3 text-zinc-200 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors duration-200"
                  rows={3}
              />
          </div>
          
          <div className="text-center">
              {designerError && <p className="text-red-400 mb-4 bg-red-500/10 p-3 rounded-md max-w-2xl mx-auto border border-red-500/20">{designerError}</p>}
              <button onClick={handleGenerateDesign} disabled={isGeneratingDesign} className="bg-accent-600 text-white disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed font-semibold py-3 px-10 rounded-full transition-all transform hover:scale-105 hover:bg-accent-500 duration-300 shadow-lg shadow-blue-900/20 disabled:shadow-none disabled:scale-100 flex items-center justify-center mx-auto mt-4">
                  {isGeneratingDesign ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Generating...</>) : (<><WandIcon className="mr-2" />Generate Design</>)}
              </button>
          </div>
        </>
      )}
    </div>
  );

 const getPageDescription = () => {
    switch (mode) {
        case 'simulator':
            return 'Virtually try on your next tattoo. Upload a photo, add your design, and let AI create a realistic simulation.';
        case 'multi-tattoo':
            return 'See multiple tattoos at once. Upload a body photo and two designs to simulate a complete look.';
        case 'designer':
            return 'Unleash your creativity. Combine images and ideas to generate a unique tattoo design, shaped for any body part.';
        default:
            return '';
    }
 }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans">
      <div className="absolute inset-0 z-0 opacity-20">
        <svg className="absolute inset-0 h-full w-full stroke-zinc-800 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]" aria-hidden="true">
          <defs><pattern id="83fd4e5a-9d52-4224-87a9-6016e02132a1" width="200" height="200" x="50%" y="-1" patternUnits="userSpaceOnUse"><path d="M100 200V.5M.5 .5H200" fill="none"></path></pattern></defs>
          <svg x="50%" y="-1" className="overflow-visible fill-zinc-900"><path d="M-100.5 0h201v201h-201Z M699.5 0h201v201h-201Z M499.5 400h201v201h-201Z M-300.5 600h201v201h-201Z" strokeWidth="0"></path></svg>
          <rect width="100%" height="100%" strokeWidth="0" fill="url(#83fd4e5a-9d52-4224-87a9-6016e02132a1)"></rect>
        </svg>
      </div>
      <div className="relative container mx-auto px-4 py-8 md:py-16 z-10">
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-serif text-white">InkSynth</h1>
          <p className="mt-2 text-xl md:text-2xl font-sans italic text-zinc-300">See it Before the Needle Inks it.</p>
          <p className="mt-4 text-lg text-zinc-400 max-w-2xl mx-auto">{getPageDescription()}</p>
        </header>

        <main className="max-w-5xl mx-auto bg-black/40 backdrop-blur-lg border border-zinc-800 rounded-2xl p-6 md:p-10 shadow-2xl">
          <div className="flex justify-center border-b border-zinc-800 mb-8">
              <button onClick={() => handleModeChange('simulator')} className={`px-6 py-3 font-semibold text-lg transition-colors duration-300 ${mode === 'simulator' ? 'text-white border-b-2 border-accent-500' : 'text-zinc-500 hover:text-zinc-300'}`}>Simulator</button>
              <button onClick={() => handleModeChange('multi-tattoo')} className={`px-6 py-3 font-semibold text-lg transition-colors duration-300 ${mode === 'multi-tattoo' ? 'text-white border-b-2 border-accent-500' : 'text-zinc-500 hover:text-zinc-300'}`}>Multi-Tattoo</button>
              <button onClick={() => handleModeChange('designer')} className={`px-6 py-3 font-semibold text-lg transition-colors duration-300 ${mode === 'designer' ? 'text-white border-b-2 border-accent-500' : 'text-zinc-500 hover:text-zinc-300'}`}>Design Studio</button>
          </div>
          {mode === 'simulator' && renderSimulator()}
          {mode === 'multi-tattoo' && renderMultiTattoo()}
          {mode === 'designer' && renderDesigner()}
        </main>

        <footer className="text-center mt-12 text-zinc-600 text-sm"><p>Powered by Gemini. Images are processed and not stored.</p></footer>
      </div>
      <GuidelinesModal isOpen={isGuidelinesOpen} onClose={() => setIsGuidelinesOpen(false)} />
      <MultiTattooModal isOpen={isMultiModalOpen} onClose={() => setIsMultiModalOpen(false)} />
      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmSubmit}
        title="Image Quality Notice"
      >
        <p>For the best results, please ensure your uploaded images meet the recommended guidelines. Poor quality images may lead to a less than ideal simulation. Do you want to continue?</p>
      </ConfirmModal>
      {croppingState && (
          <ImageCropperModal
              isOpen={!!croppingState}
              onClose={() => setCroppingState(null)}
              imageFile={croppingState.image}
              onComplete={croppingState.onSave}
          />
      )}
    </div>
  );
}

export default App;
