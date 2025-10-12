/**
 * RecipeBadge Component
 * 
 * Displays a recipe indicator badge on product cards showing:
 * - Whether product has a recipe
 * - Maximum servings available based on material stock
 * - Color-coded stock level (plenty/moderate/low/out)
 * 
 * Phase 3b: BOM Integration
 */

import React from 'react';
import { ChefHat } from 'lucide-react';

interface RecipeBadgeProps {
  hasRecipe: boolean;
  maxServings?: number;
  isLowStock?: boolean;
}

export const RecipeBadge: React.FC<RecipeBadgeProps> = ({ 
  hasRecipe, 
  maxServings, 
  isLowStock 
}) => {
  if (!hasRecipe) return null;

  const getStockLevel = (): 'out' | 'low' | 'moderate' | 'plenty' => {
    if (maxServings === undefined || maxServings === null) return 'moderate';
    if (maxServings === 0) return 'out';
    if (maxServings < 10) return 'low';
    if (maxServings < 50) return 'moderate';
    return 'plenty';
  };

  const level = getStockLevel();

  const colors = {
    out: 'bg-muted text-muted-foreground border-muted-foreground/30',
    low: 'bg-danger-500/10 text-danger-600 dark:text-danger-400 border-danger-500/30',
    moderate: 'bg-warning-500/10 text-warning-600 dark:text-warning-400 border-warning-500/30',
    plenty: 'bg-success-500/10 text-success-600 dark:text-success-400 border-success-500/30',
  };

  const icons = {
    out: '⚫',
    low: '🔴',
    moderate: '🟡',
    plenty: '🟢',
  };

  const labels = {
    out: 'Out',
    low: 'Low',
    moderate: 'Available',
    plenty: 'Plenty',
  };

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${colors[level]} transition-colors`}
      title={`Recipe-based product: ${maxServings ?? '?'} servings available`}
    >
      <ChefHat className="h-3 w-3" />
      <span className="hidden sm:inline">{icons[level]}</span>
      <span>{maxServings ?? '?'}</span>
      <span className="hidden md:inline">{labels[level]}</span>
    </div>
  );
};