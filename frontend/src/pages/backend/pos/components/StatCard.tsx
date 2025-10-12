import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export const StatCard = ({ label, value, icon: Icon, trend, className }: StatCardProps) => {
  return (
    <div className={cn(
      "glass-card p-4 rounded-lg border hover:border-primary/30 transition-all",
      className
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">
            {label}
          </p>
          <p className="text-xl font-bold truncate">
            {value}
          </p>
        </div>
        <div className="flex-shrink-0 ml-3">
          <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
        </div>
      </div>

      {trend && (
        <div className="flex items-center gap-1 text-xs">
          <span className={cn(
            "font-medium",
            trend.value >= 0 ? "text-success-600 dark:text-success-400" : "text-danger-600 dark:text-danger-400"
          )}>
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-muted-foreground">
            {trend.label}
          </span>
        </div>
      )}
    </div>
  );
};