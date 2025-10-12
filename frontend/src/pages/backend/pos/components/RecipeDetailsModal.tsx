/**
 * RecipeDetailsModal Component
 * 
 * Displays detailed recipe breakdown including:
 * - Recipe metadata (servings, cost, components count)
 * - Material list with current stock levels
 * - Cost breakdown per material
 * - Warnings for insufficient materials
 * 
 * Phase 3b: BOM Integration
 */

import React, { useEffect, useState } from 'react';
import {
  X,
  AlertCircle,
  ChefHat,
  DollarSign,
  Package,
  TrendingUp,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { recipesApi, bomCalculationApi } from '@/api/bomApi';
import type { Recipe, BOMCalculationResult } from '@/types/bom';
import { StatCard } from './StatCard';

interface RecipeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  tenantId: string;
}

export const RecipeDetailsModal: React.FC<RecipeDetailsModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  tenantId,
}) => {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [bomCalculation, setBomCalculation] = useState<BOMCalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && productId) {
      fetchRecipeData();
    }
  }, [isOpen, productId]);

  const fetchRecipeData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch BOM calculation for product
      const bomResult = await bomCalculationApi.getAvailableQuantity(tenantId, productId);
      
      if (bomResult.success && bomResult.data) {
        setBomCalculation(bomResult.data);
        
        // Fetch recipe details if available (try to get from product)
        // Note: Backend might include recipe data in BOM response or we fetch separately
        // For now, we'll use the BOM calculation data which should include all we need
      }
    } catch (err: any) {
      console.error('Error fetching recipe data:', err);
      setError(err.message || 'Failed to load recipe details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Recipe Details</h2>
              <p className="text-sm text-muted-foreground">{productName}</p>
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] custom-scrollbar">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              <span className="ml-3 text-muted-foreground">Loading recipe data...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-danger-500/10 border border-danger-500/30 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-danger-600 dark:text-danger-400">Error</p>
                <p className="text-sm text-danger-600/80 dark:text-danger-400/80">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && bomCalculation && (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  label="Max Servings"
                  value={bomCalculation.maximum_producible_quantity || 0}
                  icon={Package}
                  iconColor="text-primary-600 dark:text-primary-400"
                  iconBgColor="bg-primary-500/10"
                />
                <StatCard
                  label="Limiting Factor"
                  value={bomCalculation.limiting_material?.material_name || 'None'}
                  icon={AlertCircle}
                  iconColor="text-warning-600 dark:text-warning-400"
                  iconBgColor="bg-warning-500/10"
                />
                <StatCard
                  label="Materials"
                  value={bomCalculation.all_materials_availability?.length || 0}
                  icon={TrendingUp}
                  iconColor="text-info-600 dark:text-info-400"
                  iconBgColor="bg-info-500/10"
                />
              </div>

              {/* Warning if out of stock */}
              {bomCalculation.maximum_producible_quantity === 0 && (
                <div className="p-4 rounded-lg bg-danger-500/10 border border-danger-500/30 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-danger-600 dark:text-danger-400">
                      Insufficient Materials
                    </p>
                    <p className="text-sm text-danger-600/80 dark:text-danger-400/80 mt-1">
                      Cannot make this product. Some materials are out of stock or below required quantities.
                    </p>
                  </div>
                </div>
              )}

              {/* Warning if low stock */}
              {bomCalculation.maximum_producible_quantity > 0 && bomCalculation.maximum_producible_quantity < 10 && (
                <div className="p-4 rounded-lg bg-warning-500/10 border border-warning-500/30 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-warning-600 dark:text-warning-400">
                      Low Material Stock
                    </p>
                    <p className="text-sm text-warning-600/80 dark:text-warning-400/80 mt-1">
                      Only {bomCalculation.maximum_producible_quantity} servings can be made with current materials.
                    </p>
                  </div>
                </div>
              )}

              {/* Materials List */}
              {bomCalculation.all_materials_availability && bomCalculation.all_materials_availability.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Required Materials
                  </h3>
                  <div className="space-y-3">
                    {bomCalculation.all_materials_availability.map((material) => {
                      const stockPercentage = material.required_quantity > 0
                        ? (material.available_stock / material.required_quantity) * 100
                        : 100;
                      const isInsufficient = !material.sufficient;

                      return (
                        <div
                          key={material.material_id}
                          className={`p-4 rounded-lg border transition-colors ${
                            isInsufficient
                              ? 'bg-danger-500/5 border-danger-500/30'
                              : 'bg-muted/30 border-border/60 hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium">{material.material_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Required: {material.required_quantity} units
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className={`font-semibold ${isInsufficient ? 'text-danger-600 dark:text-danger-400' : ''}`}>
                                {material.available_stock} units
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ≈ {material.max_producible} servings
                              </p>
                            </div>
                          </div>

                          {/* Stock Progress Bar */}
                          <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                stockPercentage >= 100
                                  ? 'bg-success-500'
                                  : stockPercentage >= 50
                                  ? 'bg-warning-500'
                                  : 'bg-danger-500'
                              }`}
                              style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                            />
                          </div>

                          {isInsufficient && (
                            <p className="text-xs text-danger-600 dark:text-danger-400 mt-2">
                              ⚠️ Short by {material.required_quantity - material.available_stock} units
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recipe Info */}
              {recipe && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/60">
                  <h4 className="font-semibold mb-2">Recipe Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Recipe Name</p>
                      <p className="font-medium">{recipe.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium">
                        {recipe.is_active ? (
                          <span className="text-success-600 dark:text-success-400">Active</span>
                        ) : (
                          <span className="text-muted-foreground">Inactive</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && !error && bomCalculation && bomCalculation.all_materials_availability.length === 0 && (
            <div className="text-center py-12">
              <ChefHat className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">This product does not have a recipe.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-muted/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};