import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  CubeIcon,
  SparklesIcon,
  DocumentTextIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

// ========================================
// TYPES
// ========================================

type EmptyStateType = 'no-variants' | 'no-templates' | 'no-analytics' | 'no-search-results';

interface VariantEmptyStateProps {
  type: EmptyStateType;
  onAction?: () => void;
  searchQuery?: string;
}

// ========================================
// EMPTY STATE CONFIGS
// ========================================

const emptyStateConfigs = {
  'no-variants': {
    icon: CubeIcon,
    title: 'No Variants Yet',
    description: 'Create product variants to offer different options like size, color, or material.',
    actionLabel: 'Create Variants',
    tips: [
      'Use the matrix builder for quick creation',
      'Apply a template to get started faster',
      'Import variants from CSV/Excel file',
    ],
  },
  'no-templates': {
    icon: DocumentTextIcon,
    title: 'No Templates Found',
    description: 'No variant templates match your search. Try different keywords or create a custom template.',
    actionLabel: 'Clear Search',
    tips: [
      'Browse system templates for common products',
      'Create custom templates for your unique needs',
      'Templates save time for repeated variant patterns',
    ],
  },
  'no-analytics': {
    icon: ChartBarIcon,
    title: 'No Analytics Data',
    description: 'Analytics data will appear here once you have sales or stock movements for your variants.',
    actionLabel: null,
    tips: [
      'Analytics update daily',
      'View performance trends over time',
      'Track top-performing variants',
    ],
  },
  'no-search-results': {
    icon: CubeIcon,
    title: 'No Variants Found',
    description: 'No variants match your search. Try different keywords or filters.',
    actionLabel: 'Clear Search',
    tips: [
      'Search by SKU, name, or attributes',
      'Use filters to narrow down results',
      'Check spelling and try again',
    ],
  },
};

// ========================================
// MAIN COMPONENT
// ========================================

export const VariantEmptyState: React.FC<VariantEmptyStateProps> = ({
  type,
  onAction,
  searchQuery,
}) => {
  const config = emptyStateConfigs[type];
  const IconComponent = config.icon;

  return (
    <Card className="border-dashed">
      <CardContent className="py-16">
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
          {/* Icon */}
          <div className="mb-4 relative">
            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl" />
            <div className="relative bg-primary/5 p-4 rounded-full">
              <IconComponent className="h-12 w-12 text-primary-600" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {config.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-6">
            {type === 'no-search-results' && searchQuery
              ? `No results for "${searchQuery}". Try different keywords.`
              : config.description}
          </p>

          {/* Action Button */}
          {config.actionLabel && onAction && (
            <Button onClick={onAction} size="lg" className="mb-8">
              <SparklesIcon className="h-4 w-4 mr-2" />
              {config.actionLabel}
            </Button>
          )}

          {/* Tips */}
          {config.tips.length > 0 && (
            <div className="w-full">
              <div className="text-xs font-medium text-muted-foreground mb-3">
                💡 Quick Tips
              </div>
              <ul className="space-y-2 text-left">
                {config.tips.map((tip, index) => (
                  <li
                    key={index}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-primary-500 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ========================================
// SPECIALIZED EMPTY STATES
// ========================================

export const NoVariantsEmptyState: React.FC<{ onCreate: () => void }> = ({ onCreate }) => (
  <VariantEmptyState type="no-variants" onAction={onCreate} />
);

export const NoTemplatesEmptyState: React.FC<{ onClearSearch: () => void }> = ({
  onClearSearch,
}) => <VariantEmptyState type="no-templates" onAction={onClearSearch} />;

export const NoAnalyticsEmptyState: React.FC = () => (
  <VariantEmptyState type="no-analytics" />
);

export const NoSearchResultsEmptyState: React.FC<{
  searchQuery: string;
  onClearSearch: () => void;
}> = ({ searchQuery, onClearSearch }) => (
  <VariantEmptyState type="no-search-results" searchQuery={searchQuery} onAction={onClearSearch} />
);