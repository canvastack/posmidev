/**
 * MetricCard Component
 * 
 * Reusable card component for displaying single metric values with optional trend indicators.
 * Supports different formats (currency, number, percentage) and visual trend indicators.
 * 
 * Features:
 * - Multiple format types (currency, number, percentage)
 * - Optional trend indicator (up/down/neutral)
 * - Optional change percentage
 * - Icon support
 * - Glassmorphism design
 * - Dark mode support
 * 
 * @example
 * ```tsx
 * <MetricCard
 *   title="Total Revenue"
 *   value={12500.50}
 *   format="currency"
 *   change={15.5}
 *   trend="up"
 *   icon={CurrencyDollarIcon}
 * />
 * ```
 */

import React from 'react';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  MinusIcon 
} from '@heroicons/react/24/solid';

interface MetricCardProps {
  title: string;
  value: number | string;
  format: 'currency' | 'number' | 'percentage';
  change?: number; // Percentage change from previous period
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  subtitle?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  format,
  change,
  trend,
  icon: Icon,
  loading = false,
  subtitle,
}) => {
  /**
   * Format value based on type
   */
  const formatValue = (): string => {
    if (typeof value === 'string') {
      return value;
    }
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
        
      case 'percentage':
        return `${value.toFixed(2)}%`;
        
      case 'number':
      default:
        return new Intl.NumberFormat('id-ID').format(value);
    }
  };
  
  /**
   * Get trend color classes
   */
  const getTrendColor = (): string => {
    if (!trend) return '';
    
    switch (trend) {
      case 'up':
        return 'text-success-600 dark:text-success-400';
      case 'down':
        return 'text-danger-600 dark:text-danger-400';
      case 'neutral':
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };
  
  /**
   * Get trend icon
   */
  const TrendIcon = (): React.ReactElement | null => {
    if (!trend) return null;
    
    switch (trend) {
      case 'up':
        return <ArrowUpIcon className="w-4 h-4" />;
      case 'down':
        return <ArrowDownIcon className="w-4 h-4" />;
      case 'neutral':
      default:
        return <MinusIcon className="w-4 h-4" />;
    }
  };
  
  if (loading) {
    return (
      <div className="glass-card p-6 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-32 mb-2"></div>
            {subtitle && <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-20"></div>}
          </div>
          {Icon && (
            <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="glass-card p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          
          {/* Value */}
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {formatValue()}
          </p>
          
          {/* Change & Trend */}
          {(change !== undefined || subtitle) && (
            <div className="flex items-center gap-2">
              {change !== undefined && trend && (
                <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
                  <TrendIcon />
                  <span>{Math.abs(change).toFixed(1)}%</span>
                </div>
              )}
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {subtitle}
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Icon */}
        {Icon && (
          <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;