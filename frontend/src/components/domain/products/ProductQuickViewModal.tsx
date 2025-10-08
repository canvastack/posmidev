import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import type { Product } from '@/types';
import { getImageUrl } from '@/utils/imageHelpers';

interface ProductQuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onViewFull?: (product: Product) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function ProductQuickViewModal({
  product,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onViewFull,
  canEdit = false,
  canDelete = false,
}: ProductQuickViewModalProps) {
  if (!product) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const calculateMargin = () => {
    if (!product.cost_price || product.price <= 0) return null;
    return (((product.price - product.cost_price) / product.price) * 100).toFixed(1);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick View"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Header with Image and Basic Info */}
        <div className="flex gap-6">
          {/* Product Image */}
          <div className="flex-shrink-0">
            {getImageUrl(product.thumbnail_url || product.image_url) ? (
              <img
                src={getImageUrl(product.thumbnail_url || product.image_url) || ''}
                alt={product.name}
                className="w-32 h-32 object-cover rounded-lg shadow-md"
              />
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-400"
                >
                  <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"></path>
                  <path d="M12 22V12"></path>
                  <path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"></path>
                </svg>
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {product.name}
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <Badge
                variant={
                  product.status === 'active'
                    ? 'default'
                    : product.status === 'inactive'
                    ? 'secondary'
                    : 'destructive'
                }
              >
                {product.status || 'active'}
              </Badge>
              {product.category && (
                <Badge variant="outline">{product.category.name}</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
              {product.description || 'No description available'}
            </p>
          </div>
        </div>

        {/* Product Details Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* SKU */}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">SKU</p>
            <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">
              {product.sku}
            </p>
          </div>

          {/* Stock */}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Stock</p>
            <span
              className={`inline-flex px-2.5 py-1 text-sm font-semibold rounded-full ${
                product.stock > 10
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : product.stock > 0
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}
            >
              {product.stock} units
            </span>
          </div>

          {/* Price */}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Price</p>
            <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
              {formatCurrency(product.price)}
            </p>
          </div>

          {/* Cost Price */}
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Cost Price</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {product.cost_price ? formatCurrency(product.cost_price) : '-'}
            </p>
          </div>

          {/* Profit Margin */}
          {calculateMargin() && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Profit Margin
              </p>
              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                {calculateMargin()}%
              </p>
            </div>
          )}

          {/* Min Stock */}
          {product.min_stock !== undefined && product.min_stock !== null && (
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Min Stock
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {product.min_stock} units
              </p>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {new Date(product.created_at).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Last Updated
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {new Date(product.updated_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {onViewFull && (
            <Button
              variant="outline"
              onClick={() => onViewFull(product)}
              className="flex-1"
            >
              <EyeIcon className="h-4 w-4 mr-2" />
              View Full Details
            </Button>
          )}
          {canEdit && onEdit && (
            <Button variant="outline" onClick={() => onEdit(product)}>
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canDelete && onDelete && (
            <Button variant="outline" onClick={() => onDelete(product)}>
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}