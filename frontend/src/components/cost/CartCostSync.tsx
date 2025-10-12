/**
 * Cart Cost Sync Component
 * Phase 4A Day 6: Material Cost Tracking UI Integration
 * 
 * Automatically calculates material costs when cart changes.
 * Updates cart store with real-time profit margins and alerts.
 * 
 * Features:
 * - Auto-trigger cost calculation on cart changes
 * - Debounced API calls (300ms)
 * - Error handling with retry logic
 * - Loading state management
 * 
 * Design:
 * - Zero UI (background process)
 * - Syncs with cartStore automatically
 */

import { useEffect, useRef, useCallback } from 'react';
import { useCartStore } from '@/stores/cartStore';
import { useMaterialCostTracking } from '@/hooks/useMaterialCostTracking';

interface CartCostSyncProps {
  tenantId: string; // Required: Tenant context for API calls
  enabled?: boolean; // Allow disabling sync (e.g., for testing)
  debounceMs?: number; // Debounce delay (default: 300ms)
}

export function CartCostSync({ 
  tenantId,
  enabled = true, 
  debounceMs = 300 
}: CartCostSyncProps) {
  const items = useCartStore((state) => state.items);
  const updateCostAnalysis = useCartStore((state) => state.updateCostAnalysis);
  const setCostLoading = useCartStore((state) => state.setCostLoading);
  const setCostError = useCartStore((state) => state.setCostError);
  const clearCostAnalysis = useCartStore((state) => state.clearCostAnalysis);
  
  const { calculateCosts } = useMaterialCostTracking({ tenantId });
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const syncCosts = useCallback(async () => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // If cart is empty, clear cost data
    if (items.length === 0) {
      clearCostAnalysis();
      return;
    }

    // Debounce cost calculation
    debounceTimer.current = setTimeout(async () => {
      setCostLoading(true);
      
      try {
        // Prepare products for cost calculation
        const products = items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          selling_price: item.product.price,
        }));

        // Calculate costs via API
        const result = await calculateCosts(products);

        // Update cart store with cost data
        if (result) {
          updateCostAnalysis(result.products, result.summary);
        }
      } catch (error) {
        console.error('Cart cost sync error:', error);
        setCostError(
          error instanceof Error 
            ? error.message 
            : 'Failed to calculate costs'
        );
      } finally {
        setCostLoading(false);
      }
    }, debounceMs);
  }, [
    items,
    calculateCosts,
    updateCostAnalysis,
    setCostLoading,
    setCostError,
    clearCostAnalysis,
    debounceMs,
  ]);

  // Trigger sync when cart items change
  useEffect(() => {
    if (!enabled) return;

    syncCosts();

    // Cleanup debounce timer on unmount
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [enabled, syncCosts]);

  // This component has no UI
  return null;
}