/**
 * Variant Analytics Dashboard Component
 * Phase 6 - Day 17: Analytics Dashboard
 * 
 * Provides comprehensive analytics visualization for product variants:
 * - Overview metrics cards
 * - Top performers list
 * - Sales trends chart
 * - Stock heatmap
 * - Performance recommendations
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All data is tenant-scoped (tenantId required)
 * - All operations respect tenant boundaries
 * - Permission-gated (requires products.view permission)
 */

import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle2,
  Info,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  BarChart3,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useProductVariantAnalytics,
  transformAnalyticsForChart,
  transformTopPerformersForChart,
  calculateStockHeatmap,
  generateRecommendations,
  calculateOverviewMetrics,
} from '@/hooks/useVariantAnalytics';

// ========================================
// TYPES
// ========================================

interface VariantAnalyticsDashboardProps {
  tenantId: string;
  productId: string;
  productName?: string;
}

type PeriodType = 'daily' | 'weekly' | 'monthly';

// ========================================
// MAIN COMPONENT
// ========================================

export const VariantAnalyticsDashboard: React.FC<VariantAnalyticsDashboardProps> = ({
  tenantId,
  productId,
  productName,
}) => {
  // State
  const [periodType, setPeriodType] = useState<PeriodType>('weekly');
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch analytics data
  const { data: analytics = [], isLoading, isError, error } = useProductVariantAnalytics(
    tenantId,
    productId,
    { period_type: periodType },
    { refetchInterval: 5 * 60 * 1000 } // Auto-refresh every 5 minutes
  );

  // Calculate derived data
  const chartData = useMemo(() => transformAnalyticsForChart(analytics), [analytics]);
  const topPerformersBySales = useMemo(() => 
    transformTopPerformersForChart(
      [...analytics].sort((a, b) => b.units_sold - a.units_sold).slice(0, 5),
      'sales'
    ),
    [analytics]
  );
  const topPerformersByRevenue = useMemo(() => 
    transformTopPerformersForChart(
      [...analytics].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
      'revenue'
    ),
    [analytics]
  );
  const stockHeatmap = useMemo(() => calculateStockHeatmap(analytics), [analytics]);
  const recommendations = useMemo(() => generateRecommendations(analytics), [analytics]);
  const overviewMetrics = useMemo(() => calculateOverviewMetrics(analytics), [analytics]);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Activity className="h-8 w-8 animate-pulse" />
            <p>Loading analytics data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card>
        <CardContent className="py-12">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Analytics</AlertTitle>
            <AlertDescription>
              {error?.message || 'Failed to load variant analytics. Please try again.'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (analytics.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <BarChart3 className="h-8 w-8" />
            <p>No analytics data available yet.</p>
            <p className="text-sm">Analytics will appear once variants have sales data.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Variant Analytics</h2>
          {productName && (
            <p className="text-sm text-muted-foreground">
              Performance insights for {productName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <OverviewCard
          title="Total Units Sold"
          value={overviewMetrics.totalUnits.toLocaleString('id-ID')}
          icon={Package}
          iconColor="text-blue-500"
        />
        <OverviewCard
          title="Total Revenue"
          value={`Rp ${overviewMetrics.totalRevenue.toLocaleString('id-ID')}`}
          icon={DollarSign}
          iconColor="text-green-500"
        />
        <OverviewCard
          title="Total Profit"
          value={`Rp ${overviewMetrics.totalProfit.toLocaleString('id-ID')}`}
          subtitle={`${overviewMetrics.avgProfitMargin.toFixed(1)}% margin`}
          icon={TrendingUp}
          iconColor="text-emerald-500"
        />
        <OverviewCard
          title="Active Variants"
          value={overviewMetrics.activeVariants.toString()}
          subtitle={
            overviewMetrics.lowStockVariants > 0
              ? `${overviewMetrics.lowStockVariants} low stock`
              : 'All variants in stock'
          }
          icon={Activity}
          iconColor={overviewMetrics.lowStockVariants > 0 ? 'text-orange-500' : 'text-green-500'}
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performers">Top Performers</TabsTrigger>
          <TabsTrigger value="stock">Stock Analysis</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Sales Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Sales Trends</CardTitle>
              <CardDescription>Units sold, revenue, and profit over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Units Sold"
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#22c55e"
                    strokeWidth={2}
                    name="Revenue"
                    dot={{ fill: '#22c55e', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#a855f7"
                    strokeWidth={2}
                    name="Profit"
                    dot={{ fill: '#a855f7', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(
                    analytics.reduce((acc, item) => {
                      const status = item.performance_status || 'unknown';
                      acc[status] = (acc[status] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            status === 'excellent'
                              ? 'default'
                              : status === 'good'
                              ? 'secondary'
                              : status === 'poor'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {status}
                        </Badge>
                      </div>
                      <span className="font-medium">{count} variants</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stock Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">In Stock</span>
                    <span className="font-medium">
                      {overviewMetrics.totalVariants - overviewMetrics.outOfStockVariants}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-orange-600">
                    <span className="text-sm">Low Stock</span>
                    <span className="font-medium">{overviewMetrics.lowStockVariants}</span>
                  </div>
                  <div className="flex items-center justify-between text-red-600">
                    <span className="text-sm">Out of Stock</span>
                    <span className="font-medium">{overviewMetrics.outOfStockVariants}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Performers Tab */}
        <TabsContent value="performers" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Top by Sales */}
            <Card>
              <CardHeader>
                <CardTitle>Top Sellers</CardTitle>
                <CardDescription>Variants with highest units sold</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topPerformersBySales} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" name="Units Sold" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top by Revenue */}
            <Card>
              <CardHeader>
                <CardTitle>Top Revenue Generators</CardTitle>
                <CardDescription>Variants with highest revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topPerformersByRevenue} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill="#22c55e" name="Revenue (Rp)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed List */}
          <Card>
            <CardHeader>
              <CardTitle>All Variants Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {[...analytics]
                    .sort((a, b) => b.units_sold - a.units_sold)
                    .map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{item.variant?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.variant?.sku}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="font-medium">{item.units_sold} units</p>
                            <p className="text-xs text-muted-foreground">Sales</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              Rp {item.revenue.toLocaleString('id-ID')}
                            </p>
                            <p className="text-xs text-muted-foreground">Revenue</p>
                          </div>
                          <Badge
                            variant={
                              item.performance_status === 'excellent'
                                ? 'default'
                                : item.performance_status === 'good'
                                ? 'secondary'
                                : item.performance_status === 'poor'
                                ? 'destructive'
                                : 'outline'
                            }
                          >
                            {item.performance_status || 'N/A'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Analysis Tab */}
        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Heatmap</CardTitle>
              <CardDescription>
                Visual representation of stock levels and turnover rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {stockHeatmap.map((item) => (
                  <div
                    key={item.variant}
                    className="rounded-lg border p-4"
                    style={{ borderLeftColor: item.color, borderLeftWidth: '4px' }}
                  >
                    <p className="font-medium">{item.variant}</p>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Stock:</span>
                      <span className="font-medium">{item.stock}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sales:</span>
                      <span className="font-medium">{item.sales}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Turnover:</span>
                      <span className="font-medium">{item.turnover.toFixed(2)}</span>
                    </div>
                    <Badge className="mt-2" variant="outline">
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock Status Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded" style={{ backgroundColor: '#ef4444' }} />
                  <span className="text-sm">Critical (Out of Stock)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded" style={{ backgroundColor: '#f97316' }} />
                  <span className="text-sm">Low Stock</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded" style={{ backgroundColor: '#22c55e' }} />
                  <span className="text-sm">Normal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
                  <span className="text-sm">High (Overstocked)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Recommendations</CardTitle>
              <CardDescription>
                Actionable insights to improve variant performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {recommendations.length === 0 ? (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>All Good!</AlertTitle>
                      <AlertDescription>
                        No critical recommendations at this time. Keep monitoring your variants.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    recommendations.map((rec, index) => (
                      <Alert
                        key={index}
                        variant={
                          rec.type === 'error'
                            ? 'destructive'
                            : rec.type === 'warning'
                            ? 'default'
                            : 'default'
                        }
                      >
                        {rec.type === 'error' ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : rec.type === 'warning' ? (
                          <Info className="h-4 w-4" />
                        ) : rec.type === 'success' ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Info className="h-4 w-4" />
                        )}
                        <AlertTitle>{rec.title}</AlertTitle>
                        <AlertDescription>{rec.description}</AlertDescription>
                      </Alert>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ========================================
// HELPER COMPONENTS
// ========================================

interface OverviewCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor?: string;
}

const OverviewCard: React.FC<OverviewCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardContent>
    </Card>
  );
};

export default VariantAnalyticsDashboard;