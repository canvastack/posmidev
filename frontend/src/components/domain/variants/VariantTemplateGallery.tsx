/**
 * Variant Template Gallery Component
 * Phase 6: Product Variants - Week 16 Day 16B
 * 
 * Displays available variant templates (system and custom) for quick variant creation.
 * Allows users to browse, preview, and apply pre-configured templates to products.
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Tenant-scoped operations (tenantId required)
 * - All template operations are tenant-isolated
 * - System templates (tenant_id=NULL) are visible to all tenants
 * - Custom templates are tenant-specific
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Package,
  ArrowRight,
  Search,
  CheckCircle,
  Loader2,
  FileQuestion,
  Shirt,
  ShoppingBag,
  Monitor,
  Coffee,
  Settings,
  Star,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getVariantTemplates, previewTemplate, applyTemplate } from '@/api/variantsApi';
import type { VariantTemplate, ApplyTemplatePreview } from '@/types/variant';

export interface VariantTemplateGalleryProps {
  /** Tenant ID (required for IMMUTABLE RULES compliance) */
  tenantId: string;
  
  /** Product ID */
  productId: string;
  
  /** Product name (for display) */
  productName: string;
  
  /** Product base price */
  productPrice: number;
  
  /** Callback when template is successfully applied */
  onTemplateApplied: () => void;
  
  /** Callback when cancelled */
  onCancel: () => void;
}

/**
 * Get icon for template category
 */
const getCategoryIcon = (category?: string | null) => {
  const cat = category?.toLowerCase() || '';
  
  if (cat.includes('clothing') || cat.includes('apparel')) {
    return Shirt;
  } else if (cat.includes('shoe') || cat.includes('footwear')) {
    return ShoppingBag;
  } else if (cat.includes('electronic') || cat.includes('tech')) {
    return Monitor;
  } else if (cat.includes('food') || cat.includes('beverage')) {
    return Coffee;
  } else if (cat === 'custom') {
    return Settings;
  }
  
  return Package;
};

export function VariantTemplateGallery({
  tenantId,
  productId,
  productName,
  productPrice,
  onTemplateApplied,
  onCancel,
}: VariantTemplateGalleryProps) {
  // State
  const [selectedTemplate, setSelectedTemplate] = useState<VariantTemplate | null>(null);
  const [templates, setTemplates] = useState<VariantTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<VariantTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'system' | 'custom'>('all');
  const [preview, setPreview] = useState<ApplyTemplatePreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Base stock for new variants (default to 0, user can edit later)
  const [baseStock, setBaseStock] = useState<number>(0);
  
  /**
   * Fetch templates on mount and when tenantId changes
   * FIX: Moved fetchTemplates inside useEffect to avoid stale closure
   */
  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      try {
        const response = await getVariantTemplates(tenantId, {
          per_page: 100, // Get all templates
        });
        setTemplates(response.data);
      } catch (error) {
        console.error('Failed to fetch templates:', error);
        toast.error('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };
    
    loadTemplates();
  }, [tenantId]);
  
  /**
   * Filter templates when search or tab changes
   * FIX: Moved filtering logic inside useEffect to avoid stale closure
   */
  useEffect(() => {
    let filtered = [...templates];
    
    // Filter by tab
    if (activeTab === 'system') {
      filtered = filtered.filter(t => t.is_system);
    } else if (activeTab === 'custom') {
      filtered = filtered.filter(t => !t.is_system);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query)
      );
    }
    
    setFilteredTemplates(filtered);
  }, [templates, searchQuery, activeTab]);
  
  /**
   * Handle template selection
   */
  const handleSelectTemplate = (template: VariantTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(false);
    setPreview(null);
  };
  
  /**
   * Preview template before applying
   */
  const handlePreview = async () => {
    if (!selectedTemplate) return;
    
    setApplying(true);
    try {
      const previewData = await previewTemplate(tenantId, productId, {
        template_id: selectedTemplate.id,
        base_price: productPrice,
        base_stock: baseStock,
        override_pricing: true,
      });
      
      setPreview(previewData);
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to preview template:', error);
      toast.error('Failed to preview template');
    } finally {
      setApplying(false);
    }
  };
  
  /**
   * Apply selected template to product
   */
  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;
    
    setApplying(true);
    try {
      const result = await applyTemplate(tenantId, productId, {
        template_id: selectedTemplate.id,
        override_existing: true,
      });
      
      toast.success(`Successfully created ${result.created_count} variants`);
      onTemplateApplied();
    } catch (error) {
      console.error('Failed to apply template:', error);
      toast.error('Failed to apply template');
      setApplying(false);
    }
  };
  
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="w-[96vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] max-w-6xl h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Choose a Variant Template</DialogTitle>
          <DialogDescription>
            Select a pre-configured template to quickly create variants for "{productName}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col lg:flex-row gap-6 p-6 pt-4">
          {/* Left Panel - Template Gallery */}
          <div className="flex-1 space-y-4">
            {/* Search and Filters */}
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Filter Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">
                    All Templates
                  </TabsTrigger>
                  <TabsTrigger value="system">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    System
                  </TabsTrigger>
                  <TabsTrigger value="custom">
                    <Settings className="h-3.5 w-3.5 mr-1.5" />
                    Custom
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Template Grid */}
            <ScrollArea className="h-[50vh] md:h-[55vh] lg:h-[60vh] pr-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileQuestion className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">No templates found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {searchQuery
                      ? 'Try adjusting your search'
                      : 'No templates available yet'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredTemplates.map((template) => {
                    const Icon = getCategoryIcon(template.category);
                    const isSelected = selectedTemplate?.id === template.id;
                    
                    return (
                      <Card
                        key={template.id}
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md border-2',
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20 shadow-md'
                            : 'border-border hover:border-primary/50'
                        )}
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <CardHeader className="p-4 pb-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                'p-2 rounded-lg flex-shrink-0',
                                template.is_system
                                  ? 'bg-primary/10'
                                  : 'bg-secondary'
                              )}
                            >
                              <Icon
                                className={cn(
                                  'h-5 w-5',
                                  template.is_system
                                    ? 'text-primary'
                                    : 'text-secondary-foreground'
                                )}
                              />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-base leading-tight">
                                  {template.name}
                                </CardTitle>
                                {isSelected && (
                                  <div className="p-1 rounded-full bg-primary flex-shrink-0">
                                    <CheckCircle className="h-3.5 w-3.5 text-primary-foreground" />
                                  </div>
                                )}
                              </div>
                              
                              <CardDescription className="text-xs mt-1 line-clamp-2">
                                {template.description || 'No description'}
                              </CardDescription>
                              
                              <div className="flex items-center gap-2 mt-2">
                                {template.is_system && (
                                  <Badge variant="default" className="text-xs">
                                    <Star className="h-3 w-3 mr-1" />
                                    System
                                  </Badge>
                                )}
                                
                                {template.category && (
                                  <Badge variant="secondary" className="text-xs">
                                    {template.category}
                                  </Badge>
                                )}
                                
                                <Badge variant="outline" className="text-xs">
                                  {template.expected_variant_count} variants
                                </Badge>
                                
                                {template.usage_count > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    <Users className="h-3 w-3 mr-1" />
                                    {template.usage_count}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="p-4 pt-0">
                          <div className="flex flex-wrap gap-1">
                            {template.attributes.slice(0, 3).map((attr, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {attr.name}: {attr.values.length} options
                              </Badge>
                            ))}
                            {template.attributes.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.attributes.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
          
          {/* Right Panel - Preview & Actions */}
          <div className="lg:w-96 space-y-4">
            {selectedTemplate ? (
              <>
                {/* Selected Template Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Selected Template</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="font-medium">{selectedTemplate.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedTemplate.description}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Attributes:
                      </p>
                      {selectedTemplate.attributes.map((attr, idx) => (
                        <div key={idx} className="text-sm">
                          <span className="font-medium">{attr.name}:</span>{' '}
                          <span className="text-muted-foreground">
                            {attr.values.join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Expected Variants:</span>
                        <span className="font-semibold">
                          {selectedTemplate.expected_variant_count}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Base Price:</span>
                        <span className="font-semibold">
                          ${Number(productPrice ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Base Stock Input */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Initial Stock</CardTitle>
                    <CardDescription className="text-xs">
                      Set initial stock for all variants (you can adjust later)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor="base-stock" className="text-xs">
                        Base Stock Quantity
                      </Label>
                      <Input
                        id="base-stock"
                        type="number"
                        min="0"
                        value={baseStock}
                        onChange={(e) => setBaseStock(Number(e.target.value))}
                        placeholder="0"
                      />
                      <p className="text-xs text-muted-foreground">
                        Each variant will start with this stock quantity
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Preview Section */}
                {showPreview && preview && (
                  <Card className="border-primary/50">
                    <CardHeader>
                      <CardTitle className="text-sm text-primary">
                        Preview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Will Create:</span>
                        <span className="font-semibold text-primary">
                          {preview.expected_count} variants
                        </span>
                      </div>
                      
                      {preview.warnings && preview.warnings.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-amber-600">
                            Warnings:
                          </p>
                          {preview.warnings.map((warning, idx) => (
                            <p key={idx} className="text-xs text-amber-600">
                              • {warning}
                            </p>
                          ))}
                        </div>
                      )}
                      
                      <ScrollArea className="h-32 rounded border p-2">
                        <div className="space-y-1">
                          {preview.variants.slice(0, 10).map((variant, idx) => (
                            <p key={idx} className="text-xs">
                              {variant.sku} - ${Number((variant as any).price ?? 0).toFixed(2)}
                            </p>
                          ))}
                          {preview.variants.length > 10 && (
                            <p className="text-xs text-muted-foreground italic">
                              ... and {preview.variants.length - 10} more
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
                
                {/* Actions */}
                <div className="space-y-2">
                  {!showPreview ? (
                    <Button
                      onClick={handlePreview}
                      disabled={applying}
                      className="w-full"
                      variant="outline"
                    >
                      {applying ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading Preview...
                        </>
                      ) : (
                        <>
                          Preview Variants
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleApplyTemplate}
                      disabled={applying}
                      className="w-full"
                    >
                      {applying ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating Variants...
                        </>
                      ) : (
                        <>
                          Apply Template
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                  
                  <Button
                    onClick={onCancel}
                    disabled={applying}
                    variant="ghost"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">No Template Selected</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a template from the list to preview and apply
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}