import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, User, Phone, Mail, Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { customersApi, type Customer } from '@/api/customersApi';
import { useAuth } from '@/hooks/useAuth';
import { QuickCustomerForm } from './QuickCustomerForm';
import { useDebounce } from '@/hooks/useDebounce';

interface CustomerSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
}

/**
 * CustomerSearchModal Component
 * Search and select customer for POS transaction
 * 
 * Features:
 * - Debounced search (300ms)
 * - Real-time results
 * - Quick customer creation
 * - Loading & error states
 * - Keyboard navigation ready
 */
export const CustomerSearchModal = ({ open, onClose, onSelect }: CustomerSearchModalProps) => {
  const { tenantId } = useAuth();
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);

  // Search customers
  const searchCustomers = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setCustomers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await customersApi.list(tenantId!, {
        q: searchQuery,
        per_page: 10,
      });
      setCustomers(response.data);
    } catch (err: any) {
      setError('Failed to search customers');
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Trigger search on debounced query change
  useEffect(() => {
    if (debouncedQuery) {
      searchCustomers(debouncedQuery);
    } else {
      setCustomers([]);
    }
  }, [debouncedQuery, searchCustomers]);

  // Handle customer selection
  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    onClose();
    setQuery('');
    setCustomers([]);
  };

  // Handle new customer created
  const handleCustomerCreated = (customer: Customer) => {
    setShowCreateForm(false);
    handleSelect(customer);
  };

  // Reset on close
  const handleClose = () => {
    setQuery('');
    setCustomers([]);
    setShowCreateForm(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Customer</DialogTitle>
        </DialogHeader>

        {!showCreateForm ? (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, phone, or email..."
                className="pl-9"
                autoFocus
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Error State */}
            {error && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive text-sm p-3 rounded">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Results */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              {customers.length === 0 && query && !loading && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No customers found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              )}

              {customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelect(customer)}
                  className="w-full glass-card border p-3 rounded-lg text-left hover:border-primary/50 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm mb-1">{customer.name}</div>
                      <div className="space-y-0.5">
                        {customer.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Create New Button */}
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(true)}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create New Customer
              </Button>
            </div>
          </div>
        ) : (
          <QuickCustomerForm
            onSuccess={handleCustomerCreated}
            onCancel={() => setShowCreateForm(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};