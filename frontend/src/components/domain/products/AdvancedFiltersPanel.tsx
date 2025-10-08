import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface AdvancedFiltersPanelProps {
  // Date range filters
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
  onCreatedFromChange: (value: string) => void;
  onCreatedToChange: (value: string) => void;
  onUpdatedFromChange: (value: string) => void;
  onUpdatedToChange: (value: string) => void;
  
  // Status multi-select
  selectedStatuses: string[];
  onStatusesChange: (statuses: string[]) => void;
  
  // Filter counts
  activeFiltersCount?: number;
}

const AVAILABLE_STATUSES = [
  { value: 'active', label: 'Active', color: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-300' },
  { value: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'draft', label: 'Draft', color: 'bg-info-100 text-info-800 dark:bg-info-900 dark:text-info-300' },
  { value: 'discontinued', label: 'Discontinued', color: 'bg-danger-100 text-danger-800 dark:bg-danger-900 dark:text-danger-300' },
];

export function AdvancedFiltersPanel({
  createdFrom,
  createdTo,
  updatedFrom,
  updatedTo,
  onCreatedFromChange,
  onCreatedToChange,
  onUpdatedFromChange,
  onUpdatedToChange,
  selectedStatuses,
  onStatusesChange,
  activeFiltersCount = 0,
}: AdvancedFiltersPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStatusToggle = (statusValue: string) => {
    if (selectedStatuses.includes(statusValue)) {
      onStatusesChange(selectedStatuses.filter(s => s !== statusValue));
    } else {
      onStatusesChange([...selectedStatuses, statusValue]);
    }
  };

  const handleClearAll = () => {
    onCreatedFromChange('');
    onCreatedToChange('');
    onUpdatedFromChange('');
    onUpdatedToChange('');
    onStatusesChange([]);
  };

  const hasActiveFilters = createdFrom || createdTo || updatedFrom || updatedTo || selectedStatuses.length > 0;

  return (
    <Card className="border-primary-200 dark:border-primary-800">
      <CardContent className="p-4">
        {/* Header Toggle Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5" />
            ) : (
              <ChevronDownIcon className="h-5 w-5" />
            )}
            <span>Advanced Filters</span>
            {activeFiltersCount > 0 && !isExpanded && (
              <Badge variant="default" className="ml-2">
                {activeFiltersCount} active
              </Badge>
            )}
          </button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-danger-600 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-900/20"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Expandable Filter Content */}
        {isExpanded && (
          <div className="mt-4 space-y-6 animate-in slide-in-from-top-2 duration-200">
            {/* Date Range Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Created Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Created Date Range
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={createdFrom}
                    onChange={(e) => onCreatedFromChange(e.target.value)}
                    placeholder="From"
                    className="flex-1"
                  />
                  <span className="text-gray-500">to</span>
                  <Input
                    type="date"
                    value={createdTo}
                    onChange={(e) => onCreatedToChange(e.target.value)}
                    placeholder="To"
                    className="flex-1"
                    min={createdFrom || undefined}
                  />
                </div>
                {(createdFrom || createdTo) && (
                  <button
                    onClick={() => {
                      onCreatedFromChange('');
                      onCreatedToChange('');
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Clear created date
                  </button>
                )}
              </div>

              {/* Updated Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Last Updated Date Range
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={updatedFrom}
                    onChange={(e) => onUpdatedFromChange(e.target.value)}
                    placeholder="From"
                    className="flex-1"
                  />
                  <span className="text-gray-500">to</span>
                  <Input
                    type="date"
                    value={updatedTo}
                    onChange={(e) => onUpdatedToChange(e.target.value)}
                    placeholder="To"
                    className="flex-1"
                    min={updatedFrom || undefined}
                  />
                </div>
                {(updatedFrom || updatedTo) && (
                  <button
                    onClick={() => {
                      onUpdatedFromChange('');
                      onUpdatedToChange('');
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Clear updated date
                  </button>
                )}
              </div>
            </div>

            {/* Status Multi-Select */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Product Status
                {selectedStatuses.length > 0 && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({selectedStatuses.length} selected)
                  </span>
                )}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {AVAILABLE_STATUSES.map((status) => (
                  <div
                    key={status.value}
                    className={`
                      flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${
                        selectedStatuses.includes(status.value)
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                    onClick={() => handleStatusToggle(status.value)}
                  >
                    <Checkbox
                      checked={selectedStatuses.includes(status.value)}
                      onChange={() => handleStatusToggle(status.value)}
                    />
                    <div className="flex-1">
                      <Badge variant="outline" className={status.color}>
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active Filters:
                  </span>
                  
                  {createdFrom && (
                    <Badge variant="secondary" className="gap-1">
                      Created from: {createdFrom}
                      <button onClick={() => onCreatedFromChange('')}>
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {createdTo && (
                    <Badge variant="secondary" className="gap-1">
                      Created to: {createdTo}
                      <button onClick={() => onCreatedToChange('')}>
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {updatedFrom && (
                    <Badge variant="secondary" className="gap-1">
                      Updated from: {updatedFrom}
                      <button onClick={() => onUpdatedFromChange('')}>
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {updatedTo && (
                    <Badge variant="secondary" className="gap-1">
                      Updated to: {updatedTo}
                      <button onClick={() => onUpdatedToChange('')}>
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {selectedStatuses.map((status) => {
                    const statusConfig = AVAILABLE_STATUSES.find(s => s.value === status);
                    return (
                      <Badge key={status} variant="secondary" className="gap-1">
                        Status: {statusConfig?.label || status}
                        <button onClick={() => handleStatusToggle(status)}>
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}