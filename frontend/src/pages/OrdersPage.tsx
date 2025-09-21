import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { useAuth } from '../hooks/useAuth';
import { Order } from '../types';
import { EyeIcon } from '@heroicons/react/24/outline';

export const OrdersPage: React.FC = () => {
  const { tenantId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    // Note: The backend doesn't have a GET orders endpoint yet
    // This is a placeholder for when it's implemented
    setLoading(false);
  }, [tenantId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setDetailModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and manage your transaction history
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No orders found</p>
              <p className="text-sm text-gray-400 mt-1">
                Orders will appear here after you make sales through the POS system
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.invoice_number}
                    </TableCell>
                    <TableCell>
                      {formatDate(order.created_at)}
                    </TableCell>
                    <TableCell>
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(order.total_amount)}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {order.payment_method}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Order Details - ${selectedOrder?.invoice_number}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900">Order Information</h4>
                <dl className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Invoice:</dt>
                    <dd className="text-sm font-medium">{selectedOrder.invoice_number}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Date:</dt>
                    <dd className="text-sm">{formatDate(selectedOrder.created_at)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Payment Method:</dt>
                    <dd className="text-sm">{selectedOrder.payment_method}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Payment Information</h4>
                <dl className="mt-2 space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Total:</dt>
                    <dd className="text-sm font-medium">{formatCurrency(selectedOrder.total_amount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Paid:</dt>
                    <dd className="text-sm">{formatCurrency(selectedOrder.amount_paid)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">Change:</dt>
                    <dd className="text-sm">{formatCurrency(selectedOrder.change_amount)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Order Items</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Product
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Price
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedOrder.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm">{item.product_name}</td>
                        <td className="px-4 py-2 text-sm">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-2 text-sm font-medium">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};