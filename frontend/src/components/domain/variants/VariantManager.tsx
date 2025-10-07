/**
 * Variant Manager Component
 * Phase 6: Product Variants - Day 13
 * 
 * Main container component for managing product variants.
 * Provides interface to enable variants and choose setup method.
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Tenant-scoped operations (tenantId required)
 * - Permission check for products.update
 * - All variant operations are tenant-isolated
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Package, Plus, Settings, BarChart3 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { VariantSetupChoice } from './VariantSetupChoice';
import { VariantList } from './VariantList';
import { VariantTemplateGallery } from './VariantTemplateGallery';
import { VariantMatrixBuilder } from './VariantMatrixBuilder';
import { VariantAnalyticsDashboard } from './VariantAnalyticsDashboard';
import { useProductVariants } from '@/hooks';
import { toast } from 'sonner';

export interface VariantManagerProps {
  /** Tenant ID (required for IMMUTABLE RULES compliance) */
  tenantId: string;
  
  /** Product ID */
  productId: string;
  
  /** Product name (for display) */
  productName: string;
  
  /** Product SKU (for variant SKU generation) */
  productSku: string;
  
  /** Product price (base price for variants) */
  productPrice: number;
  
  /** Whether product currently has variants enabled */
  hasVariants: boolean;
  
  /** Callback when variants are enabled/disabled */
  onVariantsToggle?: (enabled: boolean) => void;
  
  /** Whether user has permission to manage variants */
  canManageVariants?: boolean;
}

export function VariantManager({
  tenantId,
  productId,
  productName,
  productSku,
  productPrice,
  hasVariants,
  onVariantsToggle,
  canManageVariants = true,
}: VariantManagerProps) {
  // State
  const [variantsEnabled, setVariantsEnabled] = useState(hasVariants);
  const [showSetupChoice, setShowSetupChoice] = useState(false);
  const [setupMethod, setSetupMethod] = useState<'template' | 'custom' | null>(null);
  
  // Fetch existing variants
  const {
    data: variants,
    isLoading,
    error,
  } = useProductVariants(tenantId, productId, {
    enabled: variantsEnabled,
  });
  
  // Sync with prop changes
  useEffect(() => {
    setVariantsEnabled(hasVariants);
  }, [hasVariants]);
  
  // Check if variants exist
  const hasExistingVariants = variants && variants.length > 0;
  
  /**
   * Handle enable/disable variants toggle
   */
  const handleToggleVariants = async (enabled: boolean) => {
    if (!canManageVariants) {
      toast.error('You do not have permission to manage variants');
      return;
    }
    
    // If disabling and variants exist, confirm
    if (!enabled && hasExistingVariants) {
      const confirmed = confirm(
        `This product has ${variants.length} variant(s). Disabling variants will hide them. Continue?`
      );
      if (!confirmed) return;
    }
    
    setVariantsEnabled(enabled);
    onVariantsToggle?.(enabled);
    
    // Show setup choice if enabling for the first time
    if (enabled && !hasExistingVariants) {
      setShowSetupChoice(true);
    }
    
    toast.success(
      enabled ? 'Variants enabled for this product' : 'Variants disabled'
    );
  };
  
  /**
   * Handle setup method selection
   */
  const handleSetupMethodSelected = (method: 'template' | 'custom') => {
    setSetupMethod(method);
    setShowSetupChoice(false);
  };
  
  /**
   * Handle add more variants
   */
  const handleAddMore = () => {
    setShowSetupChoice(true);
  };
  
  /**
   * Handle template applied successfully
   */
  const handleTemplateApplied = () => {
    setSetupMethod(null);
    // Variants will auto-reload via the useProductVariants hook
    toast.success('Template applied successfully!');
  };
  
  /**
   * Handle variants created via matrix builder
   */
  const handleVariantsCreated = () => {
    setSetupMethod(null);
    // Variants will auto-reload via the useProductVariants hook
    toast.success('Variants created successfully!');
  };
  
  return (
    <div className="space-y-6">
      {/* Enable Variants Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Variants
              </CardTitle>
              <CardDescription>
                Enable variants to create multiple versions of this product (e.g., different sizes, colors)
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-3">
              {hasExistingVariants && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {variants.length} variant{variants.length !== 1 ? 's' : ''}
                </Badge>
              )}
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-variants"
                  checked={variantsEnabled}
                  onCheckedChange={handleToggleVariants}
                  disabled={!canManageVariants}
                />
                <Label htmlFor="enable-variants">
                  {variantsEnabled ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        
        {!canManageVariants && (
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Permission Required</AlertTitle>
              <AlertDescription>
                You do not have permission to manage product variants. Contact your administrator.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>
      
      {/* Variants Content */}
      {variantsEnabled && canManageVariants && (
        <>
          {/* Setup Choice Modal */}
          {showSetupChoice && (
            <VariantSetupChoice
              tenantId={tenantId}
              productId={productId}
              productName={productName}
              productSku={productSku}
              productPrice={productPrice}
              onMethodSelected={handleSetupMethodSelected}
              onCancel={() => setShowSetupChoice(false)}
            />
          )}
          
          {/* Template Gallery */}
          {setupMethod === 'template' && (
            <VariantTemplateGallery
              tenantId={tenantId}
              productId={productId}
              productName={productName}
              productPrice={productPrice}
              onTemplateApplied={handleTemplateApplied}
              onCancel={() => setSetupMethod(null)}
            />
          )}
          
          {/* Matrix Builder */}
          {setupMethod === 'custom' && (
            <VariantMatrixBuilder
              tenantId={tenantId}
              productId={productId}
              productSku={productSku}
              productPrice={productPrice}
              onVariantsCreated={handleVariantsCreated}
              onCancel={() => setSetupMethod(null)}
            />
          )}
          
          {/* Variant List & Analytics */}
          {hasExistingVariants ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Manage Variants</h3>
                  <p className="text-sm text-muted-foreground">
                    View, edit, and analyze product variants
                  </p>
                </div>
                
                <Button onClick={handleAddMore} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add More Variants
                </Button>
              </div>
              
              <Tabs defaultValue="variants" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="variants" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Variants
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="variants" className="space-y-4">
                  <VariantList
                    tenantId={tenantId}
                    productId={productId}
                    productSku={productSku}
                    productPrice={productPrice}
                  />
                </TabsContent>
                
                <TabsContent value="analytics">
                  <VariantAnalyticsDashboard
                    tenantId={tenantId}
                    productId={productId}
                    productName={productName}
                  />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            !showSetupChoice && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No variants yet</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Get started by choosing how you want to create variants
                    </p>
                    <Button onClick={() => setShowSetupChoice(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Variants
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </>
      )}
      
      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Variants</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load variants'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}