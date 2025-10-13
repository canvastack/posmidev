/**
 * CategoryMultiSelect Component
 * 
 * Multi-select category picker with hierarchical support
 * Shows selected categories as badges with primary indicator
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Tenant-scoped operations (tenantId required)
 * - Uses design tokens from index.css
 * - Fully supports dark/light mode
 * - Responsive design
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { Popover } from '@/components/ui/Popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import type { Category } from '@/types';
import { 
  ChevronDownIcon, 
  XMarkIcon, 
  CheckIcon, 
  StarIcon,
  FolderIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { cn } from '@/utils/cn';

interface CategoryMultiSelectProps {
  categories: Category[];
  selectedIds: string[];
  primaryId?: string | null;
  onChange: (selectedIds: string[], primaryId?: string | null) => void;
  onAddCategory: () => void;
  error?: string;
  disabled?: boolean;
}

export function CategoryMultiSelect({
  categories,
  selectedIds = [],
  primaryId,
  onChange,
  onAddCategory,
  error,
  disabled = false,
}: CategoryMultiSelectProps) {
  const selectedCategories = categories.filter((cat) => selectedIds.includes(cat.id));
  const primaryCategory = categories.find((cat) => cat.id === primaryId);

  const handleToggleCategory = (categoryId: string) => {
    let newSelectedIds: string[];
    let newPrimaryId = primaryId;

    if (selectedIds.includes(categoryId)) {
      // Deselecting
      newSelectedIds = selectedIds.filter((id) => id !== categoryId);
      // If removing primary, auto-select next category as primary
      if (primaryId === categoryId) {
        newPrimaryId = newSelectedIds.length > 0 ? newSelectedIds[0] : null;
      }
    } else {
      // Selecting
      newSelectedIds = [...selectedIds, categoryId];
      // First category automatically becomes primary
      if (newSelectedIds.length === 1) {
        newPrimaryId = categoryId;
      }
    }

    onChange(newSelectedIds, newPrimaryId);
  };

  const handleSetPrimary = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(categoryId)) {
      onChange(selectedIds, categoryId);
    }
  };

  const handleRemoveCategory = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelectedIds = selectedIds.filter((id) => id !== categoryId);
    let newPrimaryId = primaryId;

    // If removing primary, auto-select next category as primary
    if (primaryId === categoryId) {
      newPrimaryId = newSelectedIds.length > 0 ? newSelectedIds[0] : null;
    }

    onChange(newSelectedIds, newPrimaryId);
  };

  // Sort categories alphabetically and preserve hierarchy info
  const flatCategories = categories
    .map((cat) => ({
      ...cat,
      displayName: cat.name,
      depth: cat.depth || 0,
    }))
    .sort((a, b) => (a.full_path || a.name).localeCompare(b.full_path || b.name));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Categories</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAddCategory}
          disabled={disabled}
          className="h-8 gap-1 text-xs"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add Category
        </Button>
      </div>

      {/* Selected Categories Display */}
      <div 
        className={cn(
          'min-h-[60px] rounded-lg border border-input bg-background p-3',
          error && 'border-destructive'
        )}
      >
        {selectedCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories selected</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((cat) => (
              <Badge
                key={cat.id}
                variant={primaryId === cat.id ? 'default' : 'secondary'}
                className="gap-1 pr-1"
              >
                <button
                  type="button"
                  onClick={(e) => handleSetPrimary(cat.id, e)}
                  className="hover:opacity-70"
                  disabled={disabled}
                  title={primaryId === cat.id ? 'Primary category' : 'Set as primary'}
                >
                  {primaryId === cat.id ? (
                    <StarIconSolid className="h-3 w-3" />
                  ) : (
                    <StarIcon className="h-3 w-3" />
                  )}
                </button>
                <span className="max-w-[120px] truncate">{cat.name}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveCategory(cat.id, e)}
                    className="ml-1 rounded-full hover:bg-background/20 p-0.5"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Category Selector Popover */}
      <Popover
        trigger={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-muted-foreground"
            disabled={disabled}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add categories...
          </Button>
        }
        align="start"
      >
        <div className="w-[500px] p-0">
          <Command>
            <CommandInput placeholder="Search categories..." />
            <CommandEmpty>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <FolderIcon className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No categories found</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onAddCategory}
                  className="mt-2"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Create Category
                </Button>
              </div>
            </CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-auto">
              {flatCategories.map((cat) => {
                const isSelected = selectedIds.includes(cat.id);
                const isPrimary = primaryId === cat.id;

                return (
                  <CommandItem
                    key={cat.id}
                    value={cat.displayName}
                    onSelect={() => handleToggleCategory(cat.id)}
                    className="flex items-center gap-2 py-2.5 cursor-pointer"
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-sm border',
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-input'
                      )}
                    >
                      {isSelected && <CheckIcon className="h-3 w-3" />}
                    </div>
                    <span
                      className="flex-1"
                      style={{ paddingLeft: `${cat.depth * 16}px` }}
                    >
                      {cat.depth > 0 && '└─ '}
                      {cat.displayName}
                    </span>
                    {cat.full_path && (
                      <span className="text-xs text-muted-foreground">
                        {cat.full_path}
                      </span>
                    )}
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => handleSetPrimary(cat.id, e)}
                        title={isPrimary ? 'Primary category' : 'Set as primary'}
                        className="hover:opacity-70"
                      >
                        {isPrimary ? (
                          <StarIconSolid className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <StarIcon className="h-4 w-4 text-muted-foreground hover:text-yellow-500" />
                        )}
                      </button>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </Command>
        </div>
      </Popover>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {selectedCategories.length > 0 && primaryCategory && (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <StarIconSolid className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
          <p>
            <span className="font-medium">{primaryCategory.name}</span> is the primary category
            {selectedCategories.length > 1 && ` (+${selectedCategories.length - 1} more)`}
          </p>
        </div>
      )}
    </div>
  );
}