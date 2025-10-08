/**
 * VariantPerformanceTable Component
 * 
 * Table displaying top performing variants with metrics like revenue, quantity sold, and stock.
 * Provides quick insights into which variants are driving sales.
 * 
 * Features:
 * - Sortable columns
 * - Color-coded stock levels (low=red, medium=yellow, high=green)
 * - Revenue bar visualization
 * - Empty state handling
 * - Responsive design
 * - Dark mode support
 * 
 * @example
 * ```tsx
 * <VariantPerformanceTable
 *   data={variantPerformance}
 *   loading={loading}
 * />
 * ```
 */

import React, { useState, useMemo } from 'react';
import { 
  ArrowUpIcon, 
  ArrowDownIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import type { VariantPerformance } from '../../../types/analytics';

interface VariantPerformanceTableProps {
  data: VariantPerformance[];
  loading?: boolean;
}

type SortKey = 'variant_name' | 'total_sold' | 'revenue' | 'stock_remaining';
type SortDirection = 'asc' | 'desc';

export const VariantPerformanceTable: React.FC<VariantPerformanceTableProps> = ({
  data,
  loading = false,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  
  /**
   * Handle column sort
   */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      // Toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort key with desc as default
      setSortKey(key);
      setSortDirection('desc');
    }
  };
  
  /**
   * Sort data
   */
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const sorted = [...data].sort((a, b) => {
      let aValue: any = a[sortKey];
      let bValue: any = b[sortKey];
      
      // Handle string comparison
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    return sorted;
  }, [data, sortKey, sortDirection]);
  
  /**
   * Get max revenue for bar chart width calculation
   */
  const maxRevenue = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return Math.max(...data.map(v => v.revenue));
  }, [data]);
  
  /**
   * Format currency
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  /**
   * Format number
   */
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('id-ID').format(value);
  };
  
  /**
   * Get stock level color
   */
  const getStockColor = (stock: number): string => {
    if (stock === 0) return 'text-danger-600 dark:text-danger-400 font-semibold';
    if (stock <= 10) return 'text-warning-600 dark:text-warning-400';
    return 'text-success-600 dark:text-success-400';
  };
  
  /**
   * Render sort icon
   */
  const SortIcon: React.FC<{ column: SortKey }> = ({ column }) => {
    if (sortKey !== column) {
      return <div className="w-4 h-4" />; // Empty space
    }
    
    return sortDirection === 'asc' ? (
      <ArrowUpIcon className="w-4 h-4" />
    ) : (
      <ArrowDownIcon className="w-4 h-4" />
    );
  };
  
  /**
   * Loading state
   */
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-sm font-semibold">Variant</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Sold</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Revenue</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Stock</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, index) => (
              <tr key={index} className="border-b border-gray-100 dark:border-gray-800 animate-pulse">
                <td className="px-4 py-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto"></div>
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 ml-auto"></div>
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  
  /**
   * Empty state
   */
  if (!sortedData || sortedData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        <ChartBarIcon className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-sm font-medium">No variant data available</p>
        <p className="text-xs mt-1">Variant performance will appear here once sales are recorded</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th
              className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={() => handleSort('variant_name')}
            >
              <div className="flex items-center gap-2">
                <span>Variant</span>
                <SortIcon column="variant_name" />
              </div>
            </th>
            <th
              className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={() => handleSort('total_sold')}
            >
              <div className="flex items-center justify-end gap-2">
                <span>Sold</span>
                <SortIcon column="total_sold" />
              </div>
            </th>
            <th
              className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={() => handleSort('revenue')}
            >
              <div className="flex items-center justify-end gap-2">
                <span>Revenue</span>
                <SortIcon column="revenue" />
              </div>
            </th>
            <th
              className="px-4 py-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              onClick={() => handleSort('stock_remaining')}
            >
              <div className="flex items-center justify-end gap-2">
                <span>Stock</span>
                <SortIcon column="stock_remaining" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((variant, index) => (
            <tr
              key={variant.variant_id}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td className="px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {variant.variant_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {variant.variant_sku}
                  </p>
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatNumber(variant.total_sold)}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-3">
                  {/* Revenue bar */}
                  <div className="flex-1 max-w-[100px] h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-300"
                      style={{ width: `${(variant.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[80px] text-right">
                    {formatCurrency(variant.revenue)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <span className={`text-sm font-medium ${getStockColor(variant.stock_remaining)}`}>
                  {formatNumber(variant.stock_remaining)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VariantPerformanceTable;