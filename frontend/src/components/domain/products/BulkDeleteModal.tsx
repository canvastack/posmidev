import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { productApi } from '@/api/productApi';
import { toast } from 'sonner';

interface BulkDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  productIds: string[];
  selectedCount: number;
  onSuccess: () => void;
}

export function BulkDeleteModal({
  open,
  onOpenChange,
  tenantId,
  productIds,
  selectedCount,
  onSuccess,
}: BulkDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await productApi.bulkDelete(tenantId, productIds);
      
      if (result.errors > 0) {
        toast.warning(`Deleted ${result.success} products. ${result.errors} failed.`);
      } else {
        toast.success(`Successfully deleted ${result.success} product${result.success > 1 ? 's' : ''}`);
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete products');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Delete Products</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Are you sure you want to delete {selectedCount} product{selectedCount > 1 ? 's' : ''}?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}