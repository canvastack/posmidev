import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { productApi } from '@/api/productApi';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  filters: {
    search?: string;
    category_id?: string;
    stock_filter?: string;
    min_price?: number;
    max_price?: number;
  };
  totalProducts: number;
}

export function ExportModal({
  open,
  onOpenChange,
  tenantId,
  filters,
  totalProducts,
}: ExportModalProps) {
  const { toast } = useToast();
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);

      // Build query params
      const params = new URLSearchParams();
      params.append('format', format);
      
      if (filters.search) params.append('search', filters.search);
      if (filters.category_id) params.append('category_id', filters.category_id);
      if (filters.stock_filter) params.append('stock_filter', filters.stock_filter);
      if (filters.min_price !== undefined) params.append('min_price', filters.min_price.toString());
      if (filters.max_price !== undefined) params.append('max_price', filters.max_price.toString());

      // Call export API
      const response = await fetch(
        `/api/v1/tenants/${tenantId}/products/export?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header or generate default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `products_${new Date().toISOString().split('T')[0]}.${format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `${totalProducts} products exported to ${format.toUpperCase()}`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'An error occurred while exporting products',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Export Products"
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Export {totalProducts} {totalProducts === 1 ? 'product' : 'products'}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {Object.keys(filters).length > 0
                  ? 'Active filters will be applied to the export'
                  : 'All products will be exported'}
              </p>
            </div>
          </div>
        </div>

        {/* Format Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Export Format</Label>
          <RadioGroup value={format} onValueChange={(value) => setFormat(value as 'xlsx' | 'csv')}>
            <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="xlsx" id="xlsx" />
              <Label htmlFor="xlsx" className="flex items-center gap-3 cursor-pointer flex-1">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">Excel (XLSX)</div>
                  <div className="text-xs text-gray-500">Best for spreadsheet applications</div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <RadioGroupItem value="csv" id="csv" />
              <Label htmlFor="csv" className="flex items-center gap-3 cursor-pointer flex-1">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium">CSV</div>
                  <div className="text-xs text-gray-500">Compatible with most software</div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Export Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Exported Fields</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>• SKU</div>
            <div>• Name</div>
            <div>• Description</div>
            <div>• Category</div>
            <div>• Price</div>
            <div>• Cost Price</div>
            <div>• Profit Margin (%)</div>
            <div>• Stock</div>
            <div>• Status</div>
            <div>• Created At</div>
            <div>• Updated At</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            className="flex-1 gap-2"
            loading={exporting}
          >
            <Download className="h-4 w-4" />
            Export {format.toUpperCase()}
          </Button>
        </div>
      </div>
    </Modal>
  );
}