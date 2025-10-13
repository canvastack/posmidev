/**
 * StatusSelect Component
 * 
 * Modern shadcn/ui Select for Product Status
 * Used in Product Edit Page - matches Materials page design pattern
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Uses design tokens from index.css (no hardcoded colors)
 * - Fully supports dark/light mode
 * - Responsive design
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

interface StatusSelectProps {
  value?: 'active' | 'draft' | 'inactive' | 'discontinued';
  onChange: (value: 'active' | 'draft' | 'inactive' | 'discontinued') => void;
  error?: string;
  disabled?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', description: 'Product is visible and available for sale' },
  { value: 'draft', label: 'Draft', description: 'Product is being prepared (not visible to customers)' },
  { value: 'inactive', label: 'Inactive', description: 'Product is temporarily unavailable' },
  { value: 'discontinued', label: 'Discontinued', description: 'Product is no longer sold' },
] as const;

export function StatusSelect({ value = 'active', onChange, error, disabled }: StatusSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="status">Status</Label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger
          id="status"
          className={error ? 'border-destructive' : ''}
        >
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex flex-col">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}