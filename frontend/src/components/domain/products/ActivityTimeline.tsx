import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { 
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  CubeIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  ArchiveBoxIcon,
  ArrowPathIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import type { ActivityLog, ActivityEvent } from '@/types/history';

type PeriodPreset = 'last_7_days' | 'last_30_days' | 'last_90_days';

interface ActivityTimelineProps {
  activities: ActivityLog[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  onPeriodChange: (period: PeriodPreset) => void;
  currentPeriod: PeriodPreset;
  productName?: string;
}

/**
 * Get appropriate icon for each activity event type
 */
function getActivityIcon(event: ActivityEvent) {
  switch (event) {
    case 'created':
      return <PlusIcon className="h-5 w-5 text-success-600" />;
    case 'updated':
      return <PencilIcon className="h-5 w-5 text-info-600" />;
    case 'deleted':
      return <TrashIcon className="h-5 w-5 text-danger-600" />;
    case 'restored':
      return <ArrowPathIcon className="h-5 w-5 text-success-600" />;
    case 'archived':
      return <ArchiveBoxIcon className="h-5 w-5 text-warning-600" />;
    case 'price_changed':
      return <CurrencyDollarIcon className="h-5 w-5 text-warning-600" />;
    case 'stock_adjusted':
      return <CubeIcon className="h-5 w-5 text-info-600" />;
    case 'variant_added':
      return <TagIcon className="h-5 w-5 text-success-600" />;
    case 'variant_updated':
      return <TagIcon className="h-5 w-5 text-info-600" />;
    case 'variant_deleted':
      return <TagIcon className="h-5 w-5 text-danger-600" />;
    default:
      return <ClockIcon className="h-5 w-5 text-muted-foreground" />;
  }
}

/**
 * Get human-readable event label
 */
function getEventLabel(event: ActivityEvent): string {
  const labels: Record<ActivityEvent, string> = {
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    restored: 'Restored',
    archived: 'Archived',
    price_changed: 'Price Changed',
    stock_adjusted: 'Stock Adjusted',
    variant_added: 'Variant Added',
    variant_updated: 'Variant Updated',
    variant_deleted: 'Variant Deleted',
  };
  return labels[event] || event;
}

/**
 * Get badge variant for event type
 */
function getEventBadgeVariant(event: ActivityEvent): 'default' | 'secondary' | 'destructive' | 'warning' | 'success' {
  switch (event) {
    case 'created':
    case 'restored':
    case 'variant_added':
      return 'success';
    case 'deleted':
    case 'variant_deleted':
      return 'destructive';
    case 'archived':
    case 'price_changed':
      return 'warning';
    case 'updated':
    case 'stock_adjusted':
    case 'variant_updated':
      return 'default';
    default:
      return 'secondary';
  }
}

/**
 * Format change details for display
 */
function renderChangeDetails(activity: ActivityLog) {
  const { changes } = activity;
  
  if (!changes.old && !changes.attributes) {
    return null;
  }

  // For created events, show new values
  if (activity.event === 'created' && changes.attributes) {
    const attrs = changes.attributes;
    return (
      <div className="mt-2 space-y-1 text-sm">
        {attrs.name && <div><span className="font-medium">Name:</span> {attrs.name}</div>}
        {attrs.sku && <div><span className="font-medium">SKU:</span> {attrs.sku}</div>}
        {attrs.price && <div><span className="font-medium">Price:</span> Rp {parseFloat(attrs.price).toLocaleString('id-ID')}</div>}
        {attrs.stock !== undefined && <div><span className="font-medium">Stock:</span> {attrs.stock}</div>}
      </div>
    );
  }

  // For updates, show old → new
  if ((activity.event === 'updated' || activity.event === 'price_changed') && changes.old && changes.attributes) {
    const old = changes.old;
    const attributes = changes.attributes;
    const changedFields = Object.keys(attributes).filter(key => 
      old[key] !== undefined && old[key] !== attributes[key]
    );

    if (changedFields.length === 0) {
      return null;
    }

    return (
      <div className="mt-2 space-y-2 text-sm">
        {changedFields.map(field => {
          const oldVal = old[field];
          const newVal = attributes[field];

          // Format currency fields
          if (field === 'price' || field === 'cost_price') {
            return (
              <div key={field} className="flex items-center gap-2">
                <span className="font-medium capitalize">{field.replace('_', ' ')}:</span>
                <span className="text-danger-600 line-through">
                  Rp {parseFloat(oldVal).toLocaleString('id-ID')}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="text-success-600 font-semibold">
                  Rp {parseFloat(newVal).toLocaleString('id-ID')}
                </span>
              </div>
            );
          }

          // Format stock field
          if (field === 'stock') {
            const diff = newVal - oldVal;
            const diffColor = diff > 0 ? 'text-success-600' : 'text-danger-600';
            return (
              <div key={field} className="flex items-center gap-2">
                <span className="font-medium">Stock:</span>
                <span className="text-muted-foreground">{oldVal}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-semibold">{newVal}</span>
                <span className={`text-xs ${diffColor}`}>
                  ({diff > 0 ? '+' : ''}{diff})
                </span>
              </div>
            );
          }

          // Default field rendering
          return (
            <div key={field} className="flex items-center gap-2">
              <span className="font-medium capitalize">{field.replace('_', ' ')}:</span>
              <span className="text-muted-foreground">{String(oldVal)}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-semibold">{String(newVal)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

/**
 * Period options for date range filter
 */
const PERIOD_OPTIONS: { label: string; value: PeriodPreset }[] = [
  { label: 'Last 7 Days', value: 'last_7_days' },
  { label: 'Last 30 Days', value: 'last_30_days' },
  { label: 'Last 90 Days', value: 'last_90_days' },
];

/**
 * Activity Timeline Component
 * Displays chronological product activity history with change details
 * 
 * @remarks
 * - All activities are tenant-scoped via API
 * - Implements lazy loading with "Load More" button
 * - Shows detailed change tracking (old → new values)
 * - Supports date range filtering
 * - Includes refresh button for manual data reload
 */
export function ActivityTimeline({
  activities,
  loading,
  error,
  hasMore,
  onLoadMore,
  onRefresh,
  onPeriodChange,
  currentPeriod,
  productName,
}: ActivityTimelineProps) {
  // Empty state
  if (!loading && activities.length === 0 && !error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <ClockIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No Activity Yet</p>
            <p className="text-sm mt-2">
              Activity history will appear here when changes are made to this product.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-danger-600">
            <p className="text-lg font-medium">Failed to Load Activity History</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Activity History</h3>
              <p className="text-sm text-muted-foreground">
                View all changes and events for this product
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Period selector */}
              <select
                value={currentPeriod}
                onChange={(e) => onPeriodChange(e.target.value as PeriodPreset)}
                className="px-3 py-2 border border-border rounded-md bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              {/* Refresh button */}
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <div className="relative space-y-4">
        {/* Timeline vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        {activities.map((activity, index) => (
          <Card key={activity.id} className="relative ml-14 animate-in fade-in slide-in-from-left-4">
            {/* Timeline dot */}
            <div className="absolute -left-14 top-6 flex items-center justify-center w-12 h-12 rounded-full bg-card border-2 border-border shadow-sm">
              {getActivityIcon(activity.event)}
            </div>

            <CardContent className="pt-4 pb-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getEventBadgeVariant(activity.event)}>
                      {getEventLabel(activity.event)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {activity.description && (
                    <p className="text-sm text-foreground">{activity.description}</p>
                  )}
                </div>

                {/* User info */}
                {activity.causer && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <UserIcon className="h-4 w-4" />
                    <span>{activity.causer.name}</span>
                  </div>
                )}
              </div>

              {/* Change details */}
              {renderChangeDetails(activity)}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span>Loading activities...</span>
          </div>
        </div>
      )}

      {/* Load More button */}
      {!loading && hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={loading}
          >
            <ClockIcon className="h-4 w-4 mr-2" />
            Load More Activities
          </Button>
        </div>
      )}

      {/* End of history indicator */}
      {!loading && !hasMore && activities.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            You've reached the beginning of the activity history
          </p>
        </div>
      )}
    </div>
  );
}