/**
 * Cashier Performance Table Component (Phase 4A Day 4)
 * 
 * Sortable table displaying cashier performance metrics
 * Shows transactions handled, revenue generated, and average ticket
 * 
 * Design: Follows design tokens from index.css
 * Dark mode: Full support via Tailwind dark: prefix
 * Responsive: Converts to cards on mobile screens
 */

import React, { useState, useMemo } from 'react';
import type { CashierPerformance } from '@/types';
import { formatCurrency } from '@/lib/utils/currency';
import {
  UsersIcon,
  TrophyIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
} from 'lucide-react';

export interface CashierPerformanceTableProps {
  data: CashierPerformance[];
  isLoading?: boolean;
}

type SortKey = 'cashier_name' | 'transactions_handled' | 'revenue_generated' | 'average_ticket';
type SortOrder = 'asc' | 'desc';

/**
 * Cashier Performance Table
 * 
 * Displays cashier metrics with sortable columns
 */
export default function CashierPerformanceTable({
  data,
  isLoading = false,
}: CashierPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue_generated');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  /**
   * Handle column sort
   */
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  /**
   * Sorted data
   */
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (typeof aValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      }

      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [data, sortKey, sortOrder]);

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
   * Get rank badge color
   */
  const getRankBadgeColor = (index: number): string => {
    if (index === 0) return 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300';
    if (index === 1) return 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    if (index === 2) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
    return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
  };

  /**
   * Loading State
   */
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Cashier Performance
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
          <UsersIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Cashier Performance
          </h3>
        </div>
        <div className="flex items-center justify-center h-40 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <UsersIcon className="h-12 w-12 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
            <p className="text-sm">No cashier data available</p>
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
          <UsersIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Cashier Performance
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
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Rank
              </th>
              <th
                scope="col"
                onClick={() => handleSort('cashier_name')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Cashier
                  <SortIcon columnKey="cashier_name" />
                </div>
              </th>
              <th
                scope="col"
                onClick={() => handleSort('transactions_handled')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Transactions
                  <SortIcon columnKey="transactions_handled" />
                </div>
              </th>
              <th
                scope="col"
                onClick={() => handleSort('revenue_generated')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Revenue
                  <SortIcon columnKey="revenue_generated" />
                </div>
              </th>
              <th
                scope="col"
                onClick={() => handleSort('average_ticket')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Avg Ticket
                  <SortIcon columnKey="average_ticket" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedData.map((item, index) => (
              <tr
                key={item.cashier_id}
                className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getRankBadgeColor(index)}`}>
                    {index === 0 && <TrophyIcon className="h-4 w-4" />}
                    {index !== 0 && index + 1}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.cashier_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {item.transactions_handled.toLocaleString('id-ID')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-success-600 dark:text-success-400">
                  {formatCurrency(item.revenue_generated)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(item.average_ticket)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (visible on mobile only) */}
      <div className="md:hidden p-4 space-y-3">
        {sortedData.map((item, index) => (
          <div
            key={item.cashier_id}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${getRankBadgeColor(index)}`}>
                {index === 0 && <TrophyIcon className="h-4 w-4" />}
                {index !== 0 && index + 1}
              </span>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {item.cashier_name}
              </h4>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Transactions</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {item.transactions_handled}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                <p className="text-xs font-bold text-success-600 dark:text-success-400">
                  {formatCurrency(item.revenue_generated)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Avg Ticket</p>
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(item.average_ticket)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}