/**
 * Phase 9: Supplier Management Page
 * Full CRUD interface for managing suppliers
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Tenant-scoped operations (tenantId required)
 * - Permission checks for CRUD operations
 * - Uses design tokens from index.css
 * - Fully supports dark/light mode
 * - Responsive design
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { supplierApi, type Supplier } from '@/api/supplierApi';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  BuildingStorefrontIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon,
  MapPinIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { SupplierFormDialog } from './SupplierFormDialog';

export default function SuppliersPage() {
  const { tenantId } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  // Permissions
  const canCreate = hasPermission('suppliers.create');
  const canUpdate = hasPermission('suppliers.update');
  const canDelete = hasPermission('suppliers.delete');

  // State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSuppliers, setTotalSuppliers] = useState(0);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 500);

  // Fetch suppliers
  useEffect(() => {
    fetchSuppliers();
  }, [tenantId, debouncedSearch, statusFilter, currentPage]);

  const fetchSuppliers = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const response = await supplierApi.getSuppliers(tenantId, {
        page: currentPage,
        per_page: 20,
        search: debouncedSearch || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sort_by: 'name',
        sort_order: 'asc',
      });

      setSuppliers(response.data);
      setTotalPages(response.last_page);
      setTotalSuppliers(response.total);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load suppliers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setModalOpen(true);
  };

  const handleFormSuccess = () => {
    toast({
      title: 'Success',
      description: editingSupplier ? 'Supplier updated successfully' : 'Supplier created successfully',
    });
    fetchSuppliers();
  };

  const handleDelete = async () => {
    if (!tenantId || !supplierToDelete) return;

    try {
      await supplierApi.deleteSupplier(tenantId, supplierToDelete.id);
      toast({
        title: 'Success',
        description: 'Supplier deleted successfully',
      });
      setDeleteConfirmOpen(false);
      setSupplierToDelete(null);
      fetchSuppliers();
    } catch (error: any) {
      console.error('Failed to delete supplier:', error);
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Failed to delete supplier. Make sure no products are assigned to this supplier.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your product suppliers
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleOpenCreate}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {totalSuppliers} Supplier{totalSuppliers !== 1 && 's'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading suppliers...</p>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-12">
              <BuildingStorefrontIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">No suppliers found</p>
              {canCreate && (
                <Button onClick={handleOpenCreate} className="mt-4">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Your First Supplier
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-6 px-6">
                <div className="inline-block min-w-full align-middle">
                  <div className="overflow-hidden">
                    <Table className="min-w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Supplier</TableHead>
                          <TableHead className="whitespace-nowrap">Contact</TableHead>
                          <TableHead className="whitespace-nowrap">Status</TableHead>
                          <TableHead className="whitespace-nowrap">Products</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suppliers.map((supplier) => (
                          <TableRow key={supplier.id}>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-3 min-w-[200px]">
                                {/* Image Thumbnail */}
                                {supplier.image_thumb_url || supplier.image_url ? (
                                  <img
                                    src={supplier.image_thumb_url || supplier.image_url || ''}
                                    alt={supplier.name}
                                    className="w-10 h-10 rounded-md object-cover flex-shrink-0 border border-border"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                                    <BuildingStorefrontIcon className="w-5 h-5 text-muted-foreground" />
                                  </div>
                                )}
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium truncate">{supplier.name}</p>
                                    {supplier.has_location && (
                                      <MapPinIcon className="w-4 h-4 text-primary flex-shrink-0" title="Has location" />
                                    )}
                                  </div>
                                  {supplier.address && (
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                      {supplier.address}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="space-y-1 text-sm min-w-[180px]">
                                {supplier.contact_person && (
                                  <div className="flex items-center gap-2">
                                    <UserIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="truncate">{supplier.contact_person}</span>
                                  </div>
                                )}
                                {supplier.phone && (
                                  <div className="flex items-center gap-2">
                                    <PhoneIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="truncate">{supplier.phone}</span>
                                  </div>
                                )}
                                {supplier.email && (
                                  <div className="flex items-center gap-2">
                                    <EnvelopeIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="truncate">{supplier.email}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge
                                variant={supplier.status === 'active' ? 'default' : 'secondary'}
                              >
                                {supplier.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className="text-sm text-muted-foreground">
                                {supplier.products_count || 0} products
                              </span>
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <div className="flex justify-end gap-2 min-w-[120px]">
                                {canUpdate && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEdit(supplier)}
                                  >
                                    <PencilIcon className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSupplierToDelete(supplier);
                                      setDeleteConfirmOpen(true);
                                    }}
                                  >
                                    <TrashIcon className="h-4 w-4 text-danger-600" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal with Enhancement (Image & Location) */}
      <SupplierFormDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tenantId={tenantId || ''}
        supplier={editingSupplier}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Supplier</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{supplierToDelete?.name}</strong>?
            This action cannot be undone. You can only delete suppliers with no assigned products.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setSupplierToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}