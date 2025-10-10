import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardCheck, Search, Plus, Edit2, Trash2, Eye, CheckCircle, XCircle, List } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { bomApi } from '@/api/bomApi';
import type { Recipe } from '@/types/bom';
import { useAuth } from '@/hooks/useAuth';
import { RecipeFormDialog } from './RecipeFormDialog';

export function RecipesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = user?.tenant_id || '';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const perPage = 15;

  // Form Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Build filters object
  const filters: any = {
    per_page: perPage,
    page,
  };
  if (searchTerm) filters.search = searchTerm;
  if (statusFilter && statusFilter !== 'all') {
    filters.is_active = statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined;
  }

  // Fetch recipes
  const { data, isLoading, error } = useQuery({
    queryKey: ['recipes', tenantId, filters],
    queryFn: () => bomApi.recipes.getAll(tenantId, filters),
    enabled: !!tenantId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bomApi.recipes.delete(tenantId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', tenantId] });
      toast.success('Recipe deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete recipe');
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => bomApi.recipes.activate(tenantId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', tenantId] });
      toast.success('Recipe activated successfully');
    },
    onError: () => {
      toast.error('Failed to activate recipe');
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete recipe "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = () => {
    setDialogMode('create');
    setSelectedRecipe(null);
    setDialogOpen(true);
  };

  const handleEdit = (recipe: Recipe) => {
    setDialogMode('edit');
    setSelectedRecipe(recipe);
    setDialogOpen(true);
  };

  const handleActivate = (recipe: Recipe) => {
    if (recipe.is_active) {
      toast.info('Recipe is already active');
      return;
    }
    if (window.confirm(`Activate recipe "${recipe.name}" for product?`)) {
      activateMutation.mutate(recipe.id);
    }
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
                <ClipboardCheck className="h-8 w-8 text-primary-600" />
                Recipe Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Define product recipes and bill of materials
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Recipe
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="md:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by recipe name or product name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>

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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Recipes Table */}
          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                <p className="mt-4 text-muted-foreground">Loading recipes...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <XCircle className="h-12 w-12 text-destructive mx-auto" />
                <p className="mt-4 text-destructive font-medium">Failed to load recipes</p>
                <p className="text-sm text-muted-foreground mt-1">Please try again later</p>
              </div>
            ) : !data?.data || data.data.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                <p className="mt-4 text-foreground font-medium">No recipes found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchTerm || statusFilter
                    ? 'Try adjusting your filters'
                    : 'Create your first recipe to get started'}
                </p>
                <Button size="sm" className="mt-4" onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Recipe
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Recipe Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Product</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm">Yield Qty</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm">Components</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm">Total Cost</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm">Status</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.data.map((recipe) => (
                        <tr
                          key={recipe.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium text-foreground">{recipe.name}</div>
                            {recipe.description && (
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                {recipe.description}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-muted-foreground">
                              {recipe.product?.name || '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono text-sm">
                              {(recipe.yield_quantity ?? 0).toFixed(2)} {recipe.yield_unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge variant="secondary" className="font-mono">
                              {recipe.materials?.length || 0}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono text-sm">
                              {recipe.total_cost ? formatCurrency(recipe.total_cost ?? 0) : '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {recipe.is_active ? (
                              <Badge className="bg-success-500 text-white">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/admin/recipes/${recipe.id}`)}
                                title="View details & manage components"
                              >
                                <Eye className="h-4 w-4 text-primary-600" />
                              </Button>
                              {!recipe.is_active && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleActivate(recipe)}
                                  disabled={activateMutation.isPending}
                                  title="Activate recipe"
                                >
                                  <CheckCircle className="h-4 w-4 text-success-600" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(recipe)}
                                title="Edit recipe"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(recipe.id, recipe.name)}
                                disabled={deleteMutation.isPending}
                                title="Delete recipe"
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
                      Showing {data.meta.from} to {data.meta.to} of {data.meta.total} recipes
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

      {/* Recipe Form Dialog */}
      <RecipeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recipe={selectedRecipe}
        mode={dialogMode}
      />
    </div>
  );
}

export default RecipesPage;