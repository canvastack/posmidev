import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

// ========================================
// SKELETON COMPONENTS
// ========================================

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    className={`animate-pulse bg-muted/50 rounded ${className}`}
    role="status"
    aria-label="Loading..."
  />
);

// ========================================
// VARIANT LIST SKELETON
// ========================================

export const VariantListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index} className="animate-fade-in">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            {/* Checkbox */}
            <Skeleton className="h-5 w-5" />

            {/* Variant Info */}
            <div className="flex-1 ml-4 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>

            {/* Price */}
            <div className="mr-4 space-y-2 text-right">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>

            {/* Stock */}
            <div className="mr-4">
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// ========================================
// VARIANT MATRIX SKELETON
// ========================================

export const VariantMatrixSkeleton: React.FC = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
    </CardHeader>
    <CardContent>
      {/* Attribute Selectors */}
      <div className="space-y-4 mb-6">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, index) => (
          <Card key={index} className="border-dashed">
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </CardContent>
  </Card>
);

// ========================================
// TEMPLATE GALLERY SKELETON
// ========================================

export const TemplateGallerySkeleton: React.FC = () => (
  <div className="space-y-4">
    {/* Search & Filters */}
    <div className="flex gap-4">
      <Skeleton className="h-10 flex-1" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>

    {/* Template Grid */}
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// ========================================
// ANALYTICS DASHBOARD SKELETON
// ========================================

export const AnalyticsDashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Overview Cards */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Line Chart */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>

    {/* Table */}
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

// ========================================
// PRODUCT DETAIL SKELETON
// ========================================

export const ProductDetailSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>

    {/* Tabs */}
    <div className="flex gap-4 border-b">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-32" />
    </div>

    {/* Content */}
    <VariantListSkeleton count={3} />
  </div>
);

// ========================================
// EXPORT ALL
// ========================================

export default {
  VariantListSkeleton,
  VariantMatrixSkeleton,
  TemplateGallerySkeleton,
  AnalyticsDashboardSkeleton,
  ProductDetailSkeleton,
};