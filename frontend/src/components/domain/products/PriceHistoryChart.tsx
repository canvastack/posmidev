import React from 'react';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { PriceHistory } from '@/types/history';

interface PriceHistoryChartProps {
  history: PriceHistory[];
  loading?: boolean;
}

export function PriceHistoryChart({ history, loading }: PriceHistoryChartProps) {
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
        <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No price changes recorded</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

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

  return (
    <div className="space-y-4">
      {history.map((item, index) => {
        const priceDiff = item.new_price - item.old_price;
        const costDiff = (item.new_cost_price && item.old_cost_price) 
          ? item.new_cost_price - item.old_cost_price 
          : null;

        return (
          <Card key={item.id} className="p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getChangeIcon(item.price_change_direction)}
                  <span className="font-medium text-sm">
                    {format(new Date(item.changed_at), 'MMM dd, yyyy HH:mm')}
                  </span>
                  <Badge variant={getChangeBadgeVariant(item.price_change_direction)}>
                    {item.price_change_percentage > 0 ? '+' : ''}
                    {item.price_change_percentage.toFixed(1)}%
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {/* Selling Price */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground min-w-[100px]">Selling Price:</span>
                    <div className="flex items-center gap-2">
                      <span className="line-through text-red-600">{formatCurrency(item.old_price)}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-semibold text-green-600">{formatCurrency(item.new_price)}</span>
                      <span className={`text-xs ${priceDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({priceDiff >= 0 ? '+' : ''}{formatCurrency(priceDiff)})
                      </span>
                    </div>
                  </div>
                  
                  {/* Cost Price */}
                  {item.old_cost_price !== null && item.new_cost_price !== null && (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground min-w-[100px]">Cost Price:</span>
                      <div className="flex items-center gap-2">
                        <span className="line-through text-red-600">{formatCurrency(item.old_cost_price)}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-semibold text-green-600">{formatCurrency(item.new_cost_price)}</span>
                        {costDiff !== null && (
                          <span className={`text-xs ${costDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ({costDiff >= 0 ? '+' : ''}{formatCurrency(costDiff)})
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-2 text-xs text-muted-foreground">
                  Changed by: {item.changed_by_user?.name || 'System'}
                </div>
              </div>
              
              {index === 0 && (
                <Badge variant="outline" className="ml-2">Current</Badge>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}