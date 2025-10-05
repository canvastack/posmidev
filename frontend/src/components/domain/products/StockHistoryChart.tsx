import React from 'react';
import { format } from 'date-fns';
import { Package, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { StockHistory } from '@/types/history';

interface StockHistoryChartProps {
  history: StockHistory[];
  loading?: boolean;
}

export function StockHistoryChart({ history, loading }: StockHistoryChartProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No stock changes recorded</p>
      </div>
    );
  }

  const getChangeIcon = (direction: string) => {
    switch (direction) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChangeBadgeVariant = (direction: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (direction) {
      case 'increase':
        return 'default';
      case 'decrease':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getChangeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'manual': 'Manual Adjustment',
      'adjustment': 'Stock Adjustment',
      'sale': 'Sale',
      'purchase': 'Purchase',
      'return': 'Return',
    };
    return labels[type] || type;
  };

  const getChangeTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'purchase': 'default',
      'return': 'default',
      'sale': 'destructive',
      'adjustment': 'secondary',
      'manual': 'outline',
    };
    return variants[type] || 'secondary';
  };

  return (
    <div className="space-y-4">
      {history.map((item, index) => {
        return (
          <Card key={item.id} className="p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getChangeIcon(item.change_direction)}
                  <span className="font-medium text-sm">
                    {format(new Date(item.changed_at), 'MMM dd, yyyy HH:mm')}
                  </span>
                  <Badge variant={getChangeTypeBadgeVariant(item.change_type)}>
                    {getChangeTypeLabel(item.change_type)}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {/* Stock Change */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground min-w-[100px]">Stock Level:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{item.old_stock}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-mono font-semibold">{item.new_stock}</span>
                      <Badge variant={getChangeBadgeVariant(item.change_direction)} className="ml-2">
                        {item.change_amount >= 0 ? '+' : ''}{item.change_amount} units
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Notes */}
                  {item.notes && (
                    <div className="flex items-start gap-4 text-sm">
                      <span className="text-muted-foreground min-w-[100px]">Notes:</span>
                      <span className="text-muted-foreground italic">{item.notes}</span>
                    </div>
                  )}
                  
                  {/* Reference */}
                  {item.reference_type && item.reference_id && (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground min-w-[100px]">Reference:</span>
                      <span className="font-mono text-xs">{item.reference_type} #{item.reference_id.substring(0, 8)}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-2 text-xs text-muted-foreground">
                  Changed by: {item.changed_by_user?.name || 'System'}
                </div>
              </div>
              
              {index === 0 && (
                <Badge variant="outline" className="ml-2">Latest</Badge>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}