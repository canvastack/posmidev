/**
 * MaterialStockWarning Component
 * 
 * Warning dialog displayed when attempting to add a product to cart
 * but insufficient materials are available to fulfill the recipe.
 * 
 * Provides options to:
 * - Cancel the order
 * - Continue anyway (requires permission override)
 * 
 * Phase 3b: BOM Integration
 */

import React from 'react';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';
import type { Product } from '@/types';

interface InsufficientMaterial {
  material_id: string;
  material_name: string;
  needed: number;
  available: number;
  unit: string;
  shortfall: number;
}

interface MaterialStockWarningProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  quantityRequested: number;
  insufficientMaterials: InsufficientMaterial[];
  onContinue: () => void;
  canOverride?: boolean; // Permission check for override
}

export const MaterialStockWarning: React.FC<MaterialStockWarningProps> = ({
  isOpen,
  onClose,
  product,
  quantityRequested,
  insufficientMaterials,
  onContinue,
  canOverride = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-warning-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning-500/10 text-warning-600 dark:text-warning-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-warning-600 dark:text-warning-400">
                Material Warning
              </h2>
              <p className="text-sm text-muted-foreground">Insufficient materials detected</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning Message */}
          <div className="p-4 rounded-lg bg-warning-500/10 border border-warning-500/30 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-warning-600 dark:text-warning-400">
                Cannot fulfill order
              </p>
              <p className="text-sm text-warning-600/80 dark:text-warning-400/80 mt-1">
                Not enough materials to make <strong>{quantityRequested} × {product.name}</strong>
              </p>
            </div>
          </div>

          {/* Missing Materials List */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-danger-600 dark:text-danger-400" />
              Missing Materials
            </h4>
            <div className="space-y-2">
              {insufficientMaterials.map((material) => (
                <div 
                  key={material.material_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-danger-500/5 border border-danger-500/20"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{material.material_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Short by {material.shortfall.toFixed(2)} {material.unit}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold text-danger-600 dark:text-danger-400">
                      {material.available} / {material.needed} {material.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ({((material.available / material.needed) * 100).toFixed(0)}% available)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="p-4 rounded-lg bg-info-500/10 border border-info-500/30">
            <p className="text-sm font-medium text-info-600 dark:text-info-400 mb-2">
              💡 Recommendations
            </p>
            <ul className="text-sm text-info-600/80 dark:text-info-400/80 space-y-1">
              <li>• Restock materials before accepting this order</li>
              <li>• Reduce quantity to match available materials</li>
              <li>• Check with kitchen for alternative recipes</li>
            </ul>
          </div>
        </div>

        {/* Footer - Actions */}
        <div className="p-6 border-t bg-muted/20 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors font-medium"
          >
            Cancel Order
          </button>
          {canOverride && (
            <button
              onClick={() => {
                onContinue();
                onClose();
              }}
              className="flex-1 px-4 py-2.5 rounded-lg bg-danger-600 text-white hover:bg-danger-700 transition-colors font-medium"
              title="Requires override permission"
            >
              Continue Anyway
            </button>
          )}
        </div>

        {!canOverride && (
          <div className="px-6 pb-6">
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ Override permission required to proceed with insufficient materials
            </p>
          </div>
        )}
      </div>
    </div>
  );
};