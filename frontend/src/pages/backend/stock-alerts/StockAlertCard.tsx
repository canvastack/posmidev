/**
 * Stock Alert Card Component
 * Phase 5 Sprint 4: Frontend Components
 * 
 * Displays individual stock alert with product details and action buttons.
 * Supports acknowledge, resolve, and dismiss actions with optional notes.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { StockAlert } from '@/types/stock';
import {
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  TrendingDown,
  PackageX,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface StockAlertCardProps {
  alert: StockAlert;
  onAcknowledge: (alertId: string, notes?: string) => void;
  onResolve: (alertId: string, notes?: string) => void;
  onDismiss: (alertId: string, notes?: string) => void;
  isLoading: boolean;
  canAdjust: boolean;
}

type ActionType = 'acknowledge' | 'resolve' | 'dismiss' | null;

export function StockAlertCard({
  alert,
  onAcknowledge,
  onResolve,
  onDismiss,
  isLoading,
  canAdjust,
}: StockAlertCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [notes, setNotes] = useState('');

  const openActionDialog = (type: ActionType) => {
    setActionType(type);
    setNotes('');
    setDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!actionType) return;

    switch (actionType) {
      case 'acknowledge':
        onAcknowledge(alert.id, notes || undefined);
        break;
      case 'resolve':
        onResolve(alert.id, notes || undefined);
        break;
      case 'dismiss':
        onDismiss(alert.id, notes || undefined);
        break;
    }

    setDialogOpen(false);
    setActionType(null);
    setNotes('');
  };

  // Determine severity badge
  const getSeverityBadge = () => {
    const configs = {
      low: {
        variant: 'warning' as const,
        icon: AlertTriangle,
        label: 'Low Stock',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      },
      critical: {
        variant: 'destructive' as const,
        icon: AlertTriangle,
        label: 'Critical',
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      },
      out_of_stock: {
        variant: 'destructive' as const,
        icon: PackageX,
        label: 'Out of Stock',
        className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      },
    };

    const config = configs[alert.severity];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Determine status badge
  const getStatusBadge = () => {
    const configs = {
      pending: {
        variant: 'warning' as const,
        icon: Clock,
        label: 'Pending',
      },
      acknowledged: {
        variant: 'secondary' as const,
        icon: User,
        label: 'Acknowledged',
      },
      resolved: {
        variant: 'success' as const,
        icon: CheckCircle,
        label: 'Resolved',
      },
      dismissed: {
        variant: 'secondary' as const,
        icon: XCircle,
        label: 'Dismissed',
      },
    };

    const config = configs[alert.status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Check if alert is actionable (not resolved/dismissed)
  const isActionable = alert.status === 'pending' || alert.status === 'acknowledged';

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Product Image */}
            <div className="flex-shrink-0">
              {alert.product?.thumbnail_url ? (
                <img
                  src={alert.product.thumbnail_url}
                  alt={alert.product?.name}
                  className="h-24 w-24 object-cover rounded-lg border"
                />
              ) : (
                <div className="h-24 w-24 flex items-center justify-center bg-muted rounded-lg border">
                  <Package className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Alert Details */}
            <div className="flex-1 space-y-3">
              {/* Header: Product Name + Badges */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{alert.product?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    SKU: {alert.product?.sku}
                  </p>
                  {alert.product?.category && (
                    <p className="text-xs text-muted-foreground">
                      Category: {alert.product.category.name}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {getSeverityBadge()}
                  {getStatusBadge()}
                </div>
              </div>

              {/* Stock Information */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="font-medium">Current Stock:</span>
                  <span className={`font-bold ${alert.current_stock === 0 ? 'text-destructive' : 'text-yellow-600'}`}>
                    {alert.current_stock} units
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Reorder Point:</span>
                  <span className="font-semibold">{alert.reorder_point} units</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Reorder Qty:</span>
                  <span className="font-semibold">{alert.reorder_quantity} units</span>
                </div>
              </div>

              {/* Timeline */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created: {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm')}
                </div>
                {alert.acknowledged_at && alert.acknowledged_by && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Acknowledged by {alert.acknowledged_by.name} on {format(new Date(alert.acknowledged_at), 'MMM dd, yyyy')}
                  </div>
                )}
              </div>

              {/* Action Notes (if any) */}
              {alert.acknowledged_notes && (
                <div className="text-xs bg-muted p-2 rounded">
                  <strong>Acknowledged Notes:</strong> {alert.acknowledged_notes}
                </div>
              )}
              {alert.resolved_notes && (
                <div className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded">
                  <strong>Resolved Notes:</strong> {alert.resolved_notes}
                </div>
              )}
              {alert.dismissed_notes && (
                <div className="text-xs bg-muted p-2 rounded">
                  <strong>Dismissed Notes:</strong> {alert.dismissed_notes}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {isActionable && (
              <div className="flex flex-col gap-2 min-w-[120px]">
                {alert.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openActionDialog('acknowledge')}
                    disabled={isLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Acknowledge
                  </Button>
                )}
                
                {canAdjust && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => openActionDialog('resolve')}
                    disabled={isLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Resolve
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openActionDialog('dismiss')}
                  disabled={isLoading}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'acknowledge' && 'Acknowledge Alert'}
              {actionType === 'resolve' && 'Resolve Alert'}
              {actionType === 'dismiss' && 'Dismiss Alert'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'acknowledge' && 'Mark this alert as acknowledged. You can add notes to explain the action taken.'}
              {actionType === 'resolve' && 'Mark this alert as resolved. This indicates the stock issue has been addressed.'}
              {actionType === 'dismiss' && 'Dismiss this alert. This will close the alert without taking action.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Enter any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}