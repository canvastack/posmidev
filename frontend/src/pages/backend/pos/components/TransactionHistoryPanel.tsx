import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { orderApi } from '@/api/orderApi';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils/currency';
import { TransactionDetailsModal } from './TransactionDetailsModal';
import type { Order } from '@/types';
import {
  Search,
  Receipt,
  X,
  Clock,
  DollarSign,
  User,
  Calendar,
  RefreshCw,
  Printer,
  XCircle,
  Eye,
} from 'lucide-react';

interface TransactionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransactionHistoryPanel = ({
  isOpen,
  onClose,
}: TransactionHistoryPanelProps) => {
  const { tenantId } = useAuth();
  const [transactions, setTransactions] = useState<Order[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Order | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Fetch today's transactions
  const fetchTransactions = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    try {
      // Fetch today's completed orders
      const response = await orderApi.getOrders(tenantId, {
        page: 1,
        limit: 100,
        status: 'completed',
        // Filter by today (if backend supports)
        // date_from: new Date().toISOString().split('T')[0],
      });
      
      setTransactions(response.data || []);
      setFilteredTransactions(response.data || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load transactions when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
    }
  }, [isOpen, tenantId]);

  // Filter transactions based on search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredTransactions(transactions);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = transactions.filter((tx) => {
      return (
        tx.order_number?.toLowerCase().includes(term) ||
        tx.customer_name?.toLowerCase().includes(term) ||
        tx.payment_method?.toLowerCase().includes(term)
      );
    });

    setFilteredTransactions(filtered);
  }, [searchTerm, transactions]);

  const handleViewDetails = (transaction: Order) => {
    setSelectedTransaction(transaction);
    setDetailsModalOpen(true);
  };

  const handleReprintReceipt = (transaction: Order) => {
    // Trigger receipt print
    // This could open the ReceiptPreviewModal with the transaction data
    console.log('Reprint receipt for:', transaction.id);
    // TODO: Integrate with ReceiptPreviewModal
  };

  const handleVoidTransaction = async (transaction: Order) => {
    if (!confirm(`Void transaction ${transaction.order_number}? This action cannot be undone.`)) {
      return;
    }

    try {
      // TODO: Implement void API call
      // await orderApi.voidOrder(tenantId, transaction.id);
      console.log('Void transaction:', transaction.id);
      
      // Refresh list
      fetchTransactions();
    } catch (error) {
      console.error('Failed to void transaction:', error);
      alert('Failed to void transaction. Please try again.');
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'card':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'qris':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'split':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const time = date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dateStr = date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
    });
    return { time, date: dateStr };
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Transaction History"
        size="2xl"
      >
        <div className="space-y-4">
          {/* Header Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order #, customer, or payment method..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTransactions}
              disabled={loading}
              className="flex-shrink-0"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900">
                  <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Transactions</p>
                  <p className="text-lg font-bold">{filteredTransactions.length}</p>
                </div>
              </div>
            </div>

            <div className="glass-card p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-green-100 dark:bg-green-900">
                  <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(
                      filteredTransactions.reduce((sum, tx) => sum + (tx.final_total || 0), 0)
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-card p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900">
                  <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unique Customers</p>
                  <p className="text-lg font-bold">
                    {new Set(filteredTransactions.map(tx => tx.customer_id).filter(Boolean)).size}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Loading transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'No transactions found' : 'No transactions today'}
                </p>
              </div>
            ) : (
              filteredTransactions.map((transaction) => {
                const { time, date } = formatDateTime(transaction.created_at);
                
                return (
                  <div
                    key={transaction.id}
                    className="glass-card p-3 rounded-lg border hover:border-primary/50 transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Order Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-sm">#{transaction.order_number}</p>
                          <Badge
                            className={`text-xs ${getPaymentMethodColor(transaction.payment_method || '')}`}
                          >
                            {transaction.payment_method || 'Unknown'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {date}
                          </span>
                          {transaction.customer_name && (
                            <span className="flex items-center gap-1 truncate">
                              <User className="h-3 w-3" />
                              {transaction.customer_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Center: Amount */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-base">
                          {formatCurrency(transaction.final_total || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.items?.length || 0} items
                        </p>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(transaction)}
                          className="h-8 w-8 p-0"
                          title="View Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReprintReceipt(transaction)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
                          title="Reprint Receipt"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVoidTransaction(transaction)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          title="Void Transaction"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
          onReprint={() => handleReprintReceipt(selectedTransaction)}
          onVoid={() => handleVoidTransaction(selectedTransaction)}
        />
      )}
    </>
  );
};