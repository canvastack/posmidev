import { useState, useEffect } from 'react';
import { contentApi } from '../api/contentApi';
import type { PublicProduct, PublicProductsResponse } from '../types';

interface UsePublicProductsOptions {
  tenantId: string;
  searchQuery?: string;
  minStock?: number;
  limit?: number;
  page?: number;
}

interface UsePublicProductsReturn {
  products: PublicProduct[];
  loading: boolean;
  error: string | null;
  meta: PublicProductsResponse['meta'] | null;
  refetch: () => void;
}

/**
 * Hook to fetch public products from API (no auth required)
 * Used for frontend product catalog pages
 */
export function usePublicProducts(options: UsePublicProductsOptions): UsePublicProductsReturn {
  const { tenantId, searchQuery, minStock, limit = 12, page = 1 } = options;
  
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [meta, setMeta] = useState<PublicProductsResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await contentApi.getPublicProducts(tenantId, {
          q: searchQuery,
          minStock,
          limit,
          page,
        });

        if (isMounted) {
          setProducts(response.data);
          setMeta(response.meta);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load products');
          console.error('Error fetching public products:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [tenantId, searchQuery, minStock, limit, page, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger((prev) => prev + 1);
  };

  return { products, loading, error, meta, refetch };
}