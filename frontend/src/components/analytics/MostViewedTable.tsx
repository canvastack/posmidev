/**
 * Most Viewed Products Table Component
 * Displays products with highest view counts
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/Badge';
import { EyeIcon, UserIcon } from '@heroicons/react/24/outline';
import type { MostViewedProduct } from '@/types/tenantAnalytics';

interface MostViewedTableProps {
  data: MostViewedProduct[];
  loading?: boolean;
  onProductClick?: (productId: string) => void;
}

export function MostViewedTable({
  data,
  loading = false,
  onProductClick,
}: MostViewedTableProps) {
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No view data available
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <EyeIcon className="w-4 h-4" />
                Total Views
              </div>
            </TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <UserIcon className="w-4 h-4" />
                Unique Viewers
              </div>
            </TableHead>
            <TableHead className="text-right">Last Viewed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((product, index) => (
            <TableRow
              key={product.product_id}
              className={onProductClick ? 'cursor-pointer hover:bg-muted/50' : ''}
              onClick={() => onProductClick?.(product.product_id)}
            >
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{product.product_name}</div>
                  {product.product_sku && (
                    <div className="text-xs text-muted-foreground">
                      SKU: {product.product_sku}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary" className="bg-accent/10 text-accent-700">
                  {formatNumber(product.total_views)}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary" className="bg-info/10 text-info-700">
                  {formatNumber(product.unique_viewers)}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {formatDate(product.last_viewed_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}