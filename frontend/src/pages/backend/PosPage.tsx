import { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ProductImage } from '@/components/ui/ProductImage';
import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/hooks/useAuth';
import { useCartStore } from '@/stores/cartStore';
import { productApi } from '@/api/productApi';
import { orderApi } from '@/api/orderApi';
import type { Product } from '@/types';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  DollarSign,
  Receipt,
  User,
  Percent
} from 'lucide-react';

export default function PosPage() {
  const { tenantId } = useAuth();
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalAmount,
  } = useCartStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [processing, setProcessing] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [tax] = useState(11); // 11% tax as specified

  useEffect(() => {
    const fetchData = async () => {
      if (!tenantId) return;

      try {
        // Fetch products
        const productsResponse = await productApi.getProducts(tenantId);

        // Handle pagination structure: extract data array from response
        const productsArray = Array.isArray(productsResponse) ? productsResponse : (productsResponse as any)?.data || [];
        setProducts(productsArray);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantId]);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

    const paid = parseFloat(amountPaid);

    if (paid < finalTotal) {
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
  const subtotal = totalAmount;
  const discountAmount = subtotal * (discount / 100);
  const taxAmount = (subtotal - discountAmount) * (tax / 100);
  const finalTotal = subtotal - discountAmount + taxAmount;
  const change = parseFloat(amountPaid) - finalTotal;

  const handleClearCart = () => {
    clearCart();
    setDiscount(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Point of Sale</h1>
          <p className="text-muted-foreground">Process sales and manage transactions</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
          {/* Products Section */}
          <div className="lg:col-span-2">
            <GlassCard className="h-full flex flex-col">
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="glass border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-all group"
                      onClick={() => handleAddToCart(product)}
                    >
                      <div className="aspect-square rounded-lg overflow-hidden mb-3">
                        <ProductImage
                          src={product.thumbnail_url}
                          alt={product.name}
                          size="lg"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-medium text-sm truncate">{product.name}</h3>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-lg">{formatCurrency(product.price)}</span>
                          <Badge variant="info" className="text-xs">
                            {product.stock} left
                          </Badge>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {product.category?.name || product.sku}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      itemsPerPage={itemsPerPage}
                      totalItems={filteredProducts.length}
                    />
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Cart Section */}
          <div>
            <GlassCard className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Current Order</h3>
                <Button variant="ghost" size="sm" onClick={handleClearCart}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-auto mb-6">
                {items.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <Receipt className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-muted-foreground">No items in cart</p>
                    <p className="text-sm text-muted-foreground">Add products to start a sale</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-1 p-0.5 border rounded-lg bg-background/50">
                        <ProductImage
                          src={item.product.thumbnail_url}
                          alt={item.product.name}
                          size="sm"
                          className="w-4 h-4 rounded-sm object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0 max-w-20">
                          <p className="font-medium text-xs truncate mb-1">{item.product.name}</p>
                          <div className="flex items-center gap-0">
                            <Badge variant="outline" className="text-xs px-0 py-0 h-2.5">
                              {item.product.category?.name || 'General'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatCurrency(item.product.price)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="h-3 w-3 p-0"
                          >
                            <Minus className="h-1.5 w-1.5" />
                          </Button>
                          <span className="w-3 text-center text-sm font-semibold">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="h-3 w-3 p-0"
                          >
                            <Plus className="h-1.5 w-1.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeItem(item.product.id)}
                            className="text-red-500 hover:text-red-700 p-1 h-3 w-3"
                          >
                            <Trash2 className="h-1.5 w-1.5" />
                          </Button>
                        </div>
                        <div className="w-8 text-right flex-shrink-0">
                          <p className="font-bold text-xs">{formatCurrency(item.product.price * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {items.length > 0 && (
                <>
                  {/* Discount */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Percent className="h-4 w-4" />
                      <span className="text-sm font-medium">Discount %</span>
                    </div>
                    <Input
                      type="number"
                      placeholder="0"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      min="0"
                      max="100"
                    />
                  </div>

                  {/* Order Summary */}
                  <div className="space-y-3 mb-6 p-4 border rounded-lg bg-background/50">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({discount}%):</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Tax ({tax}%):</span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span>{formatCurrency(finalTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Buttons */}
                  <div className="space-y-3">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="md">
                      <CreditCard className="h-5 w-5 mr-2" />
                      Card Payment
                    </Button>
                    <Button variant="secondary" className="w-full" size="md">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Cash Payment
                    </Button>
                    <Button variant="ghost" className="w-full">
                      <User className="h-4 w-4 mr-2" />
                      Add Customer
                    </Button>
                  </div>
                </>
              )}
            </GlassCard>
          </div>
        </div>
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
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount ({discount}%):</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Tax ({tax}%):</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(finalTotal)}</span>
                </div>
              </div>
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

          {amountPaid && parseFloat(amountPaid) >= finalTotal && (
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
              variant="ghost"
              className="flex-1"
              onClick={() => setPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handlePayment}
              loading={processing}
              disabled={!amountPaid || parseFloat(amountPaid) < finalTotal}
            >
              Complete Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};