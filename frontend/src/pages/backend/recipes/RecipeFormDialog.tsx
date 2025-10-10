import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { MultiStepFormWrapper, type TabConfig } from '@/components/forms/MultiStepFormWrapper';
import { bomApi } from '@/api/bomApi';
import { productApi } from '@/api/productApi';
import type { Recipe, RecipeCreateRequest, RecipeUpdateRequest, RecipeYieldUnit } from '@/types/bom';
import { useAuth } from '@/hooks/useAuth';

interface RecipeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: Recipe | null;
  mode: 'create' | 'edit';
}

interface FormData {
  name: string;
  description?: string;
  product_id: string;
  yield_quantity: number;
  yield_unit: string;
  instructions?: string;
}

const UNIT_OPTIONS = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'L', label: 'Liter (L)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'box', label: 'Box' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'can', label: 'Can' },
  { value: 'bag', label: 'Bag' },
];

export function RecipeFormDialog({ open, onOpenChange, recipe, mode }: RecipeFormDialogProps) {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      product_id: 'none',
      yield_quantity: 1,
      yield_unit: 'pcs',
      instructions: '',
    },
  });

  const { register, formState: { errors }, reset, setValue, watch } = form;
  const yieldUnitValue = watch('yield_unit');
  const productIdValue = watch('product_id');

  // Fetch products for dropdown
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', tenantId, 'dropdown'],
    queryFn: async () => {
      return await productApi.getProducts(tenantId, {
        per_page: 100, // Get more products for dropdown
        sort_by: 'name',
        sort_order: 'asc',
      });
    },
    enabled: !!tenantId && open,
  });

  // Load recipe data when editing
  useEffect(() => {
    if (mode === 'edit' && recipe) {
      reset({
        name: recipe.name,
        description: recipe.description || '',
        product_id: recipe.product_id || 'none',
        yield_quantity: recipe.yield_quantity,
        yield_unit: recipe.yield_unit,
        instructions: recipe.notes || '',
      });
    } else if (mode === 'create') {
      reset({
        name: '',
        description: '',
        product_id: 'none',
        yield_quantity: 1,
        yield_unit: 'pcs',
        instructions: '',
      });
    }
  }, [mode, recipe, reset]);

  const createMutation = useMutation({
    mutationFn: (data: RecipeCreateRequest) => bomApi.recipes.create(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', tenantId] });
      toast.success('Recipe created successfully');
      onOpenChange(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create recipe');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: RecipeUpdateRequest) =>
      bomApi.recipes.update(tenantId, recipe!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', tenantId] });
      toast.success('Recipe updated successfully');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update recipe');
    },
  });

  const onSubmit = (data: FormData) => {
    const payload = {
      product_id: data.product_id && data.product_id !== 'none' ? data.product_id : null, // Send null instead of empty string
      name: data.name,
      description: data.description || null,
      yield_quantity: Number(data.yield_quantity),
      yield_unit: data.yield_unit as RecipeYieldUnit,
      notes: data.instructions || null,
      materials: [], // Empty materials array for now
    };

    if (mode === 'create') {
      createMutation.mutate(payload);
    } else {
      const updatePayload = {
        name: data.name,
        description: data.description || null,
        yield_quantity: Number(data.yield_quantity),
        yield_unit: data.yield_unit as RecipeYieldUnit,
        notes: data.instructions || null,
      };
      updateMutation.mutate(updatePayload);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Tab Content Configurations
  const tabBasicContent = (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">
          Recipe Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., Chocolate Cake Recipe v1"
          {...register('name', { required: 'Recipe name is required' })}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Brief description of the recipe..."
          rows={3}
          {...register('description')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="product_id">Link to Product (Optional)</Label>
        <Select 
          value={productIdValue} 
          onValueChange={(value) => setValue('product_id', value)}
          disabled={isLoadingProducts}
        >
          <SelectTrigger id="product_id">
            <SelectValue placeholder={isLoadingProducts ? "Loading products..." : "Select a product (optional)"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {productsData?.data && productsData.data.length > 0 ? (
              productsData.data.map((product: any) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                  {product.sku && ` (${product.sku})`}
                </SelectItem>
              ))
            ) : (
              !isLoadingProducts && (
                <SelectItem value="no-products" disabled>
                  No products available
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Link this recipe to a specific product in your inventory
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Preparation Instructions</Label>
        <Textarea
          id="instructions"
          placeholder="Step-by-step instructions for preparing this recipe..."
          rows={4}
          {...register('instructions')}
        />
      </div>
    </>
  );

  const tabYieldContent = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="yield_quantity">
            Yield Quantity <span className="text-destructive">*</span>
          </Label>
          <Input
            id="yield_quantity"
            type="number"
            step="0.01"
            placeholder="1"
            {...register('yield_quantity', {
              required: 'Yield quantity is required',
              min: { value: 0.01, message: 'Must be > 0' },
            })}
            className={errors.yield_quantity ? 'border-destructive' : ''}
          />
          {errors.yield_quantity && (
            <p className="text-xs text-destructive">{errors.yield_quantity.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            How much does this recipe produce?
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="yield_unit">
            Yield Unit <span className="text-destructive">*</span>
          </Label>
          <Select 
            value={yieldUnitValue} 
            onValueChange={(value) => setValue('yield_unit', value)}
          >
            <SelectTrigger id="yield_unit">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {UNIT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Unit of measurement for the output
          </p>
        </div>
      </div>

      <div className="p-4 bg-muted/50 border rounded-lg">
        <h4 className="text-sm font-semibold mb-2">Yield Information Guide</h4>
        <p className="text-xs text-muted-foreground mb-2">
          The yield defines how much finished product this recipe produces.
        </p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>For baked goods: Use pieces (pcs) or weight (kg/g)</li>
          <li>For beverages: Use volume (L/ml) or bottles/cans</li>
          <li>For packaged items: Use boxes, bags, or pieces</li>
        </ul>
      </div>

      {mode === 'create' && (
        <>
          <div className="p-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                  ✅ Ready to Create Recipe
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  Click the <strong>"Create Recipe"</strong> button below to save. After creating, you can add materials to define the bill of materials.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {mode === 'edit' && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                💾 Save Changes
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Click <strong>"Update Recipe"</strong> below to save your changes.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Tab configurations for MultiStepFormWrapper
  const tabs: TabConfig[] = [
    {
      id: 'basic',
      label: 'Basic Information',
      content: tabBasicContent,
      validateFields: ['name'],
    },
    {
      id: 'yield',
      label: 'Yield Information',
      content: tabYieldContent,
      validateFields: ['yield_quantity', 'yield_unit'],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Recipe' : 'Edit Recipe'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Define a new recipe for your products. You can add materials after creating the recipe.'
              : 'Update the recipe information. Changes will be reflected immediately.'}
          </DialogDescription>
        </DialogHeader>

        <MultiStepFormWrapper
          tabs={tabs}
          form={form}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
          mode={mode}
          submitLabel={mode === 'create' ? 'Create Recipe' : 'Update Recipe'}
        />
      </DialogContent>
    </Dialog>
  );
}