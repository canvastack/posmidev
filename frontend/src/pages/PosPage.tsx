import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useAuth } from '../hooks/useAuth';
import { useCartStore } from '../stores/cartStore';
import { productApi } from '../api/productApi';
import { orderApi } from '../api/orderApi';
import type { Product } from '../types';
import { PlusIcon, MinusIcon, TrashIcon } from '@heroicons/react/24/outline';

export const PosPage: React.FC = () => {
  const { tenantId } = useAuth();
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalAmount,
    getTotalItems,
  } = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!tenantId) return;

      try {
        const response = await productApi.getProducts(tenantId);
        // Handle pagination structure: extract data array from response
        const productsArray = Array.isArray(response) ? response : (response as any)?.data || [];
        setProducts(productsArray);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [tenantId]);

  const handleAddToCart = (product: Product) => {
    if (product.stock > 0) {
      addItem(product, 1);
    }
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handlePayment = async () => {
    if (!tenantId || items.length === 0) return;

    const totalAmount = getTotalAmount();
    const paid = parseFloat(amountPaid);

    if (paid < totalAmount) {
      alert('Insufficient payment amount');
      return;
    }

    setProcessing(true);

    try {
      const orderData = {
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        payment_method: paymentMethod,
        amount_paid: paid,
      };

      await orderApi.createOrder(tenantId, orderData);
      
      // Clear cart and close modal
      clearCart();
      setPaymentModalOpen(false);
      setAmountPaid('');
      
      alert('Transaction completed successfully!');
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const totalAmount = getTotalAmount();
  const change = parseFloat(amountPaid) - totalAmount;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Products Grid */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Products</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    product.stock > 0
                      ? 'hover:bg-gray-50 border-gray-200'
                      : 'bg-gray-100 border-gray-300 cursor-not-allowed'
                  }`}
                  onClick={() => handleAddToCart(product)}
                >
                  <div className="text-center">
                    <h3 className="font-medium text-sm mb-1">{product.name}</h3>
                    <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>
                    <p className="font-semibold text-primary-600">
                      {formatCurrency(product.price)}
                    </p>
                    <p className={`text-xs mt-1 ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Stock: {product.stock}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cart */}
      <div className="lg:col-span-1">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Cart ({getTotalItems()})</h2>
              {items.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Cart is empty</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.product.name}</h4>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(item.product.price)} each
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 rounded-full hover:bg-gray-200"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 rounded-full hover:bg-gray-200"
                          disabled={item.quantity >= item.product.stock}
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="p-1 rounded-full hover:bg-red-100 text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-lg font-bold text-primary-600">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
                <Button
                  className="w-full"
                  onClick={() => setPaymentModalOpen(true)}
                >
                  Pay Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Process Payment"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span>Total Amount:</span>
              <span className="font-semibold">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="input"
            >
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="QRIS">QRIS</option>
            </select>
          </div>

          <Input
            label="Amount Paid"
            type="number"
            step="0.01"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            placeholder="0.00"
          />

          {amountPaid && parseFloat(amountPaid) >= totalAmount && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Change:</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(change)}
                </span>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handlePayment}
              loading={processing}
              disabled={!amountPaid || parseFloat(amountPaid) < totalAmount}
            >
              Complete Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};