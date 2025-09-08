import React, { useState, useCallback, useRef } from 'react';

interface ImageUploaderProps {
  id: string;
  onFileSelect: (file: File) => void;
  previewUrl: string | null;
  title: string;
  icon: React.ReactElement;
  className?: string;
  disabled?: boolean;
  containerHeight?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ id, onFileSelect, previewUrl, title, icon, className, disabled = false, containerHeight = 'h-80' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    handleDrag(e);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, [handleDrag, disabled]);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    handleDrag(e);
    setIsDragging(false);
  }, [handleDrag, disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    handleDrag(e);
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0] && e.dataTransfer.files[0].type.startsWith('image/')) {
      onFileSelect(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [handleDrag, onFileSelect, disabled]);
  
  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const isDisabledClass = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

  return (
    <div className={`flex flex-col items-center justify-center w-full ${className}`}>
       <h2 className="text-lg font-medium text-zinc-200 mb-3">{title}</h2>
      <div
        onClick={handleClick}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center w-full ${containerHeight} border-2 border-dashed rounded-lg transition-colors duration-300
          ${isDisabledClass}
          ${isDragging ? 'border-accent-500 bg-blue-950/30' : 'border-zinc-700 bg-zinc-950/50 hover:border-zinc-500'}
          ${previewUrl ? 'border-solid p-1 border-zinc-700' : ''}`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Preview" className="object-contain w-full h-full rounded-md" />
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
            {icon}
            <p className="mb-2 text-sm text-zinc-400"><span className="font-semibold text-zinc-200">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-zinc-500">PNG, JPG, WEBP</p>
          </div>
        )}
        <input ref={fileInputRef} id={id} type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={disabled}/>
      </div>
    </div>
  );
};