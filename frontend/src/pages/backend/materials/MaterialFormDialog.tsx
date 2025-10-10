import React, { useEffect, useState } from 'react';
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
import { supplierApi, type Supplier } from '@/api/supplierApi';
import type { Material, MaterialCreateRequest, MaterialUpdateRequest, MaterialUnit } from '@/types/bom';
import { useAuth } from '@/hooks/useAuth';
import { Plus } from 'lucide-react';

interface MaterialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material?: Material | null;
  mode: 'create' | 'edit';
}

interface FormData {
  name: string;
  sku?: string;
  category: string;
  unit: string;
  current_quantity: number;
  min_stock_level?: number;
  reorder_point?: number;
  unit_cost: number;
  supplier_id?: string;
  supplier_name?: string;
  notes?: string;
}

const UNIT_OPTIONS = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'g', label: 'Gram (g)' },
  { value: 'L', label: 'Liter (L)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'box', label: 'Box' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'can', label: 'Can' },
  { value: 'bag', label: 'Bag' },
];

const CATEGORY_OPTIONS = [
  { value: 'Raw Materials', label: 'Raw Materials' },
  { value: 'Packaging', label: 'Packaging' },
  { value: 'Ingredients', label: 'Ingredients' },
  { value: 'Chemicals', label: 'Chemicals' },
  { value: 'Components', label: 'Components' },
  { value: 'Other', label: 'Other' },
];

export function MaterialFormDialog({ open, onOpenChange, material, mode }: MaterialFormDialogProps) {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();
  
  const [showNewSupplierInput, setShowNewSupplierInput] = useState(false);

  const form = useForm<FormData>({
    defaultValues: {
      name: '',
      sku: '',
      category: 'Raw Materials',
      unit: 'kg',
      current_quantity: 0,
      min_stock_level: 0,
      reorder_point: 0,
      unit_cost: 0,
      supplier_id: '',
      supplier_name: '',
      notes: '',
    },
  });

  const { register, formState: { errors }, reset, setValue, watch } = form;
  const categoryValue = watch('category');
  const unitValue = watch('unit');
  const supplierIdValue = watch('supplier_id');

  // Fetch suppliers for dropdown
  const { data: suppliersData, isLoading: loadingSuppliers } = useQuery({
    queryKey: ['suppliers', tenantId],
    queryFn: () => supplierApi.getSuppliers(tenantId, { per_page: 100, status: 'active' }),
    enabled: open && !!tenantId,
  });

  const suppliers = suppliersData?.data || [];

  // Debug supplier loading
  useEffect(() => {
    if (open && tenantId) {
      console.log('[MaterialFormDialog] Supplier Query:', {
        tenantId,
        loadingSuppliers,
        suppliersCount: suppliers.length,
        suppliers: suppliers.map(s => ({ id: s.id, name: s.name }))
      });
    }
  }, [open, tenantId, loadingSuppliers, suppliers]);

  // Load material data when editing
  useEffect(() => {
    if (mode === 'edit' && material) {
      reset({
        name: material.name,
        sku: material.sku || '',
        category: material.category || 'Raw Materials',
        unit: material.unit,
        current_quantity: material.stock_quantity,
        min_stock_level: material.reorder_level || 0,
        reorder_point: material.reorder_level || 0,
        unit_cost: material.unit_cost,
        supplier_id: '',
        supplier_name: material.supplier || '',
        notes: material.notes || '',
      });
    } else if (mode === 'create') {
      reset({
        name: '',
        sku: '',
        category: 'Raw Materials',
        unit: 'kg',
        current_quantity: 0,
        min_stock_level: 0,
        reorder_point: 0,
        unit_cost: 0,
        supplier_id: '',
        supplier_name: '',
        notes: '',
      });
    }
    setShowNewSupplierInput(false);
  }, [mode, material, reset, open]);

  // Create new supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: (data: { name: string }) =>
      supplierApi.createSupplier(tenantId, { name: data.name, status: 'active' }),
    onSuccess: (newSupplier) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', tenantId] });
      setValue('supplier_id', newSupplier.id);
      setShowNewSupplierInput(false);
      toast.success('Supplier created and linked successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create supplier');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: MaterialCreateRequest) => bomApi.materials.create(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', tenantId] });
      toast.success('Material created successfully');
      onOpenChange(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create material');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: MaterialUpdateRequest) => {
      if (!material?.id) {
        throw new Error('Material ID is missing');
      }
      return bomApi.materials.update(tenantId, material.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', tenantId] });
      toast.success('Material updated successfully');
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('[MaterialFormDialog] Update Error:', {
        error,
        materialId: material?.id,
        tenantId,
        response: error?.response?.data,
      });
      
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update material';
      
      if (error?.response?.status === 404) {
        toast.error('Material not found. It may have been deleted. Please refresh the page.');
        onOpenChange(false);
        queryClient.invalidateQueries({ queryKey: ['materials', tenantId] });
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const onSubmit = async (data: FormData) => {
    // Validate material ID for edit mode
    if (mode === 'edit' && !material?.id) {
      toast.error('Cannot update: Material ID is missing');
      console.error('[MaterialFormDialog] Edit mode without valid material ID', { material });
      return;
    }

    // If creating new supplier, create it first
    if (showNewSupplierInput && data.supplier_name) {
      await createSupplierMutation.mutateAsync({ name: data.supplier_name });
      // The supplier_id will be set by the mutation success handler
    }

    // Get supplier name from selected supplier or new supplier input
    let supplierName: string | null = null;
    if (data.supplier_id && data.supplier_id !== 'none') {
      const selectedSupplier = suppliers.find(s => s.id === data.supplier_id);
      supplierName = selectedSupplier?.name || null;
    } else if (showNewSupplierInput && data.supplier_name) {
      supplierName = data.supplier_name;
    }

    const payload = {
      name: data.name,
      sku: data.sku || null,
      category: data.category,
      unit: data.unit as MaterialUnit,
      stock_quantity: Number(data.current_quantity),
      reorder_level: data.min_stock_level ? Number(data.min_stock_level) : undefined,
      unit_cost: Number(data.unit_cost),
      supplier: supplierName,
      notes: data.notes || null,
    };

    if (mode === 'create') {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || createSupplierMutation.isPending;

  // Tab Content Configurations
  const tabBasicContent = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Material Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g., Flour, Sugar, Milk"
            {...register('name', { required: 'Material name is required' })}
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sku">SKU (Optional)</Label>
          <Input
            id="sku"
            placeholder="e.g., MAT-001"
            {...register('sku')}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">
            Category <span className="text-destructive">*</span>
          </Label>
          <Select value={categoryValue} onValueChange={(value) => setValue('category', value)}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit">
            Unit <span className="text-destructive">*</span>
          </Label>
          <Select value={unitValue} onValueChange={(value) => setValue('unit', value)}>
            <SelectTrigger id="unit">
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
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>Tip:</strong> Choose the most appropriate category and unit for accurate inventory tracking.
        </p>
      </div>
    </>
  );

  const tabStockContent = (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="current_quantity">
            Current Quantity <span className="text-destructive">*</span>
          </Label>
          <Input
            id="current_quantity"
            type="number"
            step="0.01"
            placeholder="0"
            {...register('current_quantity', {
              required: 'Current quantity is required',
              min: { value: 0, message: 'Must be >= 0' },
            })}
            className={errors.current_quantity ? 'border-destructive' : ''}
          />
          {errors.current_quantity && (
            <p className="text-xs text-destructive">{errors.current_quantity.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="min_stock_level">Min Stock Level</Label>
          <Input
            id="min_stock_level"
            type="number"
            step="0.01"
            placeholder="0"
            {...register('min_stock_level', {
              min: { value: 0, message: 'Must be >= 0' },
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reorder_point">Reorder Point</Label>
          <Input
            id="reorder_point"
            type="number"
            step="0.01"
            placeholder="0"
            {...register('reorder_point', {
              min: { value: 0, message: 'Must be >= 0' },
            })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="unit_cost">
          Unit Cost (IDR) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="unit_cost"
          type="number"
          step="0.01"
          placeholder="0"
          {...register('unit_cost', {
            required: 'Unit cost is required',
            min: { value: 0, message: 'Must be >= 0' },
          })}
          className={errors.unit_cost ? 'border-destructive' : ''}
        />
        {errors.unit_cost && (
          <p className="text-xs text-destructive">{errors.unit_cost.message}</p>
        )}
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          💡 <strong>Stock Management Tips:</strong>
          <br />• Set reorder point below min stock level to trigger alerts
          <br />• Keep unit cost updated for accurate costing calculations
        </p>
      </div>
    </>
  );

  const tabSupplierContent = (
    <>
      {!showNewSupplierInput ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="supplier_id">Select Supplier (Optional)</Label>
            <Select 
              value={supplierIdValue} 
              onValueChange={(value) => setValue('supplier_id', value)}
              disabled={loadingSuppliers}
            >
              <SelectTrigger id="supplier_id">
                <SelectValue placeholder={loadingSuppliers ? 'Loading suppliers...' : 'Select a supplier or create new'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (No Supplier)</SelectItem>
                {loadingSuppliers ? (
                  <div className="px-2 py-6 text-sm text-muted-foreground text-center">
                    Loading suppliers...
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="px-2 py-6 text-sm text-muted-foreground text-center">
                    No suppliers found. Create one below.
                  </div>
                ) : (
                  suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name} {supplier.contact_person && `(${supplier.contact_person})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {!loadingSuppliers && suppliers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {suppliers.length} supplier(s) available
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowNewSupplierInput(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Supplier
          </Button>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="supplier_name">
            New Supplier Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="supplier_name"
            placeholder="e.g., ABC Suppliers"
            {...register('supplier_name', {
              required: showNewSupplierInput ? 'Supplier name is required' : false,
            })}
            className={errors.supplier_name ? 'border-destructive' : ''}
          />
          {errors.supplier_name && (
            <p className="text-xs text-destructive">{errors.supplier_name.message}</p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowNewSupplierInput(false);
              setValue('supplier_name', '');
            }}
          >
            ← Back to existing suppliers
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Add any additional notes about this material..."
          rows={4}
          {...register('notes')}
        />
      </div>

      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <p className="text-sm text-green-800 dark:text-green-200">
          💡 <strong>Supplier Integration:</strong>
          <br />• Link to existing suppliers for better tracking
          <br />• Create new suppliers on-the-fly (will be synced to Supplier Management)
          <br />• Supplier information helps in procurement and cost analysis
        </p>
      </div>

      {mode === 'create' && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                ✅ Ready to Create Material
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                You've completed all required fields. Click the <strong>"Create Material"</strong> button below to save this material to your inventory.
              </p>
            </div>
          </div>
        </div>
      )}

      {mode === 'edit' && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
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
                Click <strong>"Update Material"</strong> below to save your changes.
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
      validateFields: ['name', 'category', 'unit'],
    },
    {
      id: 'stock',
      label: 'Stock Information',
      content: tabStockContent,
      validateFields: ['current_quantity', 'unit_cost'],
    },
    {
      id: 'supplier',
      label: 'Supplier Information',
      content: tabSupplierContent,
      validateFields: [], // No required fields in supplier tab
    },
  ];

  // Extra action for resetting new supplier input when reset button is clicked
  const handleFormReset = () => {
    setShowNewSupplierInput(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Material' : 'Edit Material'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a new material to your inventory. Complete all tabs to create.'
              : 'Update the material information. Changes will be reflected immediately.'}
          </DialogDescription>
        </DialogHeader>

        <MultiStepFormWrapper
          tabs={tabs}
          form={form}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
          mode={mode}
          submitLabel={mode === 'create' ? 'Create Material' : 'Update Material'}
          onTabChange={handleFormReset}
        />
      </DialogContent>
    </Dialog>
  );
}