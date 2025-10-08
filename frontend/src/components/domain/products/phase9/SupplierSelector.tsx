/**
 * Phase 9: Supplier Selector Component
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Tenant-scoped supplier fetching
 * - Uses design tokens from index.css
 * - Fully supports dark/light mode
 * - Responsive design
 */

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supplierApi, type Supplier } from '@/api/supplierApi';
import { useAuth } from '@/hooks/useAuth';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

interface SupplierSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  error?: string;
  disabled?: boolean;
  showCreateButton?: boolean;
}

export function SupplierSelector({ 
  value, 
  onChange, 
  error, 
  disabled,
  showCreateButton = true 
}: SupplierSelectorProps) {
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuppliers();
  }, [tenantId]);

  const fetchSuppliers = async () => {
    if (!tenantId) return;
    
    try {
      setLoading(true);
      const response = await supplierApi.getSuppliers(tenantId, {
        per_page: 1000, // Get all suppliers
        status: 'active',
      });
      setSuppliers(response.data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = () => {
    navigate('/admin/suppliers?action=create');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="supplier_id">Supplier</Label>
        {showCreateButton && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCreateSupplier}
            className="h-auto py-1 text-xs"
          >
            <PlusIcon className="mr-1 h-3 w-3" />
            Add New
          </Button>
        )}
      </div>
      
      <select
        id="supplier_id"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled || loading}
        className={`input w-full ${error ? 'border-danger-500 focus:ring-danger-500' : ''}`}
      >
        <option value="">-- No Supplier --</option>
        {loading ? (
          <option disabled>Loading suppliers...</option>
        ) : (suppliers || []).length === 0 ? (
          <option disabled>No active suppliers found</option>
        ) : (
          (suppliers || []).map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
              {supplier.contact_person && ` (${supplier.contact_person})`}
            </option>
          ))
        )}
      </select>
      
      {error && (
        <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
      )}
      
      <p className="text-xs text-muted-foreground">
        Select a supplier for this product (optional)
      </p>
    </div>
  );
}