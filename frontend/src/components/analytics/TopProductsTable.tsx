/**
 * Top Products Table Component
 * Displays sortable table of top performing products
 */

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import type { TopProduct } from '@/types/tenantAnalytics';

interface TopProductsTableProps {
  data: TopProduct[];
  loading?: boolean;
  onProductClick?: (productId: string) => void;
}

type SortField = 'revenue' | 'quantity' | 'profit' | 'orders';

export function TopProductsTable({
  data,
  loading = false,
  onProductClick,
}: TopProductsTableProps) {
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(numValue);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value);
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
        No product data available
      </div>
    );
  }

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    let aValue: number, bValue: number;

    switch (sortField) {
      case 'revenue':
        aValue = parseFloat(a.total_revenue);
        bValue = parseFloat(b.total_revenue);
        break;
      case 'quantity':
        aValue = a.total_quantity;
        bValue = b.total_quantity;
        break;
      case 'profit':
        aValue = parseFloat(a.total_profit || '0');
        bValue = parseFloat(b.total_profit || '0');
        break;
      case 'orders':
        aValue = a.order_count;
        bValue = b.order_count;
        break;
      default:
        return 0;
    }

    return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ArrowUpIcon className="w-4 h-4" />
    ) : (
      <ArrowDownIcon className="w-4 h-4" />
    );
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('revenue')}
                className="cursor-pointer"
              >
                Revenue
                <SortIcon field="revenue" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('quantity')}
                className="cursor-pointer"
              >
                Qty Sold
                <SortIcon field="quantity" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('profit')}
                className="cursor-pointer"
              >
                Profit
                <SortIcon field="profit" />
              </Button>
            </TableHead>
            <TableHead className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('orders')}
                className="cursor-pointer"
              >
                Orders
                <SortIcon field="orders" />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((product, index) => (
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
              <TableCell className="text-right font-medium">
                {formatCurrency(product.total_revenue)}
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(product.total_quantity)}
              </TableCell>
              <TableCell className="text-right text-success-600">
                {formatCurrency(product.total_profit || 0)}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary">{formatNumber(product.order_count)}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}