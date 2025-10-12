/**
 * Sales Overview Card Component (Phase 4A Day 4)
 * 
 * Reusable metric card with icon, value, trend indicator
 * Used in Analytics Dashboard for displaying key metrics
 * 
 * Design: Follows design tokens from index.css
 * Dark mode: Full support via Tailwind dark: prefix
 * Responsive: Adapts to screen size
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface SalesOverviewCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBgColor?: string; // Tailwind class (e.g., 'bg-success-100 dark:bg-success-900/30')
  iconColor?: string; // Tailwind class (e.g., 'text-success-600 dark:text-success-400')
  trend?: {
    value: number; // Percentage change (e.g., 15 for +15%)
    isPositive: boolean;
  };
  subtitle?: string;
  isLoading?: boolean;
}

/**
 * Sales Overview Card
 * 
 * Displays a single metric with icon, value, and optional trend indicator
 */
export default function SalesOverviewCard({
  title,
  value,
  icon: Icon,
  iconBgColor = 'bg-primary-100 dark:bg-primary-900/30',
  iconColor = 'text-primary-600 dark:text-primary-400',
  trend,
  subtitle,
  isLoading = false,
}: SalesOverviewCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-lg">
      <div className="flex items-center justify-between">
        {/* Left: Text Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            {title}
          </p>

          {/* Value */}
          {isLoading ? (
            <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
          ) : (
            <p className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 truncate">
              {value}
            </p>
          )}

          {/* Trend Indicator */}
          {trend && !isLoading && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={`text-sm font-semibold ${
                  trend.isPositive
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-danger-600 dark:text-danger-400'
                }`}
              >
                {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-500">
                vs yesterday
              </span>
            </div>
          )}

          {/* Subtitle */}
          {subtitle && !isLoading && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 truncate">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right: Icon */}
        <div className={`p-3 rounded-full ${iconBgColor} flex-shrink-0`}>
          {isLoading ? (
            <div className="h-6 w-6 bg-gray-300 dark:bg-gray-600 animate-pulse rounded" />
          ) : (
            <Icon className={`h-6 w-6 ${iconColor}`} aria-hidden="true" />
          )}
        </div>
      </div>
    </div>
  );
}