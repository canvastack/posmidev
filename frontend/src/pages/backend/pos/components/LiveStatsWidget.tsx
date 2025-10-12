import { useState, useEffect } from 'react';
import { StatCard } from './StatCard';
import { DollarSign, Receipt, TrendingUp, Package, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { orderApi } from '@/api/orderApi';

interface TodayStats {
  total_sales: number;
  transaction_count: number;
  average_transaction: number;
  items_sold: number;
  last_updated?: string;
}

export const LiveStatsWidget = () => {
  const { tenantId } = useAuth();
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date>(new Date());

  const fetchStats = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Note: This endpoint needs to be implemented in backend
      // For now, we'll use mock data if API fails
      try {
        const data = await orderApi.getTodayStats(tenantId);
        setStats(data);
      } catch (apiError) {
        // Fallback to mock data for development
        console.warn('Using mock stats data:', apiError);
        setStats({
          total_sales: 0,
          transaction_count: 0,
          average_transaction: 0,
          items_sold: 0,
        });
      }
      
      setLastFetch(new Date());
    } catch (err) {
      setError('Failed to load stats');
      console.error('Stats fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [tenantId]);

  if (error) {
    return (
      <div className="glass-card p-4 rounded-xl border border-danger-500/20 bg-danger-500/5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-danger-600 dark:text-danger-400">
            {error}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchStats}
            className="text-danger-600 hover:text-danger-700"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="glass-card p-6 rounded-xl animate-pulse">
        <div className="h-4 bg-muted rounded w-32 mb-4"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted/50 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 rounded-xl border">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Today's Performance
        </h4>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-xs animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-success-600 mr-1.5"></div>
            Live
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchStats}
            className="h-7 w-7 p-0"
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Sales"
          value={formatCurrency(stats?.total_sales || 0)}
          icon={DollarSign}
        />
        <StatCard
          label="Transactions"
          value={stats?.transaction_count || 0}
          icon={Receipt}
        />
        <StatCard
          label="Avg Transaction"
          value={formatCurrency(stats?.average_transaction || 0)}
          icon={TrendingUp}
        />
        <StatCard
          label="Items Sold"
          value={stats?.items_sold || 0}
          icon={Package}
        />
      </div>

      {/* Last Updated */}
      <div className="mt-3 pt-3 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Last updated: {lastFetch.toLocaleTimeString()}
          <span className="mx-2">•</span>
          Auto-refresh every 30s
        </p>
      </div>
    </div>
  );
};