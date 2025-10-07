/**
 * Variant Setup Choice Component
 * Phase 6: Product Variants - Day 13
 * 
 * Allows users to choose between template-based or custom variant creation.
 * Two-card layout with clear visual distinction.
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Tenant-scoped operations (tenantId required)
 * - All template/custom operations are tenant-isolated
 */

import { useState } from 'react';
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
import {
  Sparkles,
  Wrench,
  ArrowRight,
  Clock,
  Zap,
  Users,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VariantSetupChoiceProps {
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
  
  /** Callback when method is selected */
  onMethodSelected: (method: 'template' | 'custom') => void;
  
  /** Callback when cancelled */
  onCancel: () => void;
}

export function VariantSetupChoice({
  tenantId,
  productId,
  productName,
  productSku,
  productPrice,
  onMethodSelected,
  onCancel,
}: VariantSetupChoiceProps) {
  const [selectedMethod, setSelectedMethod] = useState<'template' | 'custom' | null>(null);
  
  /**
   * Handle method selection
   */
  const handleSelect = (method: 'template' | 'custom') => {
    setSelectedMethod(method);
  };
  
  /**
   * Handle continue button
   */
  const handleContinue = () => {
    if (selectedMethod) {
      onMethodSelected(selectedMethod);
    }
  };
  
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="w-[96vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] max-w-5xl h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Create Product Variants</DialogTitle>
          <DialogDescription>
            Choose how you want to create variants for "{productName}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 p-6">
          {/* Template Option */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg border-2',
              selectedMethod === 'template'
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => handleSelect('template')}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    Use Template
                  </CardTitle>
                  <CardDescription>
                    Quick setup with pre-configured variant options
                  </CardDescription>
                </div>
                
                {selectedMethod === 'template' && (
                  <div className="p-1.5 rounded-full bg-primary">
                    <CheckCircle className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Benefits */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Fast Setup</p>
                    <p className="text-muted-foreground">
                      Create dozens of variants in seconds
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Users className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Proven Patterns</p>
                    <p className="text-muted-foreground">
                      Industry-standard variant configurations
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Save Time</p>
                    <p className="text-muted-foreground">
                      Perfect for common product types
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Examples Badge */}
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Popular templates:</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs">
                    Clothing (S/M/L/XL)
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Shoes (Sizes)
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Electronics
                  </Badge>
                </div>
              </div>
              
              {/* Best For */}
              <div className="pt-2">
                <p className="text-xs font-medium text-primary">
                  Best for: Clothing, Shoes, Standard Products
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Custom Option */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-lg border-2',
              selectedMethod === 'custom'
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => handleSelect('custom')}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-secondary">
                      <Wrench className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    Custom Builder
                  </CardTitle>
                  <CardDescription>
                    Build variants from scratch with full control
                  </CardDescription>
                </div>
                
                {selectedMethod === 'custom' && (
                  <div className="p-1.5 rounded-full bg-primary">
                    <CheckCircle className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Benefits */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Wrench className="h-4 w-4 text-secondary-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Full Control</p>
                    <p className="text-muted-foreground">
                      Define your own attributes and values
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Sparkles className="h-4 w-4 text-secondary-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Unlimited Flexibility</p>
                    <p className="text-muted-foreground">
                      Create any combination of variants
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 text-secondary-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">Matrix Builder</p>
                    <p className="text-muted-foreground">
                      Visual tool with undo/redo support
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Examples */}
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Example attributes:</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-xs">
                    Size
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Color
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Material
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Custom...
                  </Badge>
                </div>
              </div>
              
              {/* Best For */}
              <div className="pt-2">
                <p className="text-xs font-medium text-secondary-foreground">
                  Best for: Unique Products, Custom Attributes
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          
          <Button
            onClick={handleContinue}
            disabled={!selectedMethod}
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}