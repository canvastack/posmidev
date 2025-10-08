import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { BookmarkIcon, PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { useSavedViews, type SavedView } from '@/hooks/useSavedViews';
import { useToast } from '@/hooks/use-toast';

interface SavedViewsDropdownProps {
  currentFilters: SavedView['filters'];
  onApplyView: (filters: SavedView['filters']) => void;
}

export function SavedViewsDropdown({ currentFilters, onApplyView }: SavedViewsDropdownProps) {
  const { views, saveView, deleteView } = useSavedViews();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [savingView, setSavingView] = useState(false);

  const hasActiveFilters = Object.values(currentFilters).some(value => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== '' && value !== undefined && value !== 'all';
  });

  const handleSaveView = async () => {
    if (!viewName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a view name',
        variant: 'destructive',
      });
      return;
    }

    if (!hasActiveFilters) {
      toast({
        title: 'Error',
        description: 'No active filters to save',
        variant: 'destructive',
      });
      return;
    }

    setSavingView(true);
    try {
      saveView(viewName.trim(), currentFilters);
      toast({
        title: 'Success',
        description: `View "${viewName}" saved successfully`,
      });
      setViewName('');
      setSaveModalOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save view',
        variant: 'destructive',
      });
    } finally {
      setSavingView(false);
    }
  };

  const handleApplyView = (view: SavedView) => {
    onApplyView(view.filters);
    setIsOpen(false);
    toast({
      title: 'View Applied',
      description: `Filters from "${view.name}" have been applied`,
    });
  };

  const handleDeleteView = (e: React.MouseEvent, viewId: string, viewName: string) => {
    e.stopPropagation();
    if (confirm(`Delete view "${viewName}"?`)) {
      deleteView(viewId);
      toast({
        title: 'View Deleted',
        description: `"${viewName}" has been removed`,
      });
    }
  };

  const getFilterSummary = (filters: SavedView['filters']) => {
    const parts: string[] = [];
    if (filters.search) parts.push(`Search: "${filters.search}"`);
    if (filters.category && filters.category !== 'all') parts.push('Category');
    if (filters.stockFilter && filters.stockFilter !== 'all') parts.push('Stock');
    if (filters.minPrice || filters.maxPrice) parts.push('Price Range');
    if (filters.createdFrom || filters.createdTo) parts.push('Created Date');
    if (filters.updatedFrom || filters.updatedTo) parts.push('Updated Date');
    if (filters.statuses && filters.statuses.length > 0) parts.push(`Status (${filters.statuses.length})`);
    
    return parts.length > 0 ? parts.join(' • ') : 'No filters';
  };

  return (
    <div className="relative">
      {/* Dropdown Button */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="relative"
        >
          <BookmarkIcon className="h-4 w-4 mr-2" />
          Saved Views
          {views.length > 0 && (
            <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
              {views.length}
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={() => setSaveModalOpen(true)}
            title="Save Current Filters"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Save Current
          </Button>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
            {views.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <BookmarkIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium mb-1">No Saved Views</p>
                <p className="text-xs">Apply filters and click "Save Current" to create a view</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {views.map((view) => (
                  <div
                    key={view.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
                    onClick={() => handleApplyView(view)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <BookmarkSolidIcon className="h-4 w-4 text-primary-600 flex-shrink-0" />
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {view.name}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          {getFilterSummary(view.filters)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Created {new Date(view.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteView(e, view.id, view.name)}
                          title="Delete View"
                          className="h-8 w-8 p-0"
                        >
                          <TrashIcon className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Save View Modal */}
      <Modal
        isOpen={saveModalOpen}
        onClose={() => {
          setSaveModalOpen(false);
          setViewName('');
        }}
        title="Save Current View"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="e.g., Low Stock Items, Active Products"
              maxLength={50}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              {viewName.length}/50 characters
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filters to be saved:
            </p>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              {getFilterSummary(currentFilters)}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSaveModalOpen(false);
                setViewName('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveView}
              loading={savingView}
              className="flex-1"
            >
              Save View
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}