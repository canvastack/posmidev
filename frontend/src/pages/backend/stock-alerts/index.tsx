/**
 * Stock Alerts Dashboard Page
 * Phase 5 Sprint 4: Frontend Components
 * 
 * Main page for managing stock alerts with filtering, sorting, and actions.
 * Shows statistics, alert list, and allows acknowledge/resolve/dismiss actions.
 * 
 * IMMUTABLE RULES ENFORCED:
 * - Tenant-scoped data (uses tenantId from auth)
 * - Permission checks (inventory.view or products.view required)
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { stockApi } from '@/api/stockApi';
import type { 
  StockAlert, 
  StockAlertStats, 
  AlertStatus, 
  AlertSeverity,
  StockAlertFilters 
} from '@/types/stock';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  TrendingDown,
  Filter,
  RefreshCw,
  PackageX,
  AlertCircle,
} from 'lucide-react';
import { StockAlertCard } from './StockAlertCard';
import { Pagination } from '@/components/ui/Pagination';

export default function StockAlertsPage() {
  const { tenantId } = useAuth();
  const { hasPermission } = usePermissions();
  
  // Check permissions
  const canView = hasPermission('inventory.view') || hasPermission('products.view');
  const canAdjust = hasPermission('inventory.adjust');

  // State
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [stats, setStats] = useState<StockAlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'current_stock' | 'severity' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const perPage = 20;

  // Load data on mount and when filters change
  useEffect(() => {
    if (tenantId && canView) {
      loadAlerts();
      loadStats();
    }
  }, [tenantId, canView, statusFilter, severityFilter, sortBy, sortOrder, currentPage]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const filters: StockAlertFilters = {
        page: currentPage,
        per_page: perPage,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (statusFilter !== 'all') {
        filters.status = statusFilter as AlertStatus;
      }

      if (severityFilter !== 'all') {
        filters.severity = severityFilter as AlertSeverity;
      }

      const response = await stockApi.getStockAlerts(tenantId!, filters);
      setAlerts(response.data);
      setCurrentPage(response.current_page);
      setTotalPages(response.last_page);
      setTotalItems(response.total);
    } catch (error: any) {
      console.error('Failed to load alerts:', error);
      toast.error('Failed to load stock alerts');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const data = await stockApi.getStockAlertStats(tenantId!);
      setStats(data);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string, notes?: string) => {
    setActionLoading(alertId);
    try {
      await stockApi.acknowledgeAlert(tenantId!, alertId, { notes });
      toast.success('Alert acknowledged successfully');
      loadAlerts();
      loadStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to acknowledge alert');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolve = async (alertId: string, notes?: string) => {
    if (!canAdjust) {
      toast.error('You do not have permission to resolve alerts');
      return;
    }

    setActionLoading(alertId);
    try {
      await stockApi.resolveAlert(tenantId!, alertId, { notes });
      toast.success('Alert resolved successfully');
      loadAlerts();
      loadStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resolve alert');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismiss = async (alertId: string, notes?: string) => {
    setActionLoading(alertId);
    try {
      await stockApi.dismissAlert(tenantId!, alertId, { notes });
      toast.success('Alert dismissed successfully');
      loadAlerts();
      loadStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to dismiss alert');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefresh = () => {
    loadAlerts();
    loadStats();
  };

  // Permission check
  if (!canView) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You do not have permission to view stock alerts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Alerts</h1>
          <p className="text-muted-foreground">
            Monitor and manage low stock alerts for your products
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Alerts"
          value={stats?.total_alerts || 0}
          icon={Package}
          loading={statsLoading}
          variant="default"
        />
        <StatCard
          title="Pending"
          value={stats?.by_status?.pending || 0}
          icon={Clock}
          loading={statsLoading}
          variant="warning"
        />
        <StatCard
          title="Critical"
          value={stats?.by_severity?.critical || 0}
          icon={AlertTriangle}
          loading={statsLoading}
          variant="destructive"
        />
        <StatCard
          title="Out of Stock"
          value={stats?.by_severity?.out_of_stock || 0}
          icon={PackageX}
          loading={statsLoading}
          variant="destructive"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle>Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={(value: any) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Severity</label>
              <Select value={severityFilter} onValueChange={(value: any) => {
                setSeverityFilter(value);
                setCurrentPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="current_stock">Stock Level</SelectItem>
                  <SelectItem value="severity">Severity</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="text-sm font-medium mb-2 block">Order</label>
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts ({totalItems})</CardTitle>
          <CardDescription>
            Showing {alerts.length} of {totalItems} alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No alerts found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== 'all' || severityFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'All products have sufficient stock'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <StockAlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={handleAcknowledge}
                  onResolve={handleResolve}
                  onDismiss={handleDismiss}
                  isLoading={actionLoading === alert.id}
                  canAdjust={canAdjust}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Statistics Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: any;
  loading: boolean;
  variant: 'default' | 'warning' | 'destructive';
}

function StatCard({ title, value, icon: Icon, loading, variant }: StatCardProps) {
  const variantClasses = {
    default: 'border-primary/20 bg-primary/5',
    warning: 'border-yellow-500/20 bg-yellow-500/5',
    destructive: 'border-destructive/20 bg-destructive/5',
  };

  const iconClasses = {
    default: 'text-primary',
    warning: 'text-yellow-600',
    destructive: 'text-destructive',
  };

  return (
    <Card className={variantClasses[variant]}>
      <CardContent className="pt-6">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold">{value}</p>
            </div>
            <Icon className={`h-8 w-8 ${iconClasses[variant]}`} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}