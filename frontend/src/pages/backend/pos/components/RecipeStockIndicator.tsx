/**
 * RecipeStockIndicator Component
 * 
 * Mini visual indicator for recipe stock levels on product cards.
 * Shows a colored dot with tooltip indicating stock status.
 * 
 * Phase 3b: BOM Integration
 */

import React from 'react';

interface RecipeStockIndicatorProps {
  maxServings: number;
  threshold?: number; // Low stock threshold (default: 10)
  size?: 'sm' | 'md' | 'lg';
}

export const RecipeStockIndicator: React.FC<RecipeStockIndicatorProps> = ({ 
  maxServings, 
  threshold = 10,
  size = 'sm'
}) => {
  const getStockLevel = (): 'out' | 'low' | 'moderate' | 'plenty' => {
    if (maxServings === 0) return 'out';
    if (maxServings < threshold) return 'low';
    if (maxServings < threshold * 5) return 'moderate';
    return 'plenty';
  };

  const level = getStockLevel();

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const colors = {
    out: 'bg-muted-foreground/40',
    low: 'bg-danger-500',
    moderate: 'bg-warning-500',
    plenty: 'bg-success-500',
  };

  const labels = {
    out: 'Out of materials',
    low: `Low stock (${maxServings} servings)`,
    moderate: `Moderate stock (${maxServings} servings)`,
    plenty: `Plenty stock (${maxServings} servings)`,
  };

  return (
    <div 
      className={`rounded-full ${sizeClasses[size]} ${colors[level]} ring-2 ring-background shadow-sm`}
      title={labels[level]}
      aria-label={labels[level]}
    />
  );
};