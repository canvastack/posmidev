import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ClipboardCheck,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Package,
  Calculator,
  FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { bomApi } from '@/api/bomApi';
import { useAuth } from '@/hooks/useAuth';
import { RecipeComponentsManager } from './RecipeComponentsManager';
import { RecipeFormDialog } from './RecipeFormDialog';

export function RecipeDetailPage() {
  const { recipeId } = useParams<{ recipeId: string }>();
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch recipe details
  const { data: recipe, isLoading, error } = useQuery({
    queryKey: ['recipe', tenantId, recipeId],
    queryFn: () => bomApi.recipes.getById(tenantId, recipeId!),
    enabled: !!tenantId && !!recipeId,
  });

  // Activate/Deactivate mutation
  const toggleStatusMutation = useMutation({
    mutationFn: (isActive: boolean) =>
      bomApi.recipes.update(tenantId, recipeId!, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', tenantId, recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipes', tenantId] });
      toast.success(recipe?.is_active ? 'Recipe deactivated' : 'Recipe activated');
    },
    onError: () => {
      toast.error('Failed to update recipe status');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => bomApi.recipes.delete(tenantId, recipeId!),
    onSuccess: () => {
      toast.success('Recipe deleted successfully');
      navigate('/admin/recipes');
    },
    onError: () => {
      toast.error('Failed to delete recipe');
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${recipe?.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  const handleToggleStatus = () => {
    toggleStatusMutation.mutate(!recipe?.is_active);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-muted-foreground">Loading recipe details...</p>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold text-foreground mt-4">Recipe Not Found</h2>
          <p className="text-muted-foreground mt-2">The recipe you're looking for doesn't exist.</p>
          <Button className="mt-6" onClick={() => navigate('/admin/recipes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recipes
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/recipes')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="h-8 w-8 text-primary-600" />
                  <h1 className="text-3xl font-bold text-foreground">{recipe.name}</h1>
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
                </div>
                {recipe.description && (
                  <p className="text-muted-foreground mt-1">{recipe.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleStatus}
                disabled={toggleStatusMutation.isPending}
              >
                {recipe.is_active ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          {/* Recipe Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Yield */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                  <Package className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recipe Yield</p>
                  <p className="text-lg font-semibold text-foreground">
                    {recipe.yield_quantity} {recipe.yield_unit}
                  </p>
                </div>
              </div>
            </Card>

            {/* Total Cost */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/30">
                  <Calculator className="h-5 w-5 text-success-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatCurrency(recipe.total_cost || 0)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Components Count */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/30">
                  <ClipboardCheck className="h-5 w-5 text-warning-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Materials</p>
                  <p className="text-lg font-semibold text-foreground">
                    {recipe.materials?.length || 0} component{recipe.materials?.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Instructions */}
          {recipe.notes && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-primary-600" />
                <h3 className="font-semibold text-foreground">Preparation Instructions</h3>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-muted-foreground whitespace-pre-wrap">{recipe.notes}</p>
              </div>
            </Card>
          )}

          {/* Recipe Components Manager */}
          <RecipeComponentsManager
            recipe={recipe}
            onUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ['recipe', tenantId, recipeId] });
            }}
          />
        </div>
      </div>

      {/* Edit Dialog */}
      <RecipeFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        mode="edit"
        recipe={recipe}
      />
    </div>
  );
}

export default RecipeDetailPage;