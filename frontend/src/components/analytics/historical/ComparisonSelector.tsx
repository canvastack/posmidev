/**
 * Comparison Selector Component
 * 
 * Phase 4A+: Historical Comparison
 * Allows users to select a comparison period (vs Yesterday, vs Last Week, etc.)
 * 
 * Design: Uses design tokens from frontend/src/index.css
 * Compliance: Dark mode support, responsive, no hardcoded colors
 */

import React from 'react';
import type { ComparisonPeriod } from '../../../types/analytics';

interface ComparisonSelectorProps {
  value: ComparisonPeriod;
  onChange: (period: ComparisonPeriod) => void;
  disabled?: boolean;
}

export function ComparisonSelector({ value, onChange, disabled }: ComparisonSelectorProps) {
  const options: Array<{ value: ComparisonPeriod; label: string }> = [
    { value: null, label: 'No Comparison' },
    { value: 'previous_day', label: 'vs Yesterday' },
    { value: 'previous_week', label: 'vs Last Week' },
    { value: 'previous_month', label: 'vs Last Month' },
    { value: 'previous_year', label: 'vs Last Year' },
  ];

  return (
    <div className="flex items-center gap-2">
      <label 
        htmlFor="comparison-selector" 
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Compare:
      </label>
      <select
        id="comparison-selector"
        value={value ?? 'none'}
        onChange={(e) => onChange(e.target.value === 'none' ? null : e.target.value as ComparisonPeriod)}
        disabled={disabled}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {options.map((option) => (
          <option key={option.value ?? 'none'} value={option.value ?? 'none'}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}