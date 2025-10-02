import React from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ProductImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  fallbackIcon?: React.ReactNode;
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-full h-48',
};

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt = 'Product image',
  className,
  size = 'md',
  fallbackIcon,
}) => {
  const [imageError, setImageError] = React.useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  if (!src || imageError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300',
          sizeClasses[size],
          className
        )}
      >
        {fallbackIcon || <Package className="w-6 h-6 text-gray-400" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        'object-cover rounded-lg',
        sizeClasses[size],
        className
      )}
      onError={handleImageError}
    />
  );
};