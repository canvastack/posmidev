/**
 * Phase 9: SKU Auto-Generator Modal
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Tenant-scoped SKU generation
 * - Uses design tokens from index.css
 * - Fully supports dark/light mode
 * - Responsive design
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { skuApi, type SkuPattern } from '@/api/skuApi';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  SparklesIcon, 
  CheckCircleIcon, 
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

interface SkuGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (sku: string) => void;
  categoryId?: string;
}

export function SkuGeneratorModal({ 
  open, 
  onClose, 
  onGenerate,
  categoryId 
}: SkuGeneratorModalProps) {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [patterns, setPatterns] = useState<SkuPattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<string>('');
  const [previewSku, setPreviewSku] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open && tenantId) {
      fetchPatterns();
    }
  }, [open, tenantId]);

  useEffect(() => {
    if (selectedPattern && tenantId) {
      previewSkuGeneration();
    } else {
      setPreviewSku('');
    }
  }, [selectedPattern, categoryId]);

  const fetchPatterns = async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      const data = await skuApi.getPatterns(tenantId);
      setPatterns(data);
      
      // Load saved pattern from localStorage
      const savedPattern = localStorage.getItem('preferredSkuPattern');
      if (savedPattern && data.some(p => p.pattern === savedPattern)) {
        setSelectedPattern(savedPattern);
      } else if (data.length > 0) {
        setSelectedPattern(data[0].pattern);
      }
    } catch (error) {
      console.error('Failed to fetch SKU patterns:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SKU patterns',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const previewSkuGeneration = async () => {
    if (!tenantId || !selectedPattern) return;
    
    try {
      const response = await skuApi.previewSku(tenantId, {
        pattern: selectedPattern,
        category_id: categoryId,
      });
      setPreviewSku(response.sku);
    } catch (error) {
      console.error('Failed to preview SKU:', error);
      setPreviewSku('Error generating preview');
    }
  };

  const handleGenerate = async () => {
    if (!tenantId || !selectedPattern) return;
    
    try {
      setGenerating(true);
      const response = await skuApi.generateSku(tenantId, {
        pattern: selectedPattern,
        category_id: categoryId,
      });
      
      // Save preferred pattern
      localStorage.setItem('preferredSkuPattern', selectedPattern);
      
      toast({
        title: 'SKU Generated',
        description: `New SKU: ${response.sku}`,
      });
      
      onGenerate(response.sku);
      onClose();
    } catch (error: any) {
      console.error('Failed to generate SKU:', error);
      toast({
        title: 'Generation Failed',
        description: error.response?.data?.message || 'Failed to generate SKU',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const selectedPatternInfo = patterns.find(p => p.pattern === selectedPattern);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-primary" />
            Auto-Generate SKU
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Pattern Selection */}
          <div className="space-y-2">
            <Label htmlFor="pattern">SKU Pattern</Label>
            <Select
              id="pattern"
              value={selectedPattern}
              onChange={(e) => setSelectedPattern(e.target.value)}
              disabled={loading}
            >
              <option value="">-- Select Pattern --</option>
              {patterns.map((pattern) => (
                <option key={pattern.pattern} value={pattern.pattern}>
                  {pattern.pattern} - {pattern.description}
                </option>
              ))}
            </Select>
          </div>

          {/* Pattern Info */}
          {selectedPatternInfo && (
            <div className="rounded-lg border border-info-200 bg-info-50 p-3 dark:border-info-800 dark:bg-info-950">
              <div className="flex gap-2">
                <InformationCircleIcon className="h-5 w-5 flex-shrink-0 text-info-600 dark:text-info-400" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-info-900 dark:text-info-100">
                    Pattern Information
                  </p>
                  <p className="text-sm text-info-800 dark:text-info-200">
                    {selectedPatternInfo.description}
                  </p>
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      Example: {selectedPatternInfo.example}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {previewSku && (
            <div className="rounded-lg border border-success-200 bg-success-50 p-4 dark:border-success-800 dark:bg-success-950">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-success-900 dark:text-success-100">
                    Generated SKU Preview
                  </p>
                  <p className="font-mono text-lg font-bold text-success-700 dark:text-success-300">
                    {previewSku}
                  </p>
                </div>
                <CheckCircleIcon className="h-8 w-8 text-success-600 dark:text-success-400" />
              </div>
              <p className="mt-2 text-xs text-success-700 dark:text-success-300">
                This SKU will be assigned when you click "Generate & Apply"
              </p>
            </div>
          )}

          {/* Help Text */}
          <div className="text-sm text-muted-foreground">
            <p>
              Auto-generated SKUs are unique and sequential. Your preferred pattern
              will be saved for future use.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={generating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!selectedPattern || generating || loading}
            className="gap-2"
          >
            {generating ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="h-4 w-4" />
                Generate & Apply
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}