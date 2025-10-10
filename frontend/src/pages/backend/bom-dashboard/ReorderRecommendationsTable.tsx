import React from 'react';
import { Package, TrendingUp, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import type { ReorderRecommendation } from '@/types/bom';
import { useNavigate } from 'react-router-dom';

interface ReorderRecommendationsTableProps {
  recommendations: ReorderRecommendation[];
  isLoading: boolean;
}

export function ReorderRecommendationsTable({ recommendations, isLoading }: ReorderRecommendationsTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No reorder recommendations</p>
        <p className="text-sm text-muted-foreground mt-1">All materials have sufficient stock levels</p>
      </div>
    );
  }

  // 🛡️ NORMALIZE DATA: Set safe defaults for undefined values
  const normalizedRecommendations = recommendations.map(rec => ({
    ...rec,
    priority: rec.priority || 'low',
    estimated_cost: rec.estimated_cost ?? 0,
    unit_cost: rec.unit_cost ?? 0,
    suggested_order_quantity: rec.suggested_order_quantity ?? 0,
    current_stock: rec.current_stock ?? 0,
    reorder_level: rec.reorder_level ?? 0,
  }));

  // Sort by priority: high > medium > low
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sortedRecommendations = [...normalizedRecommendations]
    .sort((a, b) => (priorityOrder[a.priority] ?? 999) - (priorityOrder[b.priority] ?? 999))
    .slice(0, 5);

  const getPriorityBadgeVariant = (priority?: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const handleViewMaterial = (materialId: string) => {
    navigate(`/admin/materials?highlight=${materialId}`);
  };

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
      {sortedRecommendations.map((rec, index) => (
        <div
          key={`${rec.material_id}-${index}`}
          className="p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-foreground">{rec.material_name}</p>
                <Badge variant={getPriorityBadgeVariant(rec.priority)}>
                  {(rec.priority || 'LOW').toUpperCase()}
                </Badge>
              </div>
              {rec.supplier && (
                <p className="text-sm text-muted-foreground">Supplier: {rec.supplier}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-info-600" />
              <div>
                <p className="text-xs text-muted-foreground">Suggested Order</p>
                <p className="font-medium text-foreground">
                  {rec.suggested_order_quantity ?? 0} {rec.unit}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-success-600" />
              <div>
                <p className="text-xs text-muted-foreground">Estimated Cost</p>
                <p className="font-medium text-foreground">
                  Rp {(rec.estimated_cost ?? 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Current: </span>
                <span className="font-medium text-foreground">
                  {rec.current_stock ?? 0} {rec.unit}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Reorder Level: </span>
                <span className="font-medium text-foreground">
                  {rec.reorder_level ?? 0} {rec.unit}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Unit Cost: </span>
                <span className="font-medium text-foreground">
                  Rp {(rec.unit_cost ?? 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewMaterial(rec.material_id)}
            >
              Adjust Stock
            </Button>
          </div>
        </div>
      ))}

      {recommendations.length > 5 && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => navigate(`/admin/materials?status=low_stock`)}
        >
          View All {recommendations.length} Recommendations →
        </Button>
      )}
    </div>
  );
}