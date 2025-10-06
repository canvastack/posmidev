/**
 * React Query Provider Setup
 * 
 * Configures QueryClient with optimized defaults for the application
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Stale time configuration
 * - Cache time optimization
 * - Error handling defaults
 * - Devtools integration (development only)
 * 
 * @module providers/QueryProvider
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { type ReactNode } from 'react';

// ============================================================================
// QUERY CLIENT CONFIGURATION
// ============================================================================

/**
 * Create QueryClient instance with optimized defaults
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed requests
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Stale time: Data is fresh for 30 seconds by default
      staleTime: 30000, // 30 seconds
      
      // Cache time: Keep unused data in cache for 5 minutes
      gcTime: 300000, // 5 minutes (formerly cacheTime)
      
      // Refetch on window focus (for real-time data)
      refetchOnWindowFocus: true,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
      
      // Refetch on mount if data is stale
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations up to 1 time
      retry: 1,
      
      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
});

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Query Provider Component
 * Wraps the app with React Query context
 * 
 * @example
 * ```tsx
 * import { QueryProvider } from './providers/QueryProvider';
 * 
 * function App() {
 *   return (
 *     <QueryProvider>
 *       <YourApp />
 *     </QueryProvider>
 *   );
 * }
 * ```
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show devtools only in development */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools 
          initialIsOpen={false} 
          position="bottom"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}