import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, ProductCostAnalysis, CostSummary } from '../types';

/**
 * Enhanced Cart Store with Hold Orders Support & Material Cost Tracking
 * 
 * Features:
 * - Basic cart operations (add, remove, update)
 * - Hold/Park orders (persist to localStorage)
 * - Discount support (percentage or flat amount)
 * - Customer integration ready
 * - Promo code support
 * - Material cost tracking (Phase 4A Day 6)
 */

interface ParkedOrder {
  id: string;
  items: CartItem[];
  timestamp: number;
  discount: number;
  discountType: 'percentage' | 'flat';
  customerName?: string;
  notes?: string;
}

interface CartState {
  // Current cart
  items: CartItem[];
  discount: number;
  discountType: 'percentage' | 'flat';
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  promoCode?: string;
  
  // Parked orders
  parkedOrders: ParkedOrder[];
  
  // Phase 4A Day 6: Material Cost Tracking
  costAnalysis: ProductCostAnalysis[] | null;
  costSummary: CostSummary | null;
  isCostLoading: boolean;
  costError: string | null;
  
  // Cart operations
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Discount operations
  setDiscount: (amount: number, type?: 'percentage' | 'flat') => void;
  clearDiscount: () => void;
  
  // Customer operations
  setCustomer: (customerId: string, customerName: string, customerPhone?: string, customerEmail?: string) => void;
  clearCustomer: () => void;
  
  // Promo code
  setPromoCode: (code: string) => void;
  clearPromoCode: () => void;
  
  // Hold/Park operations
  holdOrder: (notes?: string) => void;
  restoreOrder: (orderId: string) => void;
  removeParkedOrder: (orderId: string) => void;
  clearAllParkedOrders: () => void;
  
  // Phase 4A Day 6: Cost tracking operations
  updateCostAnalysis: (analysis: ProductCostAnalysis[], summary: CostSummary) => void;
  setCostLoading: (loading: boolean) => void;
  setCostError: (error: string | null) => void;
  clearCostAnalysis: () => void;
  
  // Calculations
  getTotalAmount: () => number;
  getTotalItems: () => number;
  getDiscountAmount: () => number;
  getFinalTotal: (taxRate?: number) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      discount: 0,
      discountType: 'percentage',
      parkedOrders: [],
      
      // Phase 4A Day 6: Cost tracking initial state
      costAnalysis: null,
      costSummary: null,
      isCostLoading: false,
      costError: null,

      // Add item to cart
      addItem: (product, quantity = 1) =>
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.product.id === product.id
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }

          return {
            items: [...state.items, { product, quantity }],
          };
        }),

      // Remove item from cart
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        })),

      // Update item quantity
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        })),

      // Clear cart
      clearCart: () =>
        set({
          items: [],
          discount: 0,
          customerId: undefined,
          customerName: undefined,
          customerPhone: undefined,
          customerEmail: undefined,
          promoCode: undefined,
          costAnalysis: null,
          costSummary: null,
          costError: null,
        }),

      // Set discount
      setDiscount: (amount, type = 'percentage') =>
        set({ discount: amount, discountType: type }),

      // Clear discount
      clearDiscount: () => set({ discount: 0 }),

      // Set customer
      setCustomer: (customerId, customerName, customerPhone, customerEmail) =>
        set({ customerId, customerName, customerPhone, customerEmail }),

      // Clear customer
      clearCustomer: () =>
        set({ 
          customerId: undefined, 
          customerName: undefined, 
          customerPhone: undefined, 
          customerEmail: undefined 
        }),

      // Set promo code
      setPromoCode: (code) => set({ promoCode: code }),

      // Clear promo code
      clearPromoCode: () => set({ promoCode: undefined }),

      // Hold current order
      holdOrder: (notes) =>
        set((state) => {
          if (state.items.length === 0) return state;

          const parkedOrder: ParkedOrder = {
            id: `hold-${Date.now()}`,
            items: [...state.items],
            timestamp: Date.now(),
            discount: state.discount,
            discountType: state.discountType,
            customerName: state.customerName,
            notes,
          };

          return {
            parkedOrders: [...state.parkedOrders, parkedOrder],
            items: [],
            discount: 0,
            customerId: undefined,
            customerName: undefined,
            promoCode: undefined,
          };
        }),

      // Restore parked order
      restoreOrder: (orderId) =>
        set((state) => {
          const order = state.parkedOrders.find((o) => o.id === orderId);
          if (!order) return state;

          return {
            items: order.items,
            discount: order.discount,
            discountType: order.discountType,
            customerName: order.customerName,
            parkedOrders: state.parkedOrders.filter((o) => o.id !== orderId),
          };
        }),

      // Remove parked order
      removeParkedOrder: (orderId) =>
        set((state) => ({
          parkedOrders: state.parkedOrders.filter((o) => o.id !== orderId),
        })),

      // Clear all parked orders
      clearAllParkedOrders: () => set({ parkedOrders: [] }),
      
      // Phase 4A Day 6: Cost tracking operations
      updateCostAnalysis: (analysis, summary) =>
        set({
          costAnalysis: analysis,
          costSummary: summary,
          costError: null,
        }),
      
      setCostLoading: (loading) =>
        set({ isCostLoading: loading }),
      
      setCostError: (error) =>
        set({ 
          costError: error,
          isCostLoading: false,
        }),
      
      clearCostAnalysis: () =>
        set({
          costAnalysis: null,
          costSummary: null,
          costError: null,
          isCostLoading: false,
        }),

      // Get total amount (before discount)
      getTotalAmount: () => {
        const { items } = get();
        return items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },

      // Get total items count
      getTotalItems: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.quantity, 0);
      },

      // Get discount amount
      getDiscountAmount: () => {
        const { discount, discountType } = get();
        const subtotal = get().getTotalAmount();

        if (discountType === 'percentage') {
          return subtotal * (discount / 100);
        }
        return discount;
      },

      // Get final total (with discount and tax)
      getFinalTotal: (taxRate = 0) => {
        const subtotal = get().getTotalAmount();
        const discountAmount = get().getDiscountAmount();
        const afterDiscount = subtotal - discountAmount;
        const taxAmount = afterDiscount * (taxRate / 100);
        return afterDiscount + taxAmount;
      },
    }),
    {
      name: 'pos-cart-storage', // LocalStorage key
      partialize: (state) => ({
        // Only persist parked orders, not current cart
        parkedOrders: state.parkedOrders,
      }),
    }
  )
);