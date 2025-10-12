/**
 * Cost Alert Badge Component
 * Phase 4A Day 5: Material Cost Tracking
 * 
 * Displays alert badges for low profit margins or cost issues.
 * Shows warning (< 30% margin) or error (< 20% margin) messages.
 * 
 * Design:
 * - Uses design tokens from index.css
 * - Animated entrance with pulse effect
 * - Fully supports dark/light mode
 */

import { AlertTriangle, AlertCircle } from 'lucide-react';
import type { CostAlert } from '@/types';

interface CostAlertBadgeProps {
  alert: CostAlert | null;
  size?: 'sm' | 'md';
}

export function CostAlertBadge({ alert, size = 'md' }: CostAlertBadgeProps) {
  if (!alert) return null;

  const isError = alert.type === 'error';
  const Icon = isError ? AlertCircle : AlertTriangle;

  const colorClasses = isError
    ? 'bg-error-500/10 text-error-600 border-error-500/20 dark:bg-error-500/20 dark:text-error-400 dark:border-error-500/30'
    : 'bg-warning-500/10 text-warning-600 border-warning-500/20 dark:bg-warning-500/20 dark:text-warning-400 dark:border-warning-500/30';

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
  };

  return (
    <div
      className={`
        inline-flex items-center gap-2 rounded-md border font-medium
        animate-slideIn
        ${colorClasses}
        ${sizeClasses[size]}
      `}
      role="alert"
    >
      <Icon className={`${iconSizeClasses[size]} flex-shrink-0`} />
      <span>{alert.message}</span>
    </div>
  );
}