/**
 * Reusable Image Upload Component with Camera Capture
 * 
 * Features:
 * - Upload from local device
 * - Camera capture (if available)
 * - Preview original and thumbnail
 * - Delete/Clear image
 * - Dark mode support
 * 
 * @package POSMID - Phase 1 MVP
 * @author Zencoder
 */

import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadWithCameraProps {
  value?: { original: string; thumb: string } | null;
  onChange: (file: File | null) => void;
  onDelete?: () => void;
  disabled?: boolean;
  maxSize?: number; // in MB
  acceptedFormats?: string[];
  showPreview?: boolean;
  label?: string;
  helperText?: string;
}

export const ImageUploadWithCamera: React.FC<ImageUploadWithCameraProps> = ({
  value,
  onChange,
  onDelete,
  disabled = false,
  maxSize = 5, // 5MB default
  acceptedFormats = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'],
  showPreview = true,
  label = 'Upload Gambar',
  helperText = `Format: JPG, PNG, GIF, WEBP. Maksimal ${maxSize}MB`,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    value?.original || null
  );
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      setError(`Format file tidak didukung. Gunakan: ${acceptedFormats.join(', ')}`);
      return;
    }

    // Validate file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSize) {
      setError(`Ukuran file terlalu besar. Maksimal ${maxSize}MB`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
      setError(null);
      onChange(file);
    };
    reader.readAsDataURL(file);
  };

  // Open file picker
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Start camera
  const startCamera = async () => {
    try {
      setIsCapturing(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Gagal mengakses kamera. Pastikan Anda memberikan izin akses kamera.');
      setIsCapturing(false);
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create file from blob
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });

        // Create preview
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        onChange(file);

        // Stop camera
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  // Clear/Delete image
  const handleClear = () => {
    setPreviewUrl(null);
    setError(null);
    onChange(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (onDelete) {
      onDelete();
    }
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />

      {/* Upload Controls */}
      {!isCapturing && !previewUrl && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={disabled}
              className="btn btn-secondary flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Pilih File
            </button>

            <button
              type="button"
              onClick={startCamera}
              disabled={disabled}
              className="btn btn-secondary flex items-center justify-center gap-2"
            >
              <Camera className="h-4 w-4" />
              Buka Kamera
            </button>
          </div>

          {helperText && (
            <p className="text-xs text-muted-foreground">{helperText}</p>
          )}
        </div>
      )}

      {/* Camera View */}
      {isCapturing && (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-auto"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={capturePhoto}
              className="btn btn-primary flex items-center justify-center gap-2"
            >
              <Camera className="h-4 w-4" />
              Ambil Foto
            </button>

            <button
              type="button"
              onClick={stopCamera}
              className="btn btn-secondary flex items-center justify-center gap-2"
            >
              <X className="h-4 w-4" />
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {showPreview && previewUrl && !isCapturing && (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border border-border bg-card p-4">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-auto max-h-64 object-contain mx-auto"
            />

            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-2 right-2 bg-danger-600 hover:bg-danger-700 text-white rounded-full p-2 shadow-lg transition-colors"
                title="Hapus gambar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={handleUploadClick}
              className="btn btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Ganti Gambar
            </button>
          )}
        </div>
      )}

      {/* Existing Image (from server) */}
      {showPreview && value && !previewUrl && !isCapturing && (
        <div className="space-y-2">
          <div className="relative rounded-lg overflow-hidden border border-border bg-card p-4">
            <img
              src={value.thumb || value.original}
              alt="Current"
              className="w-full h-auto max-h-64 object-contain mx-auto"
            />

            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-2 right-2 bg-danger-600 hover:bg-danger-700 text-white rounded-full p-2 shadow-lg transition-colors"
                title="Hapus gambar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={handleUploadClick}
              className="btn btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Ganti Gambar
            </button>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-danger-50 dark:bg-danger-900/20 rounded-lg">
          <X className="h-5 w-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-danger-800 dark:text-danger-200">{error}</p>
        </div>
      )}
    </div>
  );
};

export default ImageUploadWithCamera;