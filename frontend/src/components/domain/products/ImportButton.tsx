import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { ArrowUpTrayIcon, DocumentArrowDownIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/Badge';

interface ImportButtonProps {
  onSuccess?: () => void;
  disabled?: boolean;
}

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
  message: string;
}

export const ImportButton: React.FC<ImportButtonProps> = ({ onSuccess, disabled = false }) => {
  const { tenantId, token } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<'upload' | 'result'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validExtensions = ['xlsx', 'xls', 'csv'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (!fileExtension || !validExtensions.includes(fileExtension)) {
        toast({
          title: 'Invalid File',
          description: 'Please select a valid Excel (.xlsx, .xls) or CSV file',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        toast({
          title: 'File Too Large',
          description: 'File size must not exceed 10MB',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !tenantId || !token) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const url = `${import.meta.env.VITE_API_URL}/tenants/${tenantId}/products/import`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Import failed');
      }

      setImportResult(data);
      setStep('result');

      if (data.imported > 0) {
        toast({
          title: 'Import Successful',
          description: `Successfully imported ${data.imported} product(s)`,
        });
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Import failed:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import products. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!tenantId || !token) return;

    try {
      const url = `${import.meta.env.VITE_API_URL}/tenants/${tenantId}/products/import/template`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'products_import_template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Template Downloaded',
        description: 'Import template has been downloaded successfully',
      });
    } catch (error) {
      console.error('Template download failed:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download template. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    if (importing) return;
    setModalOpen(false);
    setStep('upload');
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setModalOpen(true)}
        disabled={disabled}
      >
        <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
        Import
      </Button>

      <Modal
        isOpen={modalOpen}
        onClose={handleClose}
        title={step === 'upload' ? 'Import Products' : 'Import Results'}
        size="lg"
      >
        {step === 'upload' ? (
          <div className="space-y-4">
            {/* Download Template Section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <DocumentArrowDownIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Need a template?
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    Download our Excel template with sample data to get started
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadTemplate}
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select File to Import
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary-50 file:text-primary-700
                  hover:file:bg-primary-100
                  dark:file:bg-primary-900 dark:file:text-primary-300
                  dark:hover:file:bg-primary-800
                  cursor-pointer"
              />
              {selectedFile && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Selected: <span className="font-medium">{selectedFile.name}</span>
                  <span className="ml-2">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
                </div>
              )}
            </div>

            {/* Important Notes */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                Important Notes:
              </h4>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                <li>Supported formats: Excel (.xlsx, .xls) and CSV (.csv)</li>
                <li>Maximum file size: 10MB</li>
                <li>Required fields: SKU, Name, Price</li>
                <li>Duplicate SKUs will be skipped</li>
                <li>Category names must match existing categories</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleImport}
                disabled={!selectedFile || importing}
                className="flex-1"
              >
                {importing ? 'Importing...' : 'Import Products'}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={importing}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          /* Results Step */
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {importResult?.imported || 0}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Imported
                </div>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {importResult?.skipped || 0}
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Skipped
                </div>
              </div>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {importResult?.total_errors || 0}
                </div>
                <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Errors
                </div>
              </div>
            </div>

            {/* Message */}
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              (importResult?.imported || 0) > 0
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
            }`}>
              {(importResult?.imported || 0) > 0 ? (
                <CheckCircleIcon className="h-5 w-5" />
              ) : (
                <XCircleIcon className="h-5 w-5" />
              )}
              <span className="font-medium">{importResult?.message}</span>
            </div>

            {/* Error Details */}
            {importResult && importResult.total_errors > 0 && (
              <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 max-h-64 overflow-y-auto">
                <h4 className="font-medium text-red-900 dark:text-red-100 mb-3">
                  Error Details:
                </h4>
                <div className="space-y-2">
                  {importResult.errors.map((error, index) => (
                    <div key={index} className="text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      <div className="font-medium text-red-800 dark:text-red-200">
                        Row {error.row}
                      </div>
                      <div className="text-red-600 dark:text-red-400">
                        {error.errors.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="pt-4">
              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};