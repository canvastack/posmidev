import { Trash2, Edit, Tag, DollarSign, X, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BulkActionToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
  onUpdateStatus: () => void;
  onUpdateCategory: () => void;
  onUpdatePrice: () => void;
  onPrintBarcodes: () => void;
  canDelete: boolean;
  canUpdate: boolean;
  canView: boolean;
  className?: string;
}

export function BulkActionToolbar({
  selectedCount,
  onClearSelection,
  onDelete,
  onUpdateStatus,
  onUpdateCategory,
  onUpdatePrice,
  onPrintBarcodes,
  canDelete,
  canUpdate,
  canView,
  className,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg',
        'px-6 py-4 flex items-center gap-4 transition-all duration-200',
        'animate-in slide-in-from-bottom-5',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        {canView && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPrintBarcodes}
            className="gap-2"
          >
            <QrCode className="h-4 w-4" />
            Print Barcodes
          </Button>
        )}
        {canUpdate && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onUpdateStatus}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Status
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onUpdateCategory}
              className="gap-2"
            >
              <Tag className="h-4 w-4" />
              Category
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onUpdatePrice}
              className="gap-2"
            >
              <DollarSign className="h-4 w-4" />
              Price
            </Button>
          </>
        )}
        {canDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}