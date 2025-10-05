import React from 'react';
import { format } from 'date-fns';
import { Clock, User, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { ActivityLog } from '@/types/history';

interface ProductHistoryTimelineProps {
  activities: ActivityLog[];
  loading?: boolean;
}

export function ProductHistoryTimeline({ activities, loading }: ProductHistoryTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4 animate-pulse">
            <div className="w-10 h-10 bg-muted rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No activity history found</p>
      </div>
    );
  }

  const getEventColor = (description: string) => {
    switch (description.toLowerCase()) {
      case 'created':
        return 'bg-green-500';
      case 'updated':
        return 'bg-blue-500';
      case 'deleted':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEventLabel = (description: string) => {
    switch (description.toLowerCase()) {
      case 'created':
        return 'Created';
      case 'updated':
        return 'Updated';
      case 'deleted':
        return 'Deleted';
      default:
        return description;
    }
  };

  return (
    <div className="space-y-6">
      {activities.map((activity, index) => {
        const isLast = index === activities.length - 1;
        
        return (
          <div key={activity.id} className="relative flex gap-4">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border" />
            )}
            
            {/* Icon */}
            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center ${getEventColor(activity.description)}`}>
              <Activity className="h-5 w-5 text-white" />
            </div>
            
            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <Badge variant="outline" className="mb-2">
                    {getEventLabel(activity.description)}
                  </Badge>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{activity.causer?.name || 'System'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              </div>
              
              {/* Changes */}
              {activity.properties && (
                <div className="mt-3 space-y-2">
                  {activity.properties.old && activity.properties.attributes && (
                    <div className="bg-muted/50 rounded-md p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Changes:</p>
                      {Object.keys(activity.properties.attributes).map((key) => {
                        const oldValue = activity.properties.old?.[key];
                        const newValue = activity.properties.attributes?.[key];
                        
                        if (oldValue === newValue) return null;
                        
                        return (
                          <div key={key} className="text-sm">
                            <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-red-600 line-through">{String(oldValue ?? 'N/A')}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-green-600 font-medium">{String(newValue ?? 'N/A')}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  {!activity.properties.old && activity.properties.attributes && (
                    <div className="bg-muted/50 rounded-md p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Initial values:</p>
                      <div className="text-sm space-y-1">
                        {Object.entries(activity.properties.attributes).slice(0, 5).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                            <span className="text-muted-foreground">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}