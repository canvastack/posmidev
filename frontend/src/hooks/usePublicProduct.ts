import { useState, useEffect } from 'react';
import { contentApi } from '../api/contentApi';
import type { PublicProduct } from '../types';

interface UsePublicProductReturn {
  product: PublicProduct | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch single public product from API (no auth required)
 * Used for frontend product detail pages
 */
export function usePublicProduct(tenantId: string, productId: string): UsePublicProductReturn {
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await contentApi.getPublicProduct(tenantId, productId);

        if (isMounted) {
          setProduct(data);
        }
      } catch (err: any) {
        if (isMounted) {
          if (err.response?.status === 404) {
            setError('Product not found');
          } else {
            setError(err.response?.data?.message || 'Failed to load product');
          }
          console.error('Error fetching public product:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (tenantId && productId) {
      fetchProduct();
    }

    return () => {
      isMounted = false;
    };
  }, [tenantId, productId, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  return { product, loading, error, refetch };
}