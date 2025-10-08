import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Category } from '@/types';

interface ProductSearchFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  categories: Category[];
  sortBy: string;
  onSortChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  stockFilter: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  onStockFilterChange: (value: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock') => void;
  minPrice: string;
  onMinPriceChange: (value: string) => void;
  maxPrice: string;
  onMaxPriceChange: (value: string) => void;
  onClearFilters: () => void;
  // Phase 9: Additional filters
  supplierFilter?: string | null;
  onSupplierFilterChange?: (value: string | null) => void;
  tagFilter?: string[];
  onTagFilterChange?: (value: string[]) => void;
}

export const ProductSearchFilters: React.FC<ProductSearchFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange,
  stockFilter,
  onStockFilterChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  onClearFilters,
  supplierFilter,
  onSupplierFilterChange,
  tagFilter,
  onTagFilterChange,
}) => {
  const hasActiveFilters = 
    searchQuery || 
    selectedCategory !== 'all' || 
    stockFilter !== 'all' || 
    minPrice || 
    maxPrice ||
    supplierFilter ||
    (tagFilter && tagFilter.length > 0);

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Search Bar */}
        <div className="relative mb-4">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search products by name, SKU, or description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-input transition-colors"
            >
              <option value="all">All Categories</option>
              {Array.isArray(categories) && categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Filter */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Stock Status
            </label>
            <select
              value={stockFilter}
              onChange={(e) => onStockFilterChange(e.target.value as any)}
              className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-input transition-colors"
            >
              <option value="all">All Stock Levels</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-input transition-colors"
            >
              <option value="created_at">Created Date</option>
              <option value="updated_at">Updated Date</option>
              <option value="name">Name</option>
              <option value="sku">SKU</option>
              <option value="price">Price</option>
              <option value="stock">Stock</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Order
            </label>
            <select
              value={sortOrder}
              onChange={(e) => onSortOrderChange(e.target.value as 'asc' | 'desc')}
              className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-input transition-colors"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>

        {/* Price Range Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Min Price
            </label>
            <Input
              type="number"
              placeholder="0"
              value={minPrice}
              onChange={(e) => onMinPriceChange(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Max Price
            </label>
            <Input
              type="number"
              placeholder="No limit"
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm pt-4 border-t border-border">
            <span className="font-medium text-foreground">Active filters:</span>
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Search: "{searchQuery}"
                <button onClick={() => onSearchChange('')} className="ml-1 hover:text-destructive">
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {selectedCategory !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Category: {categories.find(c => c.id === selectedCategory)?.name}
                <button onClick={() => onCategoryChange('all')} className="ml-1 hover:text-destructive">
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {stockFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1">
                Stock: {stockFilter.replace('_', ' ')}
                <button onClick={() => onStockFilterChange('all')} className="ml-1 hover:text-destructive">
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(minPrice || maxPrice) && (
              <Badge variant="secondary" className="gap-1">
                Price: {minPrice || '0'} - {maxPrice || '∞'}
                <button onClick={() => { onMinPriceChange(''); onMaxPriceChange(''); }} className="ml-1 hover:text-destructive">
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {supplierFilter && onSupplierFilterChange && (
              <Badge variant="secondary" className="gap-1">
                Supplier Filter
                <button onClick={() => onSupplierFilterChange(null)} className="ml-1 hover:text-destructive">
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {tagFilter && tagFilter.length > 0 && onTagFilterChange && (
              <Badge variant="secondary" className="gap-1">
                {tagFilter.length} Tag(s)
                <button onClick={() => onTagFilterChange([])} className="ml-1 hover:text-destructive">
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-primary hover:text-primary-700 font-medium"
            >
              Clear all
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};