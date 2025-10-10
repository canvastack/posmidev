import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * PageLoadingFallback Component
 * 
 * Beautiful loading skeleton for React.lazy suspense fallback
 * Matches the design system with dark/light mode support
 */
export function PageLoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
      <div className="text-center space-y-4">
        {/* Spinner */}
        <div className="flex justify-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
        </div>
        
        {/* Loading Text */}
        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground">
            Loading page...
          </p>
          <p className="text-sm text-muted-foreground">
            Please wait a moment
          </p>
        </div>

        {/* Skeleton Cards (optional aesthetic) */}
        <div className="mt-8 flex justify-center gap-4">
          <div className="w-16 h-16 bg-muted/50 animate-pulse rounded-lg"></div>
          <div className="w-16 h-16 bg-muted/50 animate-pulse rounded-lg delay-75"></div>
          <div className="w-16 h-16 bg-muted/50 animate-pulse rounded-lg delay-150"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for smaller content areas
 */
export function CompactLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}