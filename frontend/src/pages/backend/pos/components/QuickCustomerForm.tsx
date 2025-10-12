import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Loader2, UserPlus } from 'lucide-react';
import { customersApi, type Customer } from '@/api/customersApi';
import { useAuth } from '@/hooks/useAuth';

interface QuickCustomerFormProps {
  onSuccess: (customer: Customer) => void;
  onCancel: () => void;
}

/**
 * QuickCustomerForm Component
 * Inline form for quick customer creation in POS
 * 
 * Features:
 * - Name + Phone required
 * - Email optional
 * - Auto-save and callback
 * - Loading states
 * - Error handling
 */
export const QuickCustomerForm = ({ onSuccess, onCancel }: QuickCustomerFormProps) => {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (!formData.phone.trim()) {
      setError('Phone is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const customer = await customersApi.create(tenantId!, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
      });
      
      onSuccess(customer);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="glass-card p-4 border rounded-lg">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Create New Customer
        </h4>

        {error && (
          <div className="bg-destructive/10 text-destructive text-xs p-2 rounded mb-3">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {/* Name */}
          <div>
            <Label htmlFor="customer-name" className="text-xs">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customer-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              disabled={loading}
              required
              autoFocus
            />
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="customer-phone" className="text-xs">
              Phone <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customer-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="08123456789"
              disabled={loading}
              required
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="customer-email" className="text-xs">
              Email <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="customer-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Create & Select
            </>
          )}
        </Button>
      </div>
    </form>
  );
};