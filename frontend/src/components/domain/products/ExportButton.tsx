import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ExportButtonProps {
  currentFilters?: Record<string, string | number | boolean>;
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ currentFilters = {}, disabled = false }) => {
  const { tenantId, token } = useAuth();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'xlsx' | 'csv') => {
    if (!tenantId || !token) return;

    setExporting(true);
    try {
      // Build query string from current filters
      const params = new URLSearchParams();
      params.append('format', format);
      
      // Add current filters to export the same data user sees
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:9000/api/v1'}/tenants/${tenantId}/products/export?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv',
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header or create a default one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `products_${new Date().toISOString().split('T')[0]}.${format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      // Create download link
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Success',
        description: `Products exported successfully as ${format.toUpperCase()}`,
      });

      setModalOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to export products. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setModalOpen(true)}
        disabled={disabled}
      >
        <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
        Export
      </Button>

      <Modal
        isOpen={modalOpen}
        onClose={() => !exporting && setModalOpen(false)}
        title="Export Products"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose the export format. All current filters will be applied to the export.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => handleExport('xlsx')}
              disabled={exporting}
              className="h-24 flex flex-col items-center justify-center"
            >
              <svg className="h-8 w-8 mb-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M15.8,20H14L12,13.2L9.98,20H8.2L5.5,11H7.3L9.12,17.75L11.1,11H12.87L14.88,17.75L16.7,11H18.5L15.8,20M13,9V3.5L18.5,9H13Z" />
              </svg>
              {exporting ? 'Exporting...' : 'Excel (XLSX)'}
            </Button>

            <Button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              variant="outline"
              className="h-24 flex flex-col items-center justify-center"
            >
              <svg className="h-8 w-8 mb-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M15.8,20H14L12,13.2L9.98,20H8.2L5.5,11H7.3L9.12,17.75L11.1,11H12.87L14.88,17.75L16.7,11H18.5L15.8,20M13,9V3.5L18.5,9H13Z" />
              </svg>
              {exporting ? 'Exporting...' : 'CSV'}
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => setModalOpen(false)}
              disabled={exporting}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};