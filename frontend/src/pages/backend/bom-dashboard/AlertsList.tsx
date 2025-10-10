import React from 'react';
import { AlertTriangle, XCircle, AlertCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import type { StockAlert } from '@/types/bom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface AlertsListProps {
  alerts: StockAlert[];
  isLoading: boolean;
}

export function AlertsList({ alerts, isLoading }: AlertsListProps) {
  const navigate = useNavigate();
  const { tenantId } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <Info className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No active alerts</p>
        <p className="text-sm text-muted-foreground mt-1">All materials are at healthy stock levels</p>
      </div>
    );
  }

  // Normalize alerts with default level if missing
  const normalizedAlerts = alerts.map(alert => ({
    ...alert,
    level: alert.level || 'info' // Default to 'info' if undefined
  }));

  // Sort by severity and take top 5
  const priorityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
  const topAlerts = [...normalizedAlerts]
    .sort((a, b) => {
      const priorityA = priorityOrder[a.level] ?? 999;
      const priorityB = priorityOrder[b.level] ?? 999;
      return priorityA - priorityB;
    })
    .slice(0, 5);

  const getAlertIcon = (level?: string) => {
    switch (level) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-danger-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-info-600" />;
    }
  };

  const getAlertBadgeVariant = (level?: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (level) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const handleViewMaterial = (materialId: string) => {
    navigate(`/admin/materials?highlight=${materialId}`);
  };

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
      {topAlerts.map((alert, index) => (
        <div
          key={alert.id || `${alert.material_id}-${index}`}
          className="p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-start gap-3">
              {getAlertIcon(alert.level)}
              <div>
                <p className="font-medium text-foreground">{alert.material_name}</p>
                <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
              </div>
            </div>
            <Badge variant={getAlertBadgeVariant(alert.level)}>
              {(alert.level || 'INFO').toUpperCase()}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Current: </span>
                <span className="font-medium text-foreground">
                  {alert.current_stock} {alert.unit}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Reorder: </span>
                <span className="font-medium text-foreground">
                  {alert.reorder_level} {alert.unit}
                </span>
              </div>
              {alert.days_until_stockout && (
                <div>
                  <span className="text-danger-600 font-medium">
                    ~{alert.days_until_stockout} days left
                  </span>
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleViewMaterial(alert.material_id)}
            >
              View Material
            </Button>
          </div>
        </div>
      ))}
      
      {alerts.length > 5 && (
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => navigate(`/admin/materials?status=low_stock`)}
        >
          View All {alerts.length} Alerts →
        </Button>
      )}
    </div>
  );
}