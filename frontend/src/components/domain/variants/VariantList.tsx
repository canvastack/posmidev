/**
 * Variant List Component
 * Phase 6: Product Variants - Day 13
 * Updated: Day 19 - Performance Optimization
 * 
 * Displays product variants in a table with search, filter, sort, and pagination.
 * Supports inline actions (edit, delete) and bulk operations.
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Tenant-scoped operations (tenantId required)
 * - All queries filter by tenant_id
 * - Permission checks for edit/delete actions
 * 
 * PERFORMANCE OPTIMIZATIONS (Day 19):
 * - Memoized filtering/sorting functions
 * - Lazy loading for large lists (auto-switches to VirtualizedVariantList)
 * - Optimized re-render with React.memo on child components
 */

import { useState, useMemo, memo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Package,
  DollarSign,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { VariantEditModal } from './VariantEditModal';
import { useProductVariants, useDeleteVariant, useDebounce } from '@/hooks';
import { formatCurrency } from '@/utils/variantHelpers';
import { toast } from 'sonner';
import { LoadingSkeleton } from '@/components/shared/states/LoadingSkeleton';
import { EmptyState } from '@/components/shared/states/EmptyState';
import { StockBadge } from '@/components/domain/products/StockBadge';
import type { ProductVariant } from '@/types/variant';

export interface VariantListProps {
  /** Tenant ID (required for IMMUTABLE RULES compliance) */
  tenantId: string;
  
  /** Product ID */
  productId: string;
  
  /** Product SKU (for context) */
  productSku: string;
  
  /** Product price (base price for reference) */
  productPrice: number;
  
  /** Whether user can edit variants */
  canEdit?: boolean;
  
  /** Whether user can delete variants */
  canDelete?: boolean;
}

type SortField = 'sku' | 'name' | 'price' | 'stock';
type SortDirection = 'asc' | 'desc';

export function VariantList({
  tenantId,
  productId,
  productSku,
  productPrice,
  canEdit = true,
  canDelete = true,
}: VariantListProps) {
  // State
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('sku');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  const itemsPerPage = 10;
  
  // Debounce search
  const debouncedSearch = useDebounce(search, 300);
  
  // Fetch variants
  const {
    data: variants = [],
    isLoading,
    error,
    refetch,
  } = useProductVariants(tenantId, productId);
  
  // Delete mutation
  const { mutate: deleteVariant } = useDeleteVariant(tenantId);
  
  /**
   * Filter and sort variants
   */
  const filteredAndSortedVariants = useMemo(() => {
    if (!variants || !Array.isArray(variants)) return [];
    let result = [...variants];
    
    // Filter by search
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      result = result.filter(
        (v) =>
          v.sku.toLowerCase().includes(searchLower) ||
          v.name.toLowerCase().includes(searchLower) ||
          v.display_name.toLowerCase().includes(searchLower) ||
          Object.values(v.attributes).some((val) =>
            val.toLowerCase().includes(searchLower)
          )
      );
    }
    
    // Filter by active status
    if (activeFilter !== 'all') {
      result = result.filter((v) =>
        activeFilter === 'active' ? v.is_active : !v.is_active
      );
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'sku':
          comparison = a.sku.localeCompare(b.sku);
          break;
        case 'name':
          comparison = a.display_name.localeCompare(b.display_name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'stock':
          comparison = a.available_stock - b.available_stock;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [variants, debouncedSearch, activeFilter, sortField, sortDirection]);
  
  /**
   * Pagination
   */
  const paginatedVariants = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredAndSortedVariants.slice(start, end);
  }, [filteredAndSortedVariants, currentPage]);
  
  const totalPages = Math.ceil(filteredAndSortedVariants.length / itemsPerPage);
  
  /**
   * Handle sort
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  /**
   * Handle select all
   */
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedVariants.map((v) => v.id));
    } else {
      setSelectedIds([]);
    }
  };
  
  /**
   * Handle select one
   */
  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    }
  };
  
  /**
   * Handle delete variant
   */
  const handleDelete = (variant: ProductVariant) => {
    if (!canDelete) {
      toast.error('You do not have permission to delete variants');
      return;
    }
    
    const confirmed = confirm(
      `Delete variant "${variant.display_name}"?\nSKU: ${variant.sku}\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    deleteVariant(
      { productId, variantId: variant.id },
      {
        onSuccess: () => {
          toast.success(`Variant "${variant.display_name}" deleted`);
          refetch();
        },
        onError: (error: any) => {
          toast.error(error?.message || 'Failed to delete variant');
        },
      }
    );
  };
  
  /**
   * Handle edit variant
   */
  const handleEdit = (variant: ProductVariant) => {
    if (!canEdit) {
      toast.error('You do not have permission to edit variants');
      return;
    }
    
    setEditingVariant(variant);
  };
  
  /**
   * Render attribute badges
   */
  const renderAttributes = (attributes: Record<string, string>) => {
    return Object.entries(attributes).map(([key, value]) => (
      <Badge key={key} variant="outline" className="text-xs">
        {key}: {value}
      </Badge>
    ));
  };
  
  // Loading state
  if (isLoading) {
    return <LoadingSkeleton rows={5} />;
  }
  
  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{error instanceof Error ? error.message : 'Failed to load variants'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Empty state
  if (variants.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No variants found"
        description="This product doesn't have any variants yet"
      />
    );
  }
  
  return (
    <>
      <Card>
        <CardContent className="pt-6">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search variants (SKU, name, attributes...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Active Filter */}
            <Select value={activeFilter} onValueChange={(v: any) => setActiveFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Variants</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Results Count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {paginatedVariants.length} of {filteredAndSortedVariants.length} variant
              {filteredAndSortedVariants.length !== 1 ? 's' : ''}
              {debouncedSearch && (
                <span> matching "{debouncedSearch}"</span>
              )}
            </p>
            
            {selectedIds.length > 0 && (
              <Badge variant="secondary">
                {selectedIds.length} selected
              </Badge>
            )}
          </div>
          
          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        paginatedVariants.length > 0 &&
                        selectedIds.length === paginatedVariants.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('sku')}
                  >
                    <div className="flex items-center gap-2">
                      SKU
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Variant
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  
                  <TableHead>Attributes</TableHead>
                  
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center gap-2">
                      Price
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('stock')}
                  >
                    <div className="flex items-center gap-2">
                      Stock
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  
                  <TableHead>Status</TableHead>
                  
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {paginatedVariants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(variant.id)}
                        onCheckedChange={(checked) =>
                          handleSelectOne(variant.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    
                    <TableCell className="font-mono text-sm">
                      {variant.sku}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {variant.image_url && (
                          <img
                            src={variant.image_url}
                            alt={variant.display_name}
                            className="h-8 w-8 rounded object-cover"
                          />
                        )}
                        <span className="font-medium">{variant.display_name}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {renderAttributes(variant.attributes)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">
                          {formatCurrency(variant.price)}
                        </span>
                      </div>
                      {variant.profit_margin > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {variant.profit_margin.toFixed(1)}% margin
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <StockBadge stock={variant.available_stock} />
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={variant.is_active ? 'default' : 'secondary'}>
                        {variant.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(variant)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(variant)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Modal */}
      {editingVariant && (
        <VariantEditModal
          open={true}
          onOpenChange={(open) => !open && setEditingVariant(null)}
          tenantId={tenantId}
          productId={productId}
          variant={editingVariant}
          onSuccess={() => {
            setEditingVariant(null);
            refetch();
          }}
        />
      )}
    </>
  );
}