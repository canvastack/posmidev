import { useState, useEffect } from 'react';
import { contentApi } from '@/api/contentApi';
import type { FooterContent } from '@/types';

/**
 * Default footer content (fallback when API fails or tenant not set)
 */
const DEFAULT_FOOTER: FooterContent = {
  branding: {
    logo: 'POSMID',
    tagline: 'The future of retail with modern point of sale solutions.',
  },
  sections: [
    {
      title: 'Products',
      links: [
        { label: 'Food & Beverages', url: '/products?category=Food' },
        { label: 'Coffee & Tea', url: '/products?category=Coffee' },
        { label: 'Fashion', url: '/products?category=Fashion' },
        { label: 'Electronics', url: '/products?category=Electronics' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', url: '/company' },
        { label: 'Contact', url: '#contact' },
        { label: 'Careers', url: '#' },
        { label: 'Blog', url: '#' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Help Center', url: '#' },
        { label: 'Privacy Policy', url: '#' },
        { label: 'Terms of Service', url: '#' },
        { label: 'Admin Panel', url: '/admin' },
      ],
    },
  ],
  copyright: '© 2024 POSMID. All rights reserved. Built with ❤️ using React & Tailwind CSS.',
};

/**
 * Hook to fetch footer content from API
 * Falls back to default footer if tenant ID not available or API fails
 */
export function useFooterContent(tenantId: string | undefined) {
  const [footer, setFooter] = useState<FooterContent>(DEFAULT_FOOTER);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    // If no tenant ID, use default footer
    if (!tenantId) {
      setFooter(DEFAULT_FOOTER);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    // Fetch footer from API
    let isCancelled = false;
    setIsLoading(true);
    setIsError(false);

    contentApi
      .getPublicFooter(tenantId)
      .then((response) => {
        if (!isCancelled) {
          setFooter(response.footer);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          console.warn('Failed to load footer content, using default:', error);
          setFooter(DEFAULT_FOOTER);
          setIsError(true);
          setIsLoading(false);
        }
      });

    // Cleanup function to prevent state updates after unmount
    return () => {
      isCancelled = true;
    };
  }, [tenantId]);

  return {
    footer,
    isLoading,
    isError,
  };
}