import { useState, useEffect } from 'react';
import { contentApi } from '../api/contentApi';
import type { ContentPage } from '../types';

interface UseContentPageResult {
  page: ContentPage | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useContentPage(tenantId: string, slug: string): UseContentPageResult {
  const [page, setPage] = useState<ContentPage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = async () => {
    if (!tenantId || !slug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await contentApi.getContentPage(tenantId, slug);
      setPage(data);
    } catch (err: any) {
      console.error('Error fetching content page:', err);
      setError(err.response?.status === 404 ? 'Page not found' : 'Failed to load page content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage();

    return () => {
      setPage(null);
      setError(null);
    };
  }, [tenantId, slug]);

  return {
    page,
    loading,
    error,
    refetch: fetchPage,
  };
}