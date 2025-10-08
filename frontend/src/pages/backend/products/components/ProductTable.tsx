import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/Checkbox';
import { getImageUrl } from '@/utils/imageHelpers';
import { PencilIcon, TrashIcon, ClockIcon, EyeIcon, ArrowUpIcon, ArrowDownIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { BarcodeGenerateButton } from '@/components/domain/products/BarcodeGenerateButton';
import type { Product } from '@/types';

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
  onToggleAllSelection: () => void;
  isAllSelected: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onViewHistory: (product: Product) => void;
  onQuickView: (product: Product) => void;
  onDuplicate?: (product: Product) => void;
  deleting: string | null;
  isColumnVisible: (column: string) => boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  hasEditPermission: boolean;
  hasDeletePermission: boolean;
  hasCreatePermission?: boolean;
  hasViewPermission?: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date: string | null): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  loading,
  selectedIds,
  onToggleSelection,
  onToggleAllSelection,
  isAllSelected,
  onEdit,
  onDelete,
  onViewHistory,
  onQuickView,
  onDuplicate,
  deleting,
  isColumnVisible,
  sortBy,
  sortOrder,
  onSort,
  hasEditPermission,
  hasDeletePermission,
  hasCreatePermission = false,
  hasViewPermission = true,
}) => {
  const navigate = useNavigate();
  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? (
      <ArrowUpIcon className="inline-block h-4 w-4 ml-1" />
    ) : (
      <ArrowDownIcon className="inline-block h-4 w-4 ml-1" />
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="hidden md:block space-y-3">
          {/* Table Skeleton - matches index-full.tsx */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="h-10 bg-gray-200 rounded flex-1"></div>
              <div className="h-10 bg-gray-200 rounded w-24"></div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
              <div className="h-10 bg-gray-200 rounded w-24"></div>
              <div className="h-10 bg-gray-200 rounded w-20"></div>
              <div className="h-10 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
        {/* Mobile Card Skeleton */}
        <div className="md:hidden space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No products found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <Table scrollX={true}>
        <TableHeader>
          <TableRow>
            {isColumnVisible('checkbox') && (
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onChange={(e) => {
                    onToggleAllSelection();
                  }}
                />
              </TableHead>
            )}
            {isColumnVisible('image') && <TableHead className="w-16">Image</TableHead>}
            {isColumnVisible('name') && (
              <TableHead>
                <div
                  className="cursor-pointer hover:text-primary select-none"
                  onClick={() => onSort('name')}
                >
                  Name {renderSortIcon('name')}
                </div>
              </TableHead>
            )}
            {isColumnVisible('sku') && <TableHead>SKU</TableHead>}
            {isColumnVisible('category') && <TableHead>Category</TableHead>}
            {isColumnVisible('price') && (
              <TableHead>
                <div
                  className="cursor-pointer hover:text-primary select-none"
                  onClick={() => onSort('price')}
                >
                  Price {renderSortIcon('price')}
                </div>
              </TableHead>
            )}
            {isColumnVisible('cost_price') && <TableHead>Cost Price</TableHead>}
            {isColumnVisible('profit_margin') && <TableHead>Margin</TableHead>}
            {isColumnVisible('stock') && (
              <TableHead>
                <div
                  className="cursor-pointer hover:text-primary select-none"
                  onClick={() => onSort('stock')}
                >
                  Stock {renderSortIcon('stock')}
                </div>
              </TableHead>
            )}
            {isColumnVisible('status') && <TableHead>Status</TableHead>}
            {isColumnVisible('created_at') && <TableHead>Created</TableHead>}
            {isColumnVisible('updated_at') && <TableHead>Updated</TableHead>}
            {/* Phase 9 columns */}
            {isColumnVisible('supplier') && <TableHead>Supplier</TableHead>}
            {isColumnVisible('uom') && <TableHead>UOM</TableHead>}
            {isColumnVisible('tags') && <TableHead>Tags</TableHead>}
            {isColumnVisible('tax') && <TableHead>Tax</TableHead>}
            {isColumnVisible('actions') && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              {isColumnVisible('checkbox') && (
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(product.id)}
                    onChange={() => onToggleSelection(product.id)}
                  />
                </TableCell>
              )}
              {isColumnVisible('image') && (
                <TableCell>
                  {getImageUrl(product.thumbnail_url || product.image_url) ? (
                    <img
                      src={getImageUrl(product.thumbnail_url || product.image_url) || ''}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="w-6 h-6 text-muted-foreground"
                      >
                        <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"></path>
                        <path d="M12 22V12"></path>
                        <path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"></path>
                      </svg>
                    </div>
                  )}
                </TableCell>
              )}
              {isColumnVisible('name') && (
                <TableCell>
                  <div>
                    <div className="font-medium">{product.name}</div>
                    {product.description && (
                      <div className="text-sm text-muted-foreground truncate max-w-xs">
                        {product.description}
                      </div>
                    )}
                  </div>
                </TableCell>
              )}
              {isColumnVisible('sku') && (
                <TableCell className="font-mono text-sm">{product.sku}</TableCell>
              )}
              {isColumnVisible('category') && (
                <TableCell>
                  {product.category ? (
                    <Badge variant="outline">{product.category.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">No category</span>
                  )}
                </TableCell>
              )}
              {isColumnVisible('price') && (
                <TableCell className="font-semibold">{formatCurrency(product.price)}</TableCell>
              )}
              {isColumnVisible('cost_price') && (
                <TableCell className="text-sm text-muted-foreground">
                  {product.cost_price ? formatCurrency(product.cost_price) : '-'}
                </TableCell>
              )}
              {isColumnVisible('profit_margin') && (
                <TableCell className="text-sm text-muted-foreground">
                  {product.cost_price && product.price > 0
                    ? `${(((product.price - product.cost_price) / product.price) * 100).toFixed(1)}%`
                    : '-'}
                </TableCell>
              )}
              {isColumnVisible('stock') && (
                <TableCell>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      product.stock > 10
                        ? 'bg-success/10 text-success'
                        : product.stock > 0
                        ? 'bg-warning/10 text-warning'
                        : 'bg-danger/10 text-danger'
                    }`}
                  >
                    {product.stock}
                  </span>
                </TableCell>
              )}
              {isColumnVisible('status') && (
                <TableCell>
                  <Badge
                    variant={
                      product.status === 'active'
                        ? 'default'
                        : product.status === 'inactive'
                        ? 'secondary'
                        : 'destructive'
                    }
                  >
                    {product.status}
                  </Badge>
                </TableCell>
              )}
              {isColumnVisible('created_at') && (
                <TableCell className="text-sm">{formatDate(product.created_at)}</TableCell>
              )}
              {isColumnVisible('updated_at') && (
                <TableCell className="text-sm">{formatDate(product.updated_at)}</TableCell>
              )}
              {/* Phase 9 columns */}
              {isColumnVisible('supplier') && (
                <TableCell className="text-sm">
                  {product.supplier ? product.supplier.name : '-'}
                </TableCell>
              )}
              {isColumnVisible('uom') && (
                <TableCell>
                  {product.uom ? (
                    <Badge variant="outline" className="text-xs">
                      {product.uom}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
              )}
              {isColumnVisible('tags') && (
                <TableCell>
                  {product.tags && product.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {product.tags.slice(0, 2).map((tag) => (
                        <Badge
                          key={tag.id}
                          style={{
                            backgroundColor: `${tag.color}20`,
                            borderColor: tag.color,
                            color: tag.color,
                          }}
                          className="border text-xs"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                      {product.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{product.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
              )}
              {isColumnVisible('tax') && (
                <TableCell className="text-sm">
                  {product.tax_rate !== null && product.tax_rate !== undefined ? (
                    <div className="flex flex-col">
                      <span className="font-medium">{product.tax_rate}%</span>
                      <span className="text-xs text-muted-foreground">
                        {product.tax_inclusive ? 'Inclusive' : 'Exclusive'}
                      </span>
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
              )}
              {isColumnVisible('actions') && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    {hasViewPermission && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onQuickView(product)}
                          title="Quick View"
                        >
                          <SparklesIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/products/${product.id}`)}
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {hasEditPermission && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(product)}
                        title="Edit Product"
                        disabled={deleting === product.id}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    )}
                    {hasCreatePermission && onDuplicate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDuplicate(product)}
                        title="Duplicate Product"
                        disabled={deleting === product.id}
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </Button>
                    )}
                    {hasViewPermission && (
                      <>
                        <BarcodeGenerateButton product={product} variant="ghost" size="sm" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewHistory(product)}
                          title="View History"
                        >
                          <ClockIcon className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {hasDeletePermission && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(product.id)}
                        disabled={deleting === product.id}
                        title="Delete Product"
                      >
                        <TrashIcon className="h-4 w-4 text-danger" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};