/**
 * Image URL Helper Utilities
 * 
 * Handles various image URL formats including:
 * - Local storage paths (/storage/...)
 * - External URLs (https://...)
 * - Localhost URLs with malformed paths
 * - Placeholder/demo images
 */

/**
 * Process and normalize image URLs for display
 * 
 * @param imageUrl - The raw image URL from the backend
 * @returns Processed URL ready for display, or null if invalid
 */
export const getImageUrl = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) {
    return null;
  }

  // If it's already a local storage path, return as is
  if (imageUrl.startsWith('/storage/') || imageUrl.startsWith('storage/')) {
    return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  }

  // Check if it's a local app URL (localhost:9000) - this should be displayed
  if (imageUrl.startsWith('http://localhost:9000') || imageUrl.startsWith('https://localhost:9000')) {
    // Special case: if URL contains /storage/https://... extract the external URL
    if (imageUrl.includes('/storage/https://') || imageUrl.includes('/storage/http://')) {
      const parts = imageUrl.split('/storage/');
      const extractedUrl = parts.length > 1 ? parts[1] : imageUrl;
      return extractedUrl;
    }

    return imageUrl;
  }

  // Check if it's a full external URL - display it directly (including valid external images)
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // Only treat as no-image if it's a known placeholder/demo domain
    const placeholderDomains = ['via.placeholder.com', 'picsum.photos', 'loremflickr.com', 'dummyimage.com'];
    const isPlaceholder = placeholderDomains.some(domain => imageUrl.includes(domain));

    if (isPlaceholder) {
      return null;
    }

    // Valid external URLs (including unsplash and other image services) should be displayed
    return imageUrl;
  }

  // Handle paths that start with 'products/' or 'products/thumb_'
  if (imageUrl.startsWith('products/') || imageUrl.startsWith('products/thumb_')) {
    return imageUrl;
  }

  // Default: prepend /storage/ if it's a relative path
  return `/storage/${imageUrl}`;
};

/**
 * Get optimized thumbnail URL or fallback to main image
 * 
 * @param thumbnailUrl - The thumbnail URL
 * @param imageUrl - The main image URL (fallback)
 * @returns Processed URL for display
 */
export const getThumbnailUrl = (
  thumbnailUrl: string | null | undefined,
  imageUrl: string | null | undefined
): string | null => {
  return getImageUrl(thumbnailUrl || imageUrl);
};

/**
 * Check if an image URL is valid and displayable
 * 
 * @param imageUrl - The image URL to check
 * @returns true if the URL is valid and not a placeholder
 */
export const isValidImageUrl = (imageUrl: string | null | undefined): boolean => {
  const processedUrl = getImageUrl(imageUrl);
  return processedUrl !== null;
};

/**
 * Get a default placeholder image URL
 * 
 * @param type - The type of placeholder (product, user, category, etc.)
 * @returns Placeholder image URL
 */
export const getPlaceholderImage = (type: 'product' | 'user' | 'category' = 'product'): string => {
  const placeholders = {
    product: '/images/placeholder-product.svg',
    user: '/images/placeholder-user.svg',
    category: '/images/placeholder-category.svg',
  };

  return placeholders[type] || placeholders.product;
};