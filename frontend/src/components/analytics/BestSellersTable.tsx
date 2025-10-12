/**
 * Best Sellers Table Component (Phase 4A Day 4)
 * 
 * Sortable table displaying top-selling products
 * Supports sorting by revenue, quantity, or rank
 * 
 * Design: Follows design tokens from index.css
 * Dark mode: Full support via Tailwind dark: prefix
 * Responsive: Converts to cards on mobile screens
 */

import React, { useState, useMemo } from 'react';
import type { BestSeller } from '@/types';
import { formatCurrency } from '@/lib/utils/currency';
import {
  TrendingUpIcon,
  PackageIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
} from 'lucide-react';

export interface BestSellersTableProps {
  data: BestSeller[];
  isLoading?: boolean;
  limit?: number;
}

type SortKey = 'rank' | 'product_name' | 'units_sold' | 'revenue';
type SortOrder = 'asc' | 'desc';

/**
 * Best Sellers Table
 * 
 * Displays top-selling products with sortable columns
 */
export default function BestSellersTable({
  data,
  isLoading = false,
  limit = 10,
}: BestSellersTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  /**
   * Handle column sort
   */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  /**
   * Sorted data
   */
  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aValue: number | string = a[sortKey];
      let bValue: number | string = b[sortKey];

      if (typeof aValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      }

      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });

    return sorted.slice(0, limit);
  }, [data, sortKey, sortOrder, limit]);

  /**
   * Sort Icon Component
   */
  const SortIcon: React.FC<{ columnKey: SortKey }> = ({ columnKey }) => {
    if (sortKey !== columnKey) {
      return <MinusIcon className="h-3 w-3 text-gray-400" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUpIcon className="h-3 w-3 text-primary-600 dark:text-primary-400" />
    ) : (
      <ArrowDownIcon className="h-3 w-3 text-primary-600 dark:text-primary-400" />
    );
  };

  /**
   * Loading State
   */
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUpIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Best Selling Products
            </h3>
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-900 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /**
   * Empty State
   */
  if (sortedData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUpIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Best Selling Products
          </h3>
        </div>
        <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <PackageIcon className="h-12 w-12 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
            <p className="text-sm">No sales data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <TrendingUpIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Best Selling Products
          </h3>
        </div>
      </div>

      {/* Desktop Table View (hidden on mobile) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th
                scope="col"
                onClick={() => handleSort('rank')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Rank
                  <SortIcon columnKey="rank" />
                </div>
              </th>
              <th
                scope="col"
                onClick={() => handleSort('product_name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Product
                  <SortIcon columnKey="product_name" />
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Category
              </th>
              <th
                scope="col"
                onClick={() => handleSort('units_sold')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Units Sold
                  <SortIcon columnKey="units_sold" />
                </div>
              </th>
              <th
                scope="col"
                onClick={() => handleSort('revenue')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Revenue
                  <SortIcon columnKey="revenue" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedData.map((item) => (
              <tr
                key={item.product_id}
                className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-bold">
                    {item.rank}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.product_name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    SKU: {item.sku}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {item.units_sold.toLocaleString('id-ID')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-success-600 dark:text-success-400">
                  {formatCurrency(item.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (visible on mobile only) */}
      <div className="md:hidden p-4 space-y-3">
        {sortedData.map((item) => (
          <div
            key={item.product_id}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold">
                    {item.rank}
                  </span>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {item.product_name}
                  </h4>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {item.sku}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {item.category}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Units Sold</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {item.units_sold.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                <p className="text-sm font-bold text-success-600 dark:text-success-400">
                  {formatCurrency(item.revenue)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}