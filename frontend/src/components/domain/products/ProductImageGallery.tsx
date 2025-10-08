/**
 * Product Image Gallery Component
 * Phase 7: Multi-Image Gallery
 * 
 * Features:
 * - Upload multiple images (max 10)
 * - Drag & drop reordering
 * - Set primary image
 * - Delete images
 * - Lightbox view
 * - Upload progress indicator
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Tenant-scoped operations
 * - Permission check: products.update
 */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/use-toast';
import { productApi } from '@/api/productApi';
import type { ProductImage } from '@/types';
import {
  PhotoIcon,
  TrashIcon,
  StarIcon,
  XMarkIcon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface ProductImageGalleryProps {
  tenantId: string;
  productId: string;
  images?: ProductImage[];
  onImagesChange?: () => void;
}

export default function ProductImageGallery({
  tenantId,
  productId,
  images: initialImages = [],
  onImagesChange,
}: ProductImageGalleryProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<ProductImage[]>(initialImages);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const MAX_IMAGES = 10;

  // Load images
  useEffect(() => {
    loadImages();
  }, [tenantId, productId]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const data = await productApi.getProductImages(tenantId, productId);
      setImages(data);
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Check limit
    if (images.length + files.length > MAX_IMAGES) {
      toast({
        title: 'Upload Limit Exceeded',
        description: `You can only upload ${MAX_IMAGES} images per product. Currently: ${images.length}/${MAX_IMAGES}`,
        variant: 'destructive',
      });
      return;
    }

    // Validate files
    const validFiles: File[] = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File',
          description: `${file.name} is not an image file`,
          variant: 'destructive',
        });
        continue;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: `${file.name} exceeds 2MB limit`,
          variant: 'destructive',
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    await uploadImages(validFiles);
  };

  // Upload images
  const uploadImages = async (files: File[]) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      await productApi.uploadProductImages(tenantId, productId, files);

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast({
        title: 'Success',
        description: `${files.length} image(s) uploaded successfully`,
      });

      // Reload images
      await loadImages();
      onImagesChange?.();
    } catch (error: any) {
      console.error('Failed to upload images:', error);
      toast({
        title: 'Upload Failed',
        description: error?.response?.data?.message || 'Failed to upload images',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Delete image
  const handleDelete = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await productApi.deleteProductImage(tenantId, productId, imageId);
      toast({
        title: 'Success',
        description: 'Image deleted successfully',
      });
      await loadImages();
      onImagesChange?.();
    } catch (error) {
      console.error('Failed to delete image:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete image',
        variant: 'destructive',
      });
    }
  };

  // Set primary image
  const handleSetPrimary = async (imageId: string) => {
    try {
      await productApi.setProductImagePrimary(tenantId, productId, imageId);
      toast({
        title: 'Success',
        description: 'Primary image updated',
      });
      await loadImages();
      onImagesChange?.();
    } catch (error) {
      console.error('Failed to set primary:', error);
      toast({
        title: 'Error',
        description: 'Failed to set primary image',
        variant: 'destructive',
      });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);

    setImages(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    try {
      const imageIds = images.map((img) => img.id);
      await productApi.reorderProductImages(tenantId, productId, imageIds);
      toast({
        title: 'Success',
        description: 'Images reordered successfully',
      });
      onImagesChange?.();
    } catch (error) {
      console.error('Failed to reorder:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder images',
        variant: 'destructive',
      });
      await loadImages(); // Reload to reset
    } finally {
      setDraggedIndex(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Product Images</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Product Images</CardTitle>
            <Badge variant={images.length >= MAX_IMAGES ? 'destructive' : 'default'}>
              {images.length}/{MAX_IMAGES}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Area */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || images.length >= MAX_IMAGES}
            >
              <PhotoIcon className="h-4 w-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Images'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Max {MAX_IMAGES} images. Supported: JPG, PNG, WebP. Max 2MB each.
            </p>

            {/* Upload Progress */}
            {uploading && (
              <div className="mt-2">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {uploadProgress}%
                </p>
              </div>
            )}
          </div>

          {/* Image Grid */}
          {images.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <PhotoIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No images yet</p>
              <p className="text-xs text-muted-foreground">Upload images to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    relative group border-2 rounded-lg overflow-hidden cursor-move
                    transition-all duration-200
                    ${image.is_primary ? 'border-primary ring-2 ring-primary/20' : 'border-border'}
                    ${draggedIndex === index ? 'opacity-50' : 'opacity-100'}
                    hover:border-primary/50
                  `}
                >
                  {/* Image */}
                  <div
                    className="aspect-square bg-gray-100 cursor-pointer"
                    onClick={() => setLightboxImage(image.image_url)}
                  >
                    <img
                      src={image.thumbnail_url || image.image_url}
                      alt={`Product ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Primary Badge */}
                  {image.is_primary && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-primary text-white">
                        <StarSolidIcon className="h-3 w-3 mr-1" />
                        Primary
                      </Badge>
                    </div>
                  )}

                  {/* Drag Indicator */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/50 text-white rounded p-1">
                      <ArrowsUpDownIcon className="h-3 w-3" />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-1 justify-end">
                      {!image.is_primary && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-white hover:text-primary hover:bg-white/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetPrimary(image.id);
                          }}
                        >
                          <StarIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-white hover:text-destructive hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(image.id);
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reorder Hint */}
          {images.length > 1 && (
            <p className="text-xs text-muted-foreground text-center">
              💡 Drag images to reorder them
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-modal bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setLightboxImage(null)}
          >
            <XMarkIcon className="h-8 w-8" />
          </button>
          <img
            src={lightboxImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}