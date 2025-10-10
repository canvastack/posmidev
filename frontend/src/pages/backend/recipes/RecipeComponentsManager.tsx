import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Package, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';
import { bomApi } from '@/api/bomApi';
import type { Recipe, Material, RecipeMaterial } from '@/types/bom';
import { useAuth } from '@/hooks/useAuth';

interface RecipeComponentsManagerProps {
  recipe: Recipe;
  onUpdate?: () => void;
}

interface NewComponent {
  material_id: string;
  quantity: number;
  notes?: string;
}

export function RecipeComponentsManager({ recipe, onUpdate }: RecipeComponentsManagerProps) {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newComponent, setNewComponent] = useState<NewComponent>({
    material_id: '',
    quantity: 0,
    notes: '',
  });

  // Fetch all materials for selection
  const { data: materialsData } = useQuery({
    queryKey: ['materials', tenantId, { per_page: 1000 }],
    queryFn: () => bomApi.materials.getAll(tenantId, { per_page: 1000 }),
    enabled: !!tenantId,
  });

  const materials = materialsData?.data || [];

  // Get recipe details with materials
  const { data: recipeData, isLoading } = useQuery({
    queryKey: ['recipe', tenantId, recipe.id],
    queryFn: () => bomApi.recipes.getById(tenantId, recipe.id),
    enabled: !!tenantId && !!recipe.id,
  });

  const recipeComponents = recipeData?.materials || [];
  const totalCost = recipeData?.total_cost || 0;

  // Add material mutation
  const addMaterialMutation = useMutation({
    mutationFn: (data: { material_id: string; quantity: number; notes?: string }) =>
      bomApi.recipes.addMaterial(tenantId, recipe.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', tenantId, recipe.id] });
      queryClient.invalidateQueries({ queryKey: ['recipes', tenantId] });
      toast.success('Material added to recipe');
      setNewComponent({ material_id: '', quantity: 0, notes: '' });
      setShowAddForm(false);
      onUpdate?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to add material');
    },
  });

  // Update material mutation
  const updateMaterialMutation = useMutation({
    mutationFn: ({ materialId, quantity, notes }: { materialId: string; quantity: number; notes?: string }) =>
      bomApi.recipes.updateMaterial(tenantId, recipe.id, materialId, { quantity, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', tenantId, recipe.id] });
      queryClient.invalidateQueries({ queryKey: ['recipes', tenantId] });
      toast.success('Material updated');
      onUpdate?.();
    },
    onError: () => {
      toast.error('Failed to update material');
    },
  });

  // Remove material mutation
  const removeMaterialMutation = useMutation({
    mutationFn: (materialId: string) =>
      bomApi.recipes.removeMaterial(tenantId, recipe.id, materialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', tenantId, recipe.id] });
      queryClient.invalidateQueries({ queryKey: ['recipes', tenantId] });
      toast.success('Material removed from recipe');
      onUpdate?.();
    },
    onError: () => {
      toast.error('Failed to remove material');
    },
  });

  const handleAddMaterial = () => {
    if (!newComponent.material_id || newComponent.quantity <= 0) {
      toast.error('Please select a material and enter valid quantity');
      return;
    }
    addMaterialMutation.mutate(newComponent);
  };

  const handleRemoveMaterial = (materialId: string, materialName: string) => {
    if (window.confirm(`Remove "${materialName}" from this recipe?`)) {
      removeMaterialMutation.mutate(materialId);
    }
  };

  const handleQuantityChange = (materialId: string, newQuantity: number, notes?: string) => {
    if (newQuantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }
    updateMaterialMutation.mutate({ materialId, quantity: newQuantity, notes });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const calculateComponentCost = (quantity: number, unitCost: number) => {
    return quantity * unitCost;
  };

  // Get available materials (not already in recipe)
  const availableMaterials = materials.filter(
    (m) => !recipeComponents.some((rc: RecipeMaterial) => rc.material_id === m.id)
  );

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-muted-foreground">Loading components...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Total Cost */}
      <Card className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calculator className="h-6 w-6 text-primary-600" />
            <div>
              <h3 className="font-semibold text-foreground">Recipe Components</h3>
              <p className="text-sm text-muted-foreground">
                {recipeComponents.length} material{recipeComponents.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Recipe Cost</p>
            <p className="text-2xl font-bold text-primary-600">{formatCurrency(totalCost)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cost per {recipe.yield_quantity} {recipe.yield_unit}
            </p>
          </div>
        </div>
      </Card>

      {/* Components List */}
      {recipeComponents.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Material</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Quantity</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Unit Cost</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Total Cost</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Stock Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recipeComponents.map((component: RecipeMaterial) => {
                  const material = component.material;
                  const componentCost = calculateComponentCost(component.quantity, material?.unit_cost || 0);
                  const hasStock = (material?.stock_quantity || 0) >= component.quantity;

                  return (
                    <tr key={component.material_id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-foreground">{material?.name}</div>
                            {material?.sku && (
                              <code className="text-xs text-muted-foreground">{material.sku}</code>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          defaultValue={component.quantity}
                          onBlur={(e) => {
                            const newValue = parseFloat(e.target.value);
                            if (newValue !== component.quantity && newValue > 0) {
                              handleQuantityChange(component.material_id, newValue, component.notes);
                            }
                          }}
                          className="w-24 text-right font-mono"
                        />
                        <span className="text-xs text-muted-foreground ml-1">{material?.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm">
                        {formatCurrency(material?.unit_cost || 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm font-semibold">
                        {formatCurrency(componentCost)}
                      </td>
                      <td className="py-3 px-4">
                        {hasStock ? (
                          <Badge className="bg-success-500 text-white">
                            {material?.stock_quantity?.toFixed(2)} {material?.unit} available
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            Low Stock ({material?.stock_quantity?.toFixed(2)} {material?.unit})
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMaterial(component.material_id, material?.name || 'Material')}
                          disabled={removeMaterialMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card>
      ) : (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
          <p className="mt-4 text-foreground font-medium">No materials added yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add materials to this recipe to start tracking costs
          </p>
        </Card>
      )}

      {/* Add Material Form */}
      {showAddForm ? (
        <Card className="p-4 border-2 border-primary-300 dark:border-primary-700">
          <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Material to Recipe
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5">
              <Label htmlFor="material">Material *</Label>
              <Select
                value={newComponent.material_id}
                onValueChange={(value) => setNewComponent({ ...newComponent, material_id: value })}
              >
                <SelectTrigger id="material">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent>
                  {availableMaterials.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      All materials already added
                    </SelectItem>
                  ) : (
                    availableMaterials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name} - {formatCurrency(material.unit_cost)}/{material.unit}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0.01"
                value={newComponent.quantity || ''}
                onChange={(e) =>
                  setNewComponent({ ...newComponent, quantity: parseFloat(e.target.value) || 0 })
                }
                placeholder="0.00"
              />
            </div>
            <div className="md:col-span-4 flex items-end gap-2">
              <Button
                onClick={handleAddMaterial}
                disabled={addMaterialMutation.isPending || !newComponent.material_id || newComponent.quantity <= 0}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Material
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewComponent({ material_id: '', quantity: 0, notes: '' });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowAddForm(true)}
          disabled={availableMaterials.length === 0}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Material to Recipe
        </Button>
      )}
    </div>
  );
}