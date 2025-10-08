/**
 * Phase 9: Product Tags Multi-Select Component
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Tenant-scoped tag fetching
 * - Uses design tokens from index.css
 * - Fully supports dark/light mode
 * - Responsive design
 */

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { productTagApi, type ProductTag } from '@/api/productTagApi';
import { useAuth } from '@/hooks/useAuth';
import { XMarkIcon, PlusIcon, TagIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Popover } from '@/components/ui/Popover';

interface TagMultiSelectProps {
  value: string[]; // Array of tag IDs
  onChange: (value: string[]) => void;
  error?: string;
  disabled?: boolean;
  showCreateButton?: boolean;
}

export function TagMultiSelect({ 
  value, 
  onChange, 
  error, 
  disabled,
  showCreateButton = true 
}: TagMultiSelectProps) {
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTags();
  }, [tenantId]);

  const fetchTags = async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      const response = await productTagApi.getTags(tenantId, {
        per_page: 1000, // Get all tags
      });
      setTags(response.data);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTags = (tags || []).filter(tag => (value || []).includes(tag.id));
  const availableTags = (tags || []).filter(tag => !(value || []).includes(tag.id));

  const handleSelectTag = (tagId: string) => {
    const currentValue = value || [];
    if (!currentValue.includes(tagId)) {
      onChange([...currentValue, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    const currentValue = value || [];
    onChange(currentValue.filter(id => id !== tagId));
  };

  const handleCreateTag = () => {
    navigate('/admin/product-tags?action=create');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Product Tags</Label>
        {showCreateButton && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCreateTag}
            className="h-auto py-1 text-xs"
          >
            <PlusIcon className="mr-1 h-3 w-3" />
            Create Tag
          </Button>
        )}
      </div>

      {/* Selected Tags Display */}
      <div className="min-h-[60px] rounded-lg border border-border bg-background p-3">
        {selectedTags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags selected</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag) => (
              <Badge
                key={tag.id}
                style={{ 
                  backgroundColor: `${tag.color}20`,
                  borderColor: tag.color,
                  color: tag.color
                }}
                className="border"
              >
                <TagIcon className="mr-1 h-3 w-3" />
                {tag.name}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag.id)}
                    className="ml-1 hover:opacity-70"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Tag Selector Popover */}
      <Popover
        trigger={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-muted-foreground"
            disabled={disabled || loading}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            {loading ? 'Loading tags...' : 'Add tags...'}
          </Button>
        }
        align="start"
      >
        <div className="w-[400px] p-0">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-auto">
              {availableTags.map((tag) => (
                <CommandItem
                  key={tag.id}
                  onSelect={() => handleSelectTag(tag.id)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span>{tag.name}</span>
                    {tag.usage_count !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        ({tag.usage_count} products)
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </div>
      </Popover>

      {error && (
        <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
      )}
      
      <p className="text-xs text-muted-foreground">
        Add tags to categorize and organize your products
      </p>
    </div>
  );
}