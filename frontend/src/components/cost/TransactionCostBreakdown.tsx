/**
 * Transaction Cost Breakdown Component
 * Phase 4A Day 5: Material Cost Tracking
 * 
 * Displays detailed cost breakdown for a product including:
 * - Material components with quantities
 * - Individual material costs
 * - Total material cost
 * - Selling price and profit calculation
 * 
 * Design:
 * - Expandable/collapsible details
 * - Clean table layout
 * - Dark mode compatible
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Package } from 'lucide-react';
import type { ProductCostAnalysis } from '@/types';
import { ProfitMarginIndicator } from './ProfitMarginIndicator';
import { CostAlertBadge } from './CostAlertBadge';

interface TransactionCostBreakdownProps {
  analysis: ProductCostAnalysis;
  currency?: string;
}

export function TransactionCostBreakdown({
  analysis,
  currency = 'Rp',
}: TransactionCostBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  if (!analysis.has_recipe || analysis.material_breakdown.length === 0) {
    return null;
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {analysis.product_name}
          </span>
          {analysis.quantity > 1 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              (x{analysis.quantity})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ProfitMarginIndicator margin={analysis.profit_margin} size="sm" />
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-200 dark:border-gray-700">
          {/* Alert */}
          {analysis.alert && (
            <div className="pt-3">
              <CostAlertBadge alert={analysis.alert} size="sm" />
            </div>
          )}

          {/* Material Breakdown Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 font-medium">Material</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium text-right">Waste</th>
                  <th className="pb-2 font-medium text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {analysis.material_breakdown.map((material) => (
                  <tr key={material.material_id} className="text-gray-700 dark:text-gray-300">
                    <td className="py-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{material.material_name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          @ {formatCurrency(material.unit_cost)}/{material.unit}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <span className="font-mono">
                        {material.effective_quantity.toFixed(2)} {material.unit}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {material.waste_percentage > 0 ? `+${material.waste_percentage.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                    <td className="py-2 text-right font-semibold">
                      {formatCurrency(material.component_cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="pt-2 space-y-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Material Cost</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(analysis.total_material_cost)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Selling Price</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(analysis.total_selling_price)}
              </span>
            </div>

            <div className="flex justify-between text-base pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-gray-900 dark:text-gray-100">Profit</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-success-600 dark:text-success-400">
                  {formatCurrency(analysis.profit_amount)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({analysis.profit_margin.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}