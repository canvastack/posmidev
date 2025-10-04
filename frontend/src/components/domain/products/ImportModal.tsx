import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onSuccess: () => void;
}

type Step = 'upload' | 'importing' | 'summary';

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  total_errors: number;
  errors: Array<{
    row: number;
    attribute: string;
    errors: string[];
    values: Record<string, any>;
  }>;
  message?: string;
}

export function ImportModal({
  open,
  onOpenChange,
  tenantId,
  onSuccess,
}: ImportModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(
        `/api/v1/tenants/${tenantId}/products/import/template`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `product_import_template_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Template Downloaded',
        description: 'Fill in the template and upload to import products',
      });
    } catch (error) {
      console.error('Download template error:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download import template',
        variant: 'destructive',
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
      ];

      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload an Excel (.xlsx, .xls) or CSV file',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File Too Large',
          description: 'Maximum file size is 10MB',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    try {
      setImporting(true);
      setStep('importing');

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(
        `/api/v1/tenants/${tenantId}/products/import`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Import failed');
      }

      setResult(data);
      setStep('summary');

      if (data.success && data.imported > 0) {
        toast({
          title: 'Import Successful',
          description: `${data.imported} products imported successfully`,
        });
        onSuccess();
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'An error occurred during import',
        variant: 'destructive',
      });
      setStep('upload');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title="Import Products"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Step: Upload */}
        {step === 'upload' && (
          <>
            {/* Download Template */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    Step 1: Download Template
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Use our template to ensure your data is formatted correctly
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="mt-3 gap-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Step 2: Upload File</label>
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  selectedFile
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">{selectedFile.name}</p>
                      <p className="text-xs text-green-700 mt-1">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="gap-2 text-green-700 hover:text-green-800"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="h-12 w-12 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Excel (.xlsx, .xls) or CSV files (max 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">
                    Important Notes
                  </p>
                  <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc list-inside">
                    <li>Required fields: SKU, Name, Price</li>
                    <li>Duplicate SKUs will be skipped</li>
                    <li>Category must match existing categories</li>
                    <li>Status: Active, Inactive, or Discontinued</li>
                    <li>Prices and stock must be numeric values</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                className="flex-1 gap-2"
                disabled={!selectedFile || importing}
              >
                <Upload className="h-4 w-4" />
                Import Products
              </Button>
            </div>
          </>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg font-medium text-gray-900">Importing Products...</p>
            <p className="text-sm text-gray-500 mt-2">Please wait while we process your file</p>
          </div>
        )}

        {/* Step: Summary */}
        {step === 'summary' && result && (
          <>
            {/* Success Summary */}
            {result.success && result.imported > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-900">
                      Import Successful!
                    </h3>
                    <div className="mt-3 space-y-2 text-sm text-green-800">
                      <div className="flex justify-between">
                        <span>Products Imported:</span>
                        <span className="font-semibold">{result.imported}</span>
                      </div>
                      {result.skipped > 0 && (
                        <div className="flex justify-between">
                          <span>Skipped (Duplicates):</span>
                          <span className="font-semibold">{result.skipped}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Errors */}
            {result.total_errors > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="h-8 w-8 text-red-600 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-900">
                      {result.total_errors} Validation {result.total_errors === 1 ? 'Error' : 'Errors'}
                    </h3>
                    <div className="mt-4 max-h-64 overflow-y-auto space-y-3">
                      {result.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="bg-white rounded border border-red-200 p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded">
                              Row {error.row}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-red-900">
                                {error.attribute}
                              </p>
                              <p className="text-xs text-red-700 mt-1">
                                {error.errors.join(', ')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {result.errors.length > 10 && (
                        <p className="text-xs text-red-600 text-center py-2">
                          ... and {result.errors.length - 10} more errors
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* No imports */}
            {result.imported === 0 && result.total_errors === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="h-8 w-8 text-amber-600 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-amber-900">
                      No Products Imported
                    </h3>
                    <p className="text-sm text-amber-700 mt-2">
                      {result.message || 'The file did not contain any valid products to import.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {result.imported > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1"
                >
                  Import More
                </Button>
              )}
              {result.imported === 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1"
                >
                  Try Again
                </Button>
              )}
              <Button
                type="button"
                onClick={handleClose}
                className="flex-1"
              >
                {result.imported > 0 ? 'Done' : 'Close'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}