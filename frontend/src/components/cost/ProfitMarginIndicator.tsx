/**
 * Profit Margin Indicator Component
 * Phase 4A Day 5: Material Cost Tracking
 * 
 * Displays profit margin percentage with color-coded badges:
 * - >= 50%: Green (High profit)
 * - 30-49%: Yellow (Medium profit)
 * - < 30%: Red (Low profit)
 * 
 * Design:
 * - Uses design tokens from index.css
 * - Fully supports dark/light mode
 * - Three sizes: sm, md, lg
 */

import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface ProfitMarginIndicatorProps {
  margin: number; // Percentage (0-100)
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function ProfitMarginIndicator({
  margin,
  size = 'md',
  showIcon = true,
}: ProfitMarginIndicatorProps) {
  // Determine color class based on margin
  const getColorClass = () => {
    if (margin >= 50) {
      return 'bg-success-500/10 text-success-600 dark:bg-success-500/20 dark:text-success-400';
    }
    if (margin >= 30) {
      return 'bg-warning-500/10 text-warning-600 dark:bg-warning-500/20 dark:text-warning-400';
    }
    return 'bg-error-500/10 text-error-600 dark:bg-error-500/20 dark:text-error-400';
  };

  // Determine size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  // Determine icon and label
  const getIconAndLabel = () => {
    if (margin >= 50) {
      return { icon: TrendingUp, label: 'High' };
    }
    if (margin >= 30) {
      return { icon: TrendingDown, label: 'Medium' };
    }
    return { icon: AlertTriangle, label: 'Low' };
  };

  const { icon: Icon, label } = getIconAndLabel();

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full font-semibold
        transition-colors duration-200
        ${getColorClass()}
        ${sizeClasses[size]}
      `}
      title={`Profit Margin: ${margin.toFixed(2)}% (${label})`}
    >
      {showIcon && <Icon className={iconSizeClasses[size]} />}
      <span>{margin.toFixed(1)}%</span>
      {size !== 'sm' && <span className="opacity-70">{label}</span>}
    </div>
  );
}