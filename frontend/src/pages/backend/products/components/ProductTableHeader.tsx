import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Checkbox } from '@/components/ui/Checkbox';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface ProductTableHeaderProps {
  isColumnVisible: (column: string) => boolean;
  isAllSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
}

export const ProductTableHeader: React.FC<ProductTableHeaderProps> = ({
  isColumnVisible,
  isAllSelected,
  onSelectAll,
  sortBy,
  sortOrder,
  onSort,
}) => {
  const SortableHeader: React.FC<{ column: string; label: string }> = ({ column, label }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortBy === column && (
          sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );

  return (
    <TableHeader>
      <TableRow>
        {isColumnVisible('checkbox') && (
          <TableHead className="w-12">
            <Checkbox
              checked={isAllSelected}
              onChange={(e) => onSelectAll(e.target.checked)}
            />
          </TableHead>
        )}
        {isColumnVisible('image') && <TableHead>Image</TableHead>}
        {isColumnVisible('name') && <SortableHeader column="name" label="Name" />}
        {isColumnVisible('sku') && <SortableHeader column="sku" label="SKU" />}
        {isColumnVisible('category') && <TableHead>Category</TableHead>}
        {isColumnVisible('price') && <SortableHeader column="price" label="Price" />}
        {isColumnVisible('cost_price') && <TableHead>Cost</TableHead>}
        {isColumnVisible('profit_margin') && <TableHead>Margin</TableHead>}
        {isColumnVisible('stock') && <SortableHeader column="stock" label="Stock" />}
        {isColumnVisible('status') && <TableHead>Status</TableHead>}
        {isColumnVisible('created_at') && <TableHead>Created</TableHead>}
        {isColumnVisible('updated_at') && <TableHead>Updated</TableHead>}
        {/* Phase 9: Additional Business Features Columns */}
        {isColumnVisible('supplier') && <TableHead>Supplier</TableHead>}
        {isColumnVisible('uom') && <TableHead>UOM</TableHead>}
        {isColumnVisible('tags') && <TableHead>Tags</TableHead>}
        {isColumnVisible('tax_rate') && <TableHead>Tax</TableHead>}
        {isColumnVisible('actions') && <TableHead>Actions</TableHead>}
      </TableRow>
    </TableHeader>
  );
};