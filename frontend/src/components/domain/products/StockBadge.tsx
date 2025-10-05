/**
 * Stock Badge Component
 * Phase 5 Sprint 4: Frontend Components
 * 
 * Displays product stock status with color-coded badge and icon.
 * Shows different styles based on stock level:
 * - Green: In stock (stock > reorder point)
 * - Yellow: Low stock (stock <= reorder point but > 0)
 * - Red: Out of stock (stock = 0)
 * 
 * Includes tooltip with detailed information.
 */

import { Badge } from '@/components/ui/Badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
import { 
  Package, 
  PackageCheck, 
  AlertTriangle, 
  XCircle,
} from 'lucide-react';

type StockStatus = 'in_stock' | 'low_stock' | 'critical_stock' | 'out_of_stock';

interface StockBadgeProps {
  stock: number;
  reorderPoint?: number;
  status?: StockStatus;
  showIcon?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export function StockBadge({
  stock,
  reorderPoint,
  status,
  showIcon = true,
  showTooltip = true,
  className = '',
}: StockBadgeProps) {
  // Determine stock status if not provided
  const stockStatus: StockStatus = status || determineStockStatus(stock, reorderPoint);
  
  // Get badge configuration based on status
  const config = getStatusConfig(stockStatus, stock, reorderPoint);

  const badgeContent = (
    <Badge
      variant={config.variant as any}
      className={`flex items-center gap-1.5 ${config.className} ${className}`}
    >
      {showIcon && <config.icon className="h-3.5 w-3.5" />}
      <span className="font-medium">{config.label}</span>
      <span className="font-mono text-xs">({stock})</span>
    </Badge>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{config.tooltipTitle}</p>
            <p className="text-xs text-muted-foreground">
              Current Stock: <strong>{stock} units</strong>
            </p>
            {reorderPoint !== undefined && reorderPoint > 0 && (
              <p className="text-xs text-muted-foreground">
                Reorder Point: <strong>{reorderPoint} units</strong>
              </p>
            )}
            {config.tooltipMessage && (
              <p className="text-xs text-muted-foreground mt-1">
                {config.tooltipMessage}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Helper: Determine stock status based on stock and reorder point
function determineStockStatus(stock: number, reorderPoint?: number): StockStatus {
  if (stock === 0) {
    return 'out_of_stock';
  }
  
  if (reorderPoint && reorderPoint > 0) {
    const criticalThreshold = reorderPoint * 0.25;
    
    if (stock <= criticalThreshold) {
      return 'critical_stock';
    }
    
    if (stock <= reorderPoint) {
      return 'low_stock';
    }
  }
  
  return 'in_stock';
}

// Helper: Get badge configuration based on status
interface StatusConfig {
  variant: string;
  className: string;
  icon: any;
  label: string;
  tooltipTitle: string;
  tooltipMessage?: string;
}

function getStatusConfig(
  status: StockStatus,
  stock: number,
  reorderPoint?: number
): StatusConfig {
  const configs: Record<StockStatus, StatusConfig> = {
    in_stock: {
      variant: 'success',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-800',
      icon: PackageCheck,
      label: 'In Stock',
      tooltipTitle: '✅ Stock is sufficient',
      tooltipMessage: reorderPoint && reorderPoint > 0
        ? `Stock is above the reorder point (${reorderPoint} units).`
        : 'Product is currently available.',
    },
    low_stock: {
      variant: 'warning',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800',
      icon: AlertTriangle,
      label: 'Low Stock',
      tooltipTitle: '⚠️ Stock is running low',
      tooltipMessage: reorderPoint && reorderPoint > 0
        ? `Stock is at or below the reorder point (${reorderPoint} units). Consider restocking soon.`
        : 'Stock level is low. Consider restocking.',
    },
    critical_stock: {
      variant: 'destructive',
      className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-800',
      icon: AlertTriangle,
      label: 'Critical',
      tooltipTitle: '🚨 Critical stock level',
      tooltipMessage: reorderPoint && reorderPoint > 0
        ? `Stock is critically low (less than 25% of reorder point). Immediate restocking recommended.`
        : 'Stock is critically low. Immediate action required.',
    },
    out_of_stock: {
      variant: 'destructive',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-800',
      icon: XCircle,
      label: 'Out of Stock',
      tooltipTitle: '❌ Product is out of stock',
      tooltipMessage: 'This product is currently unavailable. Please restock immediately.',
    },
  };

  return configs[status];
}

// Compact variant for table cells
interface CompactStockBadgeProps {
  stock: number;
  reorderPoint?: number;
  status?: StockStatus;
}

export function CompactStockBadge({ stock, reorderPoint, status }: CompactStockBadgeProps) {
  return (
    <StockBadge
      stock={stock}
      reorderPoint={reorderPoint}
      status={status}
      showIcon={false}
      showTooltip={true}
      className="text-xs px-2 py-0.5"
    />
  );
}

// Simple icon-only indicator
interface StockIndicatorProps {
  stock: number;
  reorderPoint?: number;
  status?: StockStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function StockIndicator({ stock, reorderPoint, status, size = 'md' }: StockIndicatorProps) {
  const stockStatus: StockStatus = status || determineStockStatus(stock, reorderPoint);
  const config = getStatusConfig(stockStatus, stock, reorderPoint);
  
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center">
            <config.icon className={`${sizeClasses[size]} ${config.className.includes('green') ? 'text-green-600' : config.className.includes('yellow') ? 'text-yellow-600' : config.className.includes('orange') ? 'text-orange-600' : 'text-red-600'}`} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="space-y-1">
            <p className="font-medium text-xs">{config.tooltipTitle}</p>
            <p className="text-xs">Stock: <strong>{stock}</strong></p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}