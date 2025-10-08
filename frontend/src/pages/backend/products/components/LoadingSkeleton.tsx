import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ rows = 5 }) => {
  return (
    <div className="p-6">
      {/* Desktop Table Skeleton */}
      <div className="hidden md:block space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 animate-pulse">
            <div className="h-10 bg-muted/50 rounded flex-1"></div>
            <div className="h-10 bg-muted/50 rounded w-24"></div>
            <div className="h-10 bg-muted/50 rounded w-32"></div>
            <div className="h-10 bg-muted/50 rounded w-24"></div>
            <div className="h-10 bg-muted/50 rounded w-20"></div>
            <div className="h-10 bg-muted/50 rounded w-24"></div>
          </div>
        ))}
      </div>
      {/* Mobile Card Skeleton */}
      <div className="md:hidden space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-muted/50 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};