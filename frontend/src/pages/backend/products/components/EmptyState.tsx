import React from 'react';
import { Button } from '@/components/ui/button';
import { ArchiveBoxIcon, PlusIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
  isEmpty: boolean;
  onAddClick: () => void;
  canCreate: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ isEmpty, onAddClick, canCreate }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <ArchiveBoxIcon className="h-16 w-16 text-muted-foreground/60 mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {isEmpty ? 'No products found' : 'No matching products'}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
        {isEmpty
          ? 'Get started by creating your first product.'
          : 'Try adjusting your search or filter criteria to find what you\'re looking for.'}
      </p>
      {isEmpty && canCreate && (
        <Button onClick={onAddClick}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Your First Product
        </Button>
      )}
    </div>
  );
};