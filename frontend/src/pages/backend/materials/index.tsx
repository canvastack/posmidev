import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Factory, Search, Plus, Edit2, Trash2, Download, Upload, Package, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { bomApi } from '@/api/bomApi';
import type { Material, MaterialFilters } from '@/types/bom';
import { useAuth } from '@/hooks/useAuth';
import { MaterialFormDialog } from './MaterialFormDialog';
import { StockAdjustmentDialog } from './StockAdjustmentDialog';

export function MaterialsPage() {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();

  // Validasi tenantId
  if (!tenantId) {
    console.error('❌ MaterialsPage Error: tenantId is null or undefined!');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Authentication Error</h2>
          <p className="text-muted-foreground">Unable to determine tenant. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const perPage = 15;

  // Form Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  // Stock Adjustment Dialog State
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockAdjustMaterial, setStockAdjustMaterial] = useState<Material | null>(null);

  // Build filters object
  const filters: MaterialFilters = {
    per_page: perPage,
    page,
    ...(searchTerm && { search: searchTerm }),
    ...(categoryFilter && categoryFilter !== 'all' && { category: categoryFilter }),
    ...(statusFilter && statusFilter !== 'all' && { status: statusFilter as 'low_stock' | 'out_of_stock' | 'normal' }),
  };

  // Fetch materials
  const { data, isLoading, error } = useQuery({
    queryKey: ['materials', tenantId, filters],
    queryFn: () => bomApi.materials.getAll(tenantId, filters),
    enabled: !!tenantId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bomApi.materials.delete(tenantId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', tenantId] });
      toast.success('Material deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete material');
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = () => {
    setDialogMode('create');
    setSelectedMaterial(null);
    setDialogOpen(true);
  };

  const handleEdit = (material: Material) => {
    setDialogMode('edit');
    setSelectedMaterial(material);
    setDialogOpen(true);
  };

  const handleAdjustStock = (material: Material) => {
    setStockAdjustMaterial(material);
    setStockDialogOpen(true);
  };

  const getStockStatusBadge = (material: Material) => {
    if (material.stock_quantity <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (material.reorder_level && material.stock_quantity <= material.reorder_level) {
      return <Badge variant="destructive">Critical</Badge>;
    }
    if (material.reorder_level && material.stock_quantity <= material.reorder_level) {
      return <Badge className="bg-warning-500 text-white">Low Stock</Badge>;
    }
    return <Badge className="bg-success-500 text-white">Normal</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Factory className="h-8 w-8 text-primary-600" />
                Materials Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage raw materials and track inventory levels
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button size="sm" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Material
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, SKU, or supplier..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <Select
                value={categoryFilter}
                onValueChange={(value) => {
                  setCategoryFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Raw Material">Raw Material</SelectItem>
                  <SelectItem value="Packaging">Packaging</SelectItem>
                  <SelectItem value="Ingredient">Ingredient</SelectItem>
                  <SelectItem value="Supplies">Supplies</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="normal">Normal Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="out">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Materials Table */}
          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                <p className="mt-4 text-muted-foreground">Loading materials...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
                <p className="mt-4 text-destructive font-medium">Failed to load materials</p>
                <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
              </div>
            ) : !data?.data || data.data.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                <p className="mt-4 text-foreground font-medium">No materials found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchTerm || categoryFilter || statusFilter
                    ? 'Try adjusting your filters'
                    : 'Create your first material to get started'}
                </p>
                <Button size="sm" className="mt-4" onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Material
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">SKU</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Category</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm">Current Stock</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm">Min Level</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm">Unit Cost</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm">Status</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.data.map((material) => (
                        <tr
                          key={material.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium text-foreground">{material.name}</div>
                            {material.supplier && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {material.supplier}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {material.sku || '—'}
                            </code>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-muted-foreground">
                              {material.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono text-sm">
                              {(material.stock_quantity ?? 0).toFixed(2)} {material.unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono text-sm text-muted-foreground">
                              {material.reorder_level ? `${(material.reorder_level ?? 0).toFixed(2)} ${material.unit}` : '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono text-sm">
                              {formatCurrency(material.unit_cost)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {getStockStatusBadge(material)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAdjustStock(material)}
                                title="Adjust stock"
                              >
                                <RefreshCw className="h-4 w-4 text-primary-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(material)}
                                title="Edit material"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(material.id, material.name)}
                                disabled={deleteMutation.isPending}
                                title="Delete material"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {/* Pagination */}
                {data.meta && data.meta.last_page > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-4 py-3">
                    <div className="text-sm text-muted-foreground">
                      Showing {data.meta.from} to {data.meta.to} of {data.meta.total} materials
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={data.meta.current_page === 1}
                        onClick={() => setPage(data.meta.current_page - 1)}
                      >
                        Previous
                      </Button>
                      <span className="px-4 py-2 text-sm">
                        Page {data.meta.current_page} of {data.meta.last_page}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={data.meta.current_page === data.meta.last_page}
                        onClick={() => setPage(data.meta.current_page + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Material Form Dialog */}
      <MaterialFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        material={selectedMaterial}
        mode={dialogMode}
      />

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        open={stockDialogOpen}
        onOpenChange={setStockDialogOpen}
        material={stockAdjustMaterial}
      />
    </div>
  );
}

export default MaterialsPage;