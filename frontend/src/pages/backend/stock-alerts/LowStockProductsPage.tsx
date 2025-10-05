/**
 * Low Stock Products Page
 * Phase 5 Sprint 4: Frontend Components
 * 
 * Displays list of products that are currently low on stock.
 * Provides quick overview of products needing attention.
 * Links to product details and stock adjustment.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { stockApi } from '@/api/stockApi';
import type { 
  LowStockProduct, 
  LowStockSummary,
  AlertSeverity 
} from '@/types/stock';
import { toast } from 'sonner';
import {
  Package,
  TrendingDown,
  AlertTriangle,
  PackageX,
  RefreshCw,
  AlertCircle,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { StockBadge } from '@/components/domain/products';

export default function LowStockProductsPage() {
  const { tenantId } = useAuth();
  const { hasPermission } = usePermissions();
  
  const canView = hasPermission('inventory.view') || hasPermission('products.view');

  // State
  const [products, setProducts] = useState<LowStockProduct[]>([]);
  const [summary, setSummary] = useState<LowStockSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [sortBy, setSortBy] = useState<'stock' | 'name' | 'reorder_point' | 'updated_at'>('stock');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const perPage = 20;

  useEffect(() => {
    if (tenantId && canView) {
      loadProducts();
    }
  }, [tenantId, canView, severityFilter, sortBy, sortOrder, currentPage]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await stockApi.getLowStockProducts(tenantId!, {
        severity: severityFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: currentPage,
        per_page: perPage,
      });

      setProducts(response.data);
      setSummary(response.summary);
      setCurrentPage(response.current_page);
      setTotalPages(response.last_page);
      setTotalItems(response.total);
    } catch (error: any) {
      console.error('Failed to load low stock products:', error);
      toast.error('Failed to load low stock products');
    } finally {
      setLoading(false);
    }
  };

  if (!canView) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You do not have permission to view low stock products.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Low Stock Products</h1>
          <p className="text-muted-foreground">
            Products that need restocking attention
          </p>
        </div>
        <Button onClick={loadProducts} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Low Stock"
          value={summary?.total || 0}
          icon={TrendingDown}
          loading={loading}
          variant="warning"
        />
        <StatCard
          title="Critical"
          value={summary?.critical || 0}
          icon={AlertTriangle}
          loading={loading}
          variant="destructive"
        />
        <StatCard
          title="Out of Stock"
          value={summary?.out_of_stock || 0}
          icon={PackageX}
          loading={loading}
          variant="destructive"
        />
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle>Products ({totalItems})</CardTitle>
              <CardDescription>
                Showing {products.length} of {totalItems} products
              </CardDescription>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={severityFilter} onValueChange={(value: any) => {
                setSeverityFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Stock Level</SelectItem>
                  <SelectItem value="name">Product Name</SelectItem>
                  <SelectItem value="reorder_point">Reorder Point</SelectItem>
                  <SelectItem value="updated_at">Last Updated</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">All stock levels healthy!</h3>
              <p className="text-muted-foreground">
                No products are currently low on stock.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Reorder Point</TableHead>
                      <TableHead className="text-right">Reorder Qty</TableHead>
                      <TableHead className="text-right">Recommended</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.thumbnail_url ? (
                              <img
                                src={product.thumbnail_url}
                                alt={product.name}
                                className="h-10 w-10 object-cover rounded border"
                              />
                            ) : (
                              <div className="h-10 w-10 flex items-center justify-center bg-muted rounded border">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {product.sku}
                        </TableCell>
                        <TableCell>
                          {product.category ? (
                            <Badge variant="secondary">{product.category.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <StockBadge
                            stock={product.stock}
                            reorderPoint={product.reorder_point}
                            status={product.stock_status}
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {product.stock}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.reorder_point}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.reorder_quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">
                            {product.recommended_order_quantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              window.open(`/backend/products/${product.id}`, '_blank');
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Statistics Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: any;
  loading: boolean;
  variant: 'default' | 'warning' | 'destructive';
}

function StatCard({ title, value, icon: Icon, loading, variant }: StatCardProps) {
  const variantClasses = {
    default: 'border-primary/20 bg-primary/5',
    warning: 'border-yellow-500/20 bg-yellow-500/5',
    destructive: 'border-destructive/20 bg-destructive/5',
  };

  const iconClasses = {
    default: 'text-primary',
    warning: 'text-yellow-600',
    destructive: 'text-destructive',
  };

  return (
    <Card className={variantClasses[variant]}>
      <CardContent className="pt-6">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold">{value}</p>
            </div>
            <Icon className={`h-8 w-8 ${iconClasses[variant]}`} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}