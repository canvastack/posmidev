import { useEffect, useState, useRef } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
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
  Percent,
  QrCode,
  Keyboard,
  Package,
  MonitorIcon,
} from 'lucide-react';

// Import new hooks and components
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { useProductContextMenu } from './hooks/useProductContextMenu';
import { ShortcutsModal } from './components/ShortcutsModal';
import { BarcodeScannerIndicator } from './components/BarcodeScannerIndicator';
import { LiveStatsWidget } from './components/LiveStatsWidget';
import { ParkedOrdersPanel } from './components/ParkedOrdersPanel';
import { HoldOrderModal } from './components/HoldOrderModal';
import { CustomerSearchModal } from './components/CustomerSearchModal';
import { CustomerCard } from './components/CustomerCard';
import { SmartDiscountModal } from './components/SmartDiscountModal';
import { ReceiptPreviewModal } from './components/ReceiptPreviewModal';
import { SplitPaymentModal } from './components/SplitPaymentModal';
import { TransactionHistoryPanel } from './components/TransactionHistoryPanel';
import { MobileCartPanel } from './components/MobileCartPanel';
import { MobileCartButton } from './components/MobileCartButton';
import { ProductContextMenu } from './components/ProductContextMenu';
import { ProductQuickViewModal } from './components/ProductQuickViewModal';
// Phase 3b: BOM Integration Components
import { RecipeBadge } from './components/RecipeBadge';
import { RecipeDetailsModal } from './components/RecipeDetailsModal';
import { MaterialStockWarning } from './components/MaterialStockWarning';
// Phase 4A: Customer Display Integration
import { useCustomerDisplay, createCustomerDisplayData } from '@/hooks/useCustomerDisplay';
import type { Customer } from '@/api/customersApi';
import { formatCurrency } from '@/lib/utils/currency';
import { bomCalculationApi } from '@/api/bomApi';
import type { BOMCalculationResult } from '@/types/bom';
// Phase 4A Day 6: Material Cost Tracking Components
import { CartCostSync } from '@/components/cost/CartCostSync';
import { ProfitMarginIndicator } from '@/components/cost/ProfitMarginIndicator';
import { CostAlertBadge } from '@/components/cost/CostAlertBadge';
import { MaterialCostSummary } from '@/components/cost/MaterialCostSummary';

/**
 * POS Page - Enhanced with Phase 1, 2, & 3 Features
 * 
 * Phase 1 Enhancements (COMPLETE):
 * ✅ Fixed payment buttons (critical bug)
 * ✅ Fixed cart item sizing (critical bug)
 * ✅ Keyboard shortcuts (F1-F12)
 * ✅ Barcode scanner integration
 * ✅ Improved search UX
 * ✅ Visual feedback & indicators
 * 
 * Phase 2 Enhancements (COMPLETE):
 * ✅ Hold/Park Orders (F8 shortcut)
 * ✅ Live Stats Dashboard Widget
 * ✅ Customer Integration (Search, select, quick create)
 * ✅ Smart Discount System (F5 shortcut)
 * ✅ Receipt System (Print, Email, WhatsApp)
 * ✅ Split Payment Support
 * 
 * Phase 3a Enhancements (COMPLETE):
 * ✅ Transaction History Panel (F7 shortcut)
 * ✅ Responsive Mobile Layout
 * ✅ Product Quick Actions
 * 
 * Phase 3b Enhancements (COMPLETE):
 * ✅ BOM Integration (Material-aware stock calculation)
 * 🔴 Offline Mode (Coming next)
 * 
 * Phase 4A Enhancements (IN PROGRESS):
 * ✅ Customer Display Screen (Dual-screen support) - Day 1-2 COMPLETE
 * ✅ Advanced Analytics Dashboard - Day 3-4 COMPLETE
 * ✅ Material Cost Backend API - Day 5 COMPLETE
 * 🔄 Material Cost UI Integration - Day 6 IN PROGRESS
 * 
 * Compliance:
 * ✅ Design tokens from index.css
 * ✅ Dark mode support
 * ✅ Responsive design
 * ✅ Tenant isolation
 */
export default function PosPage() {
  const { tenantId } = useAuth();
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getTotalAmount,
    discount,
    setDiscount,
    getDiscountAmount,
    holdOrder,
    parkedOrders,
    customerId,
    customerName,
    customerPhone,
    customerEmail,
    setCustomer,
    clearCustomer,
    // Phase 4A Day 6: Cost tracking state
    costAnalysis,
    costSummary,
    isCostLoading,
    costError,
  } = useCartStore();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'QRIS'>('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showHoldOrderModal, setShowHoldOrderModal] = useState(false);
  const [showParkedOrders, setShowParkedOrders] = useState(true);
  
  // Phase 2 Modal States
  const [showSmartDiscountModal, setShowSmartDiscountModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showSplitPaymentModal, setShowSplitPaymentModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [tax] = useState(11); // 11% tax as specified
  
  // Phase 3 Modal States
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false); // Mobile cart panel
  const [showQuickView, setShowQuickView] = useState(false);
  const [quickViewProductId, setQuickViewProductId] = useState<string | null>(null);
  
  // Phase 3b: BOM Integration States
  const [bomData, setBomData] = useState<Map<string, BOMCalculationResult>>(new Map());
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipeProductId, setRecipeProductId] = useState<string | null>(null);
  const [recipeProductName, setRecipeProductName] = useState<string>('');
  const [showMaterialWarning, setShowMaterialWarning] = useState(false);
  const [materialWarningProduct, setMaterialWarningProduct] = useState<Product | null>(null);
  const [insufficientMaterials, setInsufficientMaterials] = useState<any[]>([]);

  // Phase 4A: Customer Display Hook
  const { sendMessage: sendCustomerDisplayMessage } = useCustomerDisplay();

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Phase 3a: Product Context Menu Hook
  const {
    showMenu: showContextMenu,
    menuPosition,
    selectedProductId,
    selectedProductName,
    closeMenu: closeContextMenu,
    getContextMenuProps,
    wasLongPress,
  } = useProductContextMenu();

  // Fetch products
  useEffect(() => {
    const fetchData = async () => {
      if (!tenantId) return;

      try {
        const productsResponse = await productApi.getProducts(tenantId);
        const productsArray = Array.isArray(productsResponse) 
          ? productsResponse 
          : (productsResponse as any)?.data || [];
        setProducts(productsArray);
        
        // Phase 3b: Fetch BOM data for products with recipes
        if (productsArray.length > 0) {
          fetchBOMData(productsArray);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantId]);
  
  // Phase 3b: Fetch BOM data for all products
  const fetchBOMData = async (productList: Product[]) => {
    if (!tenantId || productList.length === 0) return;

    try {
      const productIds = productList.map(p => p.id);
      
      // Bulk fetch BOM availability
      const result = await bomCalculationApi.getBulkAvailability(tenantId, { product_ids: productIds });
      
      if (result.success && result.data?.results) {
        // Store in Map for O(1) lookup
        const dataMap = new Map<string, BOMCalculationResult>();
        
        // Backend now returns object keyed by productId, not array
        Object.entries(result.data.results).forEach(([productId, bom]) => {
          dataMap.set(productId, bom as BOMCalculationResult);
        });
        
        setBomData(dataMap);
        console.log(`✅ BOM data loaded for ${dataMap.size} products`);
        
        // Log any errors for debugging
        if (result.data.errors && Object.keys(result.data.errors).length > 0) {
          console.warn('⚠️ BOM calculation errors:', result.data.errors);
        }
      }
    } catch (error) {
      console.error('Failed to fetch BOM data:', error);
      // Don't block POS if BOM fetch fails
    }
  };

  // Product filtering and search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ============================================
  // PHASE 4A: CUSTOMER DISPLAY SYNCHRONIZATION
  // ============================================

  // Sync cart changes to customer display (< 100ms latency)
  useEffect(() => {
    const subtotal = getTotalAmount();
    const discountAmount = getDiscountAmount();
    const taxAmount = (subtotal - discountAmount) * (tax / 100);
    const total = subtotal - discountAmount + taxAmount;

    // Send cart update to customer display
    sendCustomerDisplayMessage({
      type: 'cart-updated',
      timestamp: Date.now(),
      data: createCustomerDisplayData('cart', {
        items,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total,
      }),
    });
  }, [items, discount, tax, getTotalAmount, getDiscountAmount, sendCustomerDisplayMessage]);

  // Send checkout message when payment modal opens
  useEffect(() => {
    if (paymentModalOpen && items.length > 0) {
      const subtotal = getTotalAmount();
      const discountAmount = getDiscountAmount();
      const taxAmount = (subtotal - discountAmount) * (tax / 100);
      const total = subtotal - discountAmount + taxAmount;

      sendCustomerDisplayMessage({
        type: 'checkout-started',
        timestamp: Date.now(),
        data: createCustomerDisplayData('checkout', {
          items,
          subtotal,
          discount: discountAmount,
          tax: taxAmount,
          total,
        }),
      });
    }
  }, [paymentModalOpen, items, discount, tax, getTotalAmount, getDiscountAmount, sendCustomerDisplayMessage]);

  // ============================================
  // PAYMENT HANDLERS - FIX FOR CRITICAL BUG
  // ============================================
  
  const handlePaymentClick = (method: 'Cash' | 'Card' | 'QRIS') => {
    if (items.length === 0) return;
    
    setPaymentMethod(method);
    
    // Auto-fill amount for Card & QRIS (exact amount)
    if (method === 'Card' || method === 'QRIS') {
      setAmountPaid(finalTotal.toFixed(2));
    } else {
      // Clear amount for Cash (cashier will enter)
      setAmountPaid('');
    }
    
    setPaymentModalOpen(true);
  };

  const handleSplitPaymentClick = () => {
    if (items.length === 0) {
      alert('Cart is empty');
      return;
    }
    setShowSplitPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!tenantId || items.length === 0) return;

    const paid = parseFloat(amountPaid);

    if (isNaN(paid) || paid < finalTotal) {
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
        // 🔧 FIX: Convert payment method to lowercase to match backend validation
        payment_method: paymentMethod.toLowerCase(),
        amount_paid: paid,
      };

      const response = await orderApi.createOrder(tenantId, orderData);
      
      // Prepare receipt data - PHASE 2 ENHANCEMENT
      // Phase 4A Day 6: Include cost summary for manager view
      const changeAmount = paid - finalTotal;
      const receiptData = {
        orderId: response.id || `ORD-${Date.now()}`,
        orderNumber: `#${(response.id || Date.now().toString()).substring(0, 8).toUpperCase()}`,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        cashierName: 'Current User', // TODO: Get from auth
        customerName,
        customerId,
        items: [...items],
        subtotal,
        discount,
        discountType: 'percentage' as const,
        tax: taxAmount,
        taxRate: tax,
        total: finalTotal,
        paymentMethod,
        amountPaid: paid,
        change: changeAmount,
        costSummary, // Phase 4A Day 6: Include cost analysis
      };

      setLastReceipt(receiptData);
      
      // Phase 4A: Send payment completed message to customer display
      sendCustomerDisplayMessage({
        type: 'payment-completed',
        timestamp: Date.now(),
        data: createCustomerDisplayData('complete', {
          items: [...items],
          subtotal,
          discount: getDiscountAmount(),
          tax: taxAmount,
          total: finalTotal,
          paymentAmount: paid,
          change: changeAmount,
          transactionId: receiptData.orderNumber,
        }),
      });
      
      // Clear cart and close payment modal
      clearCart();
      setPaymentModalOpen(false);
      setAmountPaid('');
      
      // Show receipt modal
      setShowReceiptModal(true);
    } catch (error) {
      console.error('Payment failed:', error);
      // 🔧 IMPROVE: Log full error details for debugging
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as any;
        console.error('Error details:', {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          message: axiosError.message,
        });
      }
      alert('❌ Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSplitPayment = async (payments: any[], change: number) => {
    if (!tenantId || items.length === 0) return;

    setProcessing(true);

    try {
      const orderData = {
        items: items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        payment_method: 'split',
        payment_details: payments,
        amount_paid: payments.reduce((sum, p) => sum + p.amount, 0),
      };

      const response = await orderApi.createOrder(tenantId, orderData);
      
      // Prepare receipt data
      // Phase 4A Day 6: Include cost summary for manager view
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const receiptData = {
        orderId: response.id || `ORD-${Date.now()}`,
        orderNumber: `#${(response.id || Date.now().toString()).substring(0, 8).toUpperCase()}`,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        cashierName: 'Current User',
        customerName,
        customerId,
        items: [...items],
        subtotal,
        discount,
        discountType: 'percentage' as const,
        tax: taxAmount,
        taxRate: tax,
        total: finalTotal,
        paymentMethod: `Split (${payments.map(p => p.method).join(' + ')})`,
        amountPaid: totalPaid,
        change,
        costSummary, // Phase 4A Day 6: Include cost analysis
      };

      setLastReceipt(receiptData);
      
      // Clear and show receipt
      clearCart();
      setShowSplitPaymentModal(false);
      setShowReceiptModal(true);
    } catch (error) {
      console.error('Split payment error:', error);
      alert('❌ Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleApplyDiscount = (amount: number, type: 'percentage' | 'flat') => {
    setDiscount(amount);
    // Store discount type if needed for cart store enhancement
    console.log(`Discount applied: ${amount} (${type})`);
  };

  // ============================================
  // CART HANDLERS
  // ============================================

  const handleAddToCart = (product: Product) => {
    // Phase 3b: Check BOM material availability before adding
    const bomInfo = bomData.get(product.id);
    
    if (bomInfo && bomInfo.all_materials_availability && bomInfo.all_materials_availability.length > 0) {
      // Product has recipe - check if materials are sufficient
      const hasInsufficientMaterials = bomInfo.all_materials_availability.some(m => !m.sufficient);
      
      if (hasInsufficientMaterials) {
        // Show material warning modal
        const insufficient = bomInfo.all_materials_availability
          .filter(m => !m.sufficient)
          .map(m => ({
            material_id: m.material_id,
            material_name: m.material_name,
            needed: m.required_quantity,
            available: m.available_stock,
            unit: 'units',
            shortfall: m.required_quantity - m.available_stock,
          }));
        
        setInsufficientMaterials(insufficient);
        setMaterialWarningProduct(product);
        setShowMaterialWarning(true);
        return; // Don't add to cart yet - wait for user decision
      }
      
      // Materials sufficient - check if max servings > 0
      if (bomInfo.maximum_producible_quantity === 0) {
        alert('⚠️ Cannot make this product - no materials available');
        return;
      }
    }
    
    // Standard stock check
    if (product.stock > 0) {
      addItem(product, 1);
    } else {
      alert('⚠️ Product out of stock');
    }
  };
  
  // Phase 3b: Handle continue with insufficient materials (override)
  const handleContinueWithInsufficientMaterials = () => {
    if (materialWarningProduct) {
      addItem(materialWarningProduct, 1);
      console.log('⚠️ Added to cart with insufficient materials (override)');
    }
    setShowMaterialWarning(false);
    setMaterialWarningProduct(null);
    setInsufficientMaterials([]);
  };

  // ============================================
  // PRODUCT QUICK ACTIONS - PHASE 3a FEATURE 3
  // ============================================

  const handleQuickAdd = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      handleAddToCart(product);
    }
  };

  const handleQuickView = (productId: string) => {
    setQuickViewProductId(productId);
    setShowQuickView(true);
  };

  const handleCheckStock = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      alert(`📦 Stock for ${product.name}: ${product.stock} ${product.unit || 'units'}`);
    }
  };

  const handleAddToFavorites = (productId: string) => {
    // TODO: Implement favorites functionality
    alert('⭐ Add to Favorites feature - Coming soon!');
  };

  const handlePriceHistory = (productId: string) => {
    // TODO: Implement price history
    alert('📊 Price History feature - Coming soon!');
  };

  const handleEditProduct = (productId: string) => {
    // TODO: Navigate to product edit page or open edit modal
    alert('✏️ Edit Product feature - Coming soon!');
  };
  
  // Phase 3b: View Recipe Handler
  const handleViewRecipe = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setRecipeProductId(productId);
      setRecipeProductName(product.name);
      setShowRecipeModal(true);
    }
  };

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    const item = items.find(i => i.product.id === productId);
    
    if (newQuantity <= 0) {
      removeItem(productId);
    } else if (item && newQuantity > item.product.stock) {
      alert(`⚠️ Only ${item.product.stock} items available in stock`);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleClearCart = () => {
    if (items.length === 0) return;
    
    if (confirm('Clear all items from cart?')) {
      clearCart();
      
      // Phase 4A: Send transaction reset to customer display
      sendCustomerDisplayMessage({
        type: 'transaction-reset',
        timestamp: Date.now(),
      });
    }
  };

  // ============================================
  // HOLD/PARK ORDER - PHASE 2 FEATURE
  // ============================================

  const handleHoldOrder = (notes?: string) => {
    if (items.length === 0) {
      alert('Cannot park an empty cart');
      return;
    }

    holdOrder(notes);
    console.log('✅ Order parked successfully');
    alert(`Order parked successfully! ${parkedOrders.length + 1} orders in queue.`);
  };

  // ============================================
  // CUSTOMER INTEGRATION - NEW FEATURE
  // ============================================

  const handleCustomerSelect = (customer: Customer) => {
    setCustomer(
      customer.id, 
      customer.name, 
      customer.phone || undefined, 
      customer.email || undefined
    );
    setShowCustomerModal(false);
  };

  const handleCustomerRemove = () => {
    clearCustomer();
  };

  // ============================================
  // BARCODE SCANNER - NEW FEATURE
  // ============================================

  const handleBarcodeScan = async (barcode: string) => {
    console.log('Barcode scanned:', barcode);
    
    // Find product by barcode/SKU
    const product = products.find(p => 
      p.sku === barcode || 
      p.barcode === barcode
    );

    if (product) {
      handleAddToCart(product);
      console.log('✅ Product added:', product.name);
    } else {
      console.warn('⚠️ Product not found for barcode:', barcode);
      alert(`Product with barcode "${barcode}" not found`);
    }
  };

  const { isScanning, currentBuffer } = useBarcodeScanner({
    onScan: handleBarcodeScan,
    minLength: 4,
    enabled: !paymentModalOpen && !showShortcutsModal,
  });

  // ============================================
  // KEYBOARD SHORTCUTS - NEW FEATURE
  // ============================================

  useKeyboardShortcuts(
    {
      onCashPayment: () => handlePaymentClick('Cash'),
      onCardPayment: () => handlePaymentClick('Card'),
      onQRISPayment: () => handlePaymentClick('QRIS'),
      onHoldOrder: () => setShowHoldOrderModal(true),
      onClearCart: () => handleClearCart(),
      onFocusSearch: () => searchInputRef.current?.focus(),
      onShowShortcuts: () => setShowShortcutsModal(true),
      onApplyDiscount: () => setShowSmartDiscountModal(true), // F5 - Phase 2
      onTransactionHistory: () => setShowTransactionHistory(true), // F7 - Phase 3
      onEscape: () => {
        setPaymentModalOpen(false);
        setShowShortcutsModal(false);
        setShowHoldOrderModal(false);
        setShowCustomerModal(false);
        setShowSmartDiscountModal(false);
        setShowSplitPaymentModal(false);
        setShowReceiptModal(false);
        setShowTransactionHistory(false);
        setShowMobileCart(false);
      },
    },
    !paymentModalOpen && !showShortcutsModal && !showHoldOrderModal && !showCustomerModal && !showSmartDiscountModal && !showSplitPaymentModal && !showReceiptModal && !showTransactionHistory && !showMobileCart
  );

  // ============================================
  // CALCULATIONS
  // ============================================

  const subtotal = getTotalAmount();
  const discountAmount = getDiscountAmount();
  const taxAmount = (subtotal - discountAmount) * (tax / 100);
  const finalTotal = subtotal - discountAmount + taxAmount;
  const change = parseFloat(amountPaid) - finalTotal;

  // ============================================
  // RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Barcode Scanner Indicator */}
      <BarcodeScannerIndicator isScanning={isScanning} currentBuffer={currentBuffer} />
      
      {/* Phase 4A Day 6: Auto Cost Calculation */}
      <CartCostSync tenantId={tenantId} enabled={true} debounceMs={300} />
      
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-6">
        {/* Header - Responsive */}
        <div className="mb-4 md:mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">Point of Sale</h1>
            <p className="text-sm md:text-base text-muted-foreground hidden sm:block">
              Process sales and manage transactions
            </p>
          </div>
          <div className="flex gap-2">
            {/* Phase 4A: Customer Display Button */}
            <Button
              variant="outline"
              onClick={() => {
                // Open customer display in new window
                const width = 800;
                const height = 600;
                const left = window.screen.width - width;
                const top = 0;
                window.open(
                  '/admin/pos/customer-display',
                  'customer-display',
                  `width=${width},height=${height},left=${left},top=${top}`
                );
              }}
              className="gap-2 h-10 md:h-auto"
              title="Open Customer Display (Phase 4A)"
            >
              <MonitorIcon className="h-4 w-4" />
              <span className="hidden lg:inline">Customer Display</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowShortcutsModal(true)}
              className="gap-2 h-10 md:h-auto"
            >
              <Keyboard className="h-4 w-4" />
              <span className="hidden sm:inline">Shortcuts (?)</span>
              <span className="sm:hidden">?</span>
            </Button>
          </div>
        </div>

        {/* PHASE 2: Live Stats Dashboard Widget */}
        <div className="mb-6">
          <LiveStatsWidget />
        </div>

        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 h-[calc(100vh-380px)]">
          {/* Products Section - Full width on mobile, 2/3 on desktop */}
          <div className="md:col-span-1 lg:col-span-2">
            <GlassCard className="h-full flex flex-col p-4 md:p-6">
              {/* Search Bar - Responsive */}
              <div className="mb-4 md:mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 md:h-auto text-sm md:text-base"
                  />
                </div>
              </div>

              {/* Products Grid */}
              <div className="flex-1 overflow-auto custom-scrollbar">
                {paginatedProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No products found</p>
                    <p className="text-sm text-muted-foreground">Try adjusting your search</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {paginatedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="glass-card border rounded-lg md:rounded-xl p-3 md:p-4 cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all group active:scale-95"
                        onClick={() => {
                          // Prevent adding to cart if long-press was triggered (context menu opened)
                          if (!wasLongPress()) {
                            handleAddToCart(product);
                          }
                        }}
                        {...getContextMenuProps(product.id, product.name)}
                      >
                        <div className="aspect-square rounded-md md:rounded-lg overflow-hidden mb-2 md:mb-3">
                          <ProductImage
                            src={product.thumbnail_url}
                            alt={product.name}
                            size="lg"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                        <div className="space-y-1.5 md:space-y-2">
                          <h3 className="font-semibold text-xs md:text-sm truncate" title={product.name}>
                            {product.name}
                          </h3>
                          <div className="flex items-center justify-between gap-1 md:gap-2">
                            <span className="font-bold text-sm md:text-base">
                              {formatCurrency(product.price)}
                            </span>
                            <Badge 
                              variant={product.stock > 10 ? "success" : product.stock > 0 ? "warning" : "danger"}
                              className="text-[10px] md:text-xs px-1.5 md:px-2"
                            >
                              {product.stock}
                            </Badge>
                          </div>
                          {product.category?.name && (
                            <Badge variant="secondary" className="text-[10px] md:text-xs">
                              {product.category.name}
                            </Badge>
                          )}
                          
                          {/* PHASE 3b: Recipe Badge (BOM Integration) */}
                          {bomData.get(product.id) && (
                            <div className="mt-1.5">
                              <RecipeBadge bomData={bomData.get(product.id)!} />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 pt-4 border-t">
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

          {/* Cart Section - Hidden on mobile (< md), shown on tablet+ */}
          <div className="hidden lg:block">
            <GlassCard className="h-full flex flex-col p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold">Current Order</h3>
                  {items.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {items.length} item(s)
                    </p>
                  )}
                </div>
                {items.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearCart}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Customer Section */}
              {customerName ? (
                <div className="mb-4">
                  <CustomerCard
                    customerId={customerId!}
                    customerName={customerName}
                    customerPhone={customerPhone}
                    customerEmail={customerEmail}
                    onRemove={handleCustomerRemove}
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCustomerModal(true)}
                    className="w-full gap-2"
                  >
                    <User className="h-4 w-4" />
                    Add Customer
                  </Button>
                </div>
              )}

              {/* Cart Items */}
              <div className="flex-1 overflow-auto mb-6 custom-scrollbar">
                {items.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <Receipt className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-muted-foreground font-medium">No items in cart</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add products to start a sale
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* FIXED CART ITEM SIZING - CRITICAL BUG FIX */}
                    {items.map((item) => {
                      // Phase 4A Day 6: Get cost info for this product
                      const productCostInfo = costAnalysis?.find(
                        (c) => c.product_id === item.product.id
                      );
                      
                      return (
                        <div 
                          key={item.product.id} 
                          className="flex flex-col gap-2 p-3 border rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
                        >
                          {/* Main Cart Item Row */}
                          <div className="flex items-center gap-3">
                            {/* Product Image - FIXED: Now 56px (h-14) instead of 16px (h-4) */}
                            <ProductImage
                              src={item.product.thumbnail_url}
                              alt={item.product.name}
                              size="sm"
                              className="w-14 h-14 rounded-md object-cover flex-shrink-0"
                            />
                            
                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate mb-1">
                                {item.product.name}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {item.product.category?.name || 'General'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  @ {formatCurrency(item.product.price)}
                                </span>
                                
                                {/* Phase 4A Day 6: Profit Margin Indicator */}
                                {productCostInfo?.has_recipe && (
                                  <ProfitMarginIndicator 
                                    margin={productCostInfo.profit_margin} 
                                    size="sm" 
                                  />
                                )}
                              </div>
                            </div>
                        
                        {/* Quantity Controls - FIXED: Now 28px (h-7) instead of 12px (h-3) */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateQuantity(item.product.id, item.quantity - 1);
                            }}
                            className="h-7 w-7 p-0 rounded-md"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateQuantity(item.product.id, item.quantity + 1);
                            }}
                            className="h-7 w-7 p-0 rounded-md"
                            disabled={item.quantity >= item.product.stock}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        
                            {/* Item Total & Remove */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-right min-w-[80px]">
                                <p className="font-bold text-sm">
                                  {formatCurrency(item.product.price * item.quantity)}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeItem(item.product.id);
                                }}
                                className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-7 w-7 p-0 rounded-md"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Phase 4A Day 6: Cost Alert (if low margin) */}
                          {productCostInfo?.has_recipe && productCostInfo.alert && (
                            <div className="ml-[68px] animate-slideIn">
                              <CostAlertBadge alert={productCostInfo.alert} size="sm" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Discount & Summary */}
              {items.length > 0 && (
                <>
                  {/* Smart Discount Button - PHASE 2 ENHANCEMENT */}
                  <div className="mb-4">
                    <Button
                      variant="outline"
                      className="w-full border-2 border-dashed hover:bg-accent/50"
                      onClick={() => setShowSmartDiscountModal(true)}
                    >
                      <Percent className="h-4 w-4 mr-2" />
                      {discount > 0 ? (
                        <span>Discount: {discount}% <span className="text-xs ml-1">(Click to change)</span></span>
                      ) : (
                        <span>Apply Discount</span>
                      )}
                      <kbd className="ml-auto px-2 py-1 text-xs border rounded bg-muted">F5</kbd>
                    </Button>
                  </div>

                  {/* Order Summary */}
                  <div className="space-y-3 mb-6 p-4 border rounded-lg bg-muted/20">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-success-600">
                        <span>Discount ({discount}%):</span>
                        <span className="font-medium">-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({tax}%):</span>
                      <span className="font-medium">{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-primary">{formatCurrency(finalTotal)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Phase 4A Day 6: Material Cost Summary */}
                  {costSummary && costSummary.total_cost > 0 && (
                    <div className="mb-6 animate-slideIn">
                      <MaterialCostSummary summary={costSummary} />
                    </div>
                  )}
                  
                  {/* Phase 4A Day 6: Cost Loading Indicator */}
                  {isCostLoading && (
                    <div className="mb-6 flex items-center justify-center py-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 mr-2"></div>
                      Calculating costs...
                    </div>
                  )}
                  
                  {/* Phase 4A Day 6: Cost Error */}
                  {costError && (
                    <div className="mb-6 p-3 border border-danger-200 dark:border-danger-800 rounded-lg bg-danger-50 dark:bg-danger-900/20">
                      <p className="text-xs text-danger-600 dark:text-danger-400">{costError}</p>
                    </div>
                  )}

                  {/* FIXED PAYMENT BUTTONS - CRITICAL BUG FIX */}
                  <div className="space-y-3">
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 text-white" 
                      size="lg"
                      onClick={() => handlePaymentClick('Cash')}
                    >
                      <DollarSign className="h-5 w-5 mr-2" />
                      Cash Payment
                      <kbd className="ml-auto px-2 py-1 text-xs border rounded bg-white/20">F1</kbd>
                    </Button>
                    
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                      size="lg"
                      onClick={() => handlePaymentClick('Card')}
                    >
                      <CreditCard className="h-5 w-5 mr-2" />
                      Card Payment
                      <kbd className="ml-auto px-2 py-1 text-xs border rounded bg-white/20">F2</kbd>
                    </Button>
                    
                    <Button 
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
                      size="lg"
                      onClick={() => handlePaymentClick('QRIS')}
                    >
                      <QrCode className="h-5 w-5 mr-2" />
                      QRIS Payment
                      <kbd className="ml-auto px-2 py-1 text-xs border rounded bg-white/20">F3</kbd>
                    </Button>

                    {/* PHASE 2: Split Payment Button */}
                    <Button 
                      variant="outline" 
                      className="w-full border-2 border-dashed border-primary hover:bg-primary/10"
                      size="md"
                      onClick={handleSplitPaymentClick}
                      disabled={items.length === 0}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Split Payment
                    </Button>

                    {/* PHASE 2: Hold Order Button */}
                    <Button 
                      variant="outline" 
                      className="w-full border-orange-500 hover:bg-orange-500/10 text-orange-600 dark:text-orange-400"
                      size="md"
                      onClick={() => setShowHoldOrderModal(true)}
                      disabled={items.length === 0}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Hold Order
                      <kbd className="ml-auto px-2 py-1 text-xs border rounded bg-muted">F8</kbd>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      size="md"
                      disabled
                    >
                      <User className="h-4 w-4 mr-2" />
                      Add Customer (Coming Soon)
                    </Button>
                  </div>

                  {/* PHASE 2: Parked Orders Section */}
                  {parkedOrders.length > 0 && (
                    <div className="mt-6 pt-6 border-t">
                      <ParkedOrdersPanel />
                    </div>
                  )}
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
        title={`Process ${paymentMethod} Payment`}
        size="md"
      >
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-success-600">
                <span>Discount ({discount}%):</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Tax ({tax}%):</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-primary">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'Cash' | 'Card' | 'QRIS')}
              className="input"
            >
              <option value="Cash">Cash</option>
              <option value="Card">Debit/Credit Card</option>
              <option value="QRIS">QRIS (QR Payment)</option>
            </select>
          </div>

          {/* Amount Paid */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Amount Paid
            </label>
            <Input
              type="number"
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="Enter amount received"
              autoFocus
            />
          </div>

          {/* Change Display */}
          {amountPaid && parseFloat(amountPaid) >= finalTotal && (
            <div className="bg-success-100 dark:bg-success-900/20 p-4 rounded-lg border border-success-300 dark:border-success-700">
              <div className="flex justify-between items-center">
                <span className="font-medium">Change:</span>
                <span className="font-bold text-lg text-success-700 dark:text-success-400">
                  {formatCurrency(change)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setPaymentModalOpen(false)}
              disabled={processing}
            >
              Cancel (ESC)
            </Button>
            <Button
              className="flex-1 bg-success-600 hover:bg-success-700 text-white"
              onClick={handlePayment}
              loading={processing}
              disabled={!amountPaid || parseFloat(amountPaid) < finalTotal || processing}
            >
              Complete Payment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal 
        isOpen={showShortcutsModal} 
        onClose={() => setShowShortcutsModal(false)} 
      />

      {/* PHASE 2: Hold Order Modal */}
      <HoldOrderModal
        isOpen={showHoldOrderModal}
        onClose={() => setShowHoldOrderModal(false)}
        onConfirm={handleHoldOrder}
        itemsCount={items.reduce((sum, item) => sum + item.quantity, 0)}
      />

      {/* PHASE 2: Customer Search Modal */}
      <CustomerSearchModal
        open={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelect={handleCustomerSelect}
      />

      {/* PHASE 2: Smart Discount Modal */}
      <SmartDiscountModal
        isOpen={showSmartDiscountModal}
        onClose={() => setShowSmartDiscountModal(false)}
        subtotal={subtotal}
        currentDiscount={discount}
        currentDiscountType="percentage"
        onApplyDiscount={handleApplyDiscount}
      />

      {/* PHASE 2: Split Payment Modal */}
      <SplitPaymentModal
        isOpen={showSplitPaymentModal}
        onClose={() => setShowSplitPaymentModal(false)}
        totalAmount={finalTotal}
        onComplete={handleSplitPayment}
      />

      {/* PHASE 2: Receipt Preview Modal */}
      {lastReceipt && (
        <ReceiptPreviewModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          receiptData={lastReceipt}
          tenantInfo={{
            name: 'POSMID Store', // TODO: Get from tenant data
            address: 'Store Address',
            phone: '+62-xxx-xxx-xxx',
          }}
          onPrint={() => window.print()}
        />
      )}

      {/* PHASE 3: Transaction History Panel */}
      <TransactionHistoryPanel
        isOpen={showTransactionHistory}
        onClose={() => setShowTransactionHistory(false)}
      />

      {/* PHASE 3: Mobile Cart Button - Floating FAB (mobile only) */}
      <MobileCartButton
        itemCount={items.reduce((sum, item) => sum + item.quantity, 0)}
        onClick={() => setShowMobileCart(true)}
      />

      {/* PHASE 3: Mobile Cart Panel - Slide-up cart (mobile only) */}
      <MobileCartPanel
        isOpen={showMobileCart}
        onClose={() => setShowMobileCart(false)}
        items={items}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={removeItem}
        onClearCart={handleClearCart}
        onCustomerClick={() => {
          setShowMobileCart(false);
          setShowCustomerModal(true);
        }}
        onDiscountClick={() => {
          setShowMobileCart(false);
          setShowSmartDiscountModal(true);
        }}
        onPaymentClick={(method) => {
          setShowMobileCart(false);
          handlePaymentClick(method);
        }}
        customerId={customerId}
        customerName={customerName}
        customerPhone={customerPhone}
        customerEmail={customerEmail}
        onCustomerRemove={handleCustomerRemove}
        subtotal={subtotal}
        discount={discount}
        discountAmount={discountAmount}
        tax={tax}
        taxAmount={taxAmount}
        finalTotal={finalTotal}
      />

      {/* PHASE 3a: Product Context Menu (Right-click / Long-press) */}
      {selectedProductId && (
        <ProductContextMenu
          isOpen={showContextMenu}
          position={menuPosition}
          productId={selectedProductId}
          productName={selectedProductName || ''}
          onClose={closeContextMenu}
          onQuickAdd={() => handleQuickAdd(selectedProductId)}
          onQuickView={() => handleQuickView(selectedProductId)}
          onCheckStock={() => handleCheckStock(selectedProductId)}
          onViewRecipe={() => handleViewRecipe(selectedProductId)} // Phase 3b: BOM
          onAddToFavorites={() => handleAddToFavorites(selectedProductId)}
          onPriceHistory={() => handlePriceHistory(selectedProductId)}
          onEditProduct={() => handleEditProduct(selectedProductId)}
          canEdit={false} // TODO: Check user permissions
        />
      )}

      {/* PHASE 3a: Product Quick View Modal */}
      {quickViewProductId && tenantId && (
        <ProductQuickViewModal
          isOpen={showQuickView}
          productId={quickViewProductId}
          tenantId={tenantId}
          onClose={() => {
            setShowQuickView(false);
            setQuickViewProductId(null);
          }}
          onAddToCart={handleAddToCart}
        />
      )}
      
      {/* PHASE 3b: Recipe Details Modal (BOM Integration) */}
      {recipeProductId && tenantId && (
        <RecipeDetailsModal
          isOpen={showRecipeModal}
          onClose={() => {
            setShowRecipeModal(false);
            setRecipeProductId(null);
            setRecipeProductName('');
          }}
          productId={recipeProductId}
          productName={recipeProductName}
          tenantId={tenantId}
        />
      )}
      
      {/* PHASE 3b: Material Stock Warning Modal */}
      {materialWarningProduct && (
        <MaterialStockWarning
          isOpen={showMaterialWarning}
          onClose={() => {
            setShowMaterialWarning(false);
            setMaterialWarningProduct(null);
            setInsufficientMaterials([]);
          }}
          product={materialWarningProduct}
          quantityRequested={1}
          insufficientMaterials={insufficientMaterials}
          onContinue={handleContinueWithInsufficientMaterials}
          canOverride={true} // TODO: Check user permissions
        />
      )}
    </div>
  );
}
