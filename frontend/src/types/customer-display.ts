/**
 * Customer Display Types
 * Phase 4A - Feature 1: Customer Display Screen
 * 
 * Type definitions for customer-facing display feature
 * Uses BroadcastChannel API for cross-window synchronization
 */

import type { CartItem } from '@/stores/cartStore';

/**
 * Display state determines what the customer sees
 */
export type CustomerDisplayState = 'idle' | 'cart' | 'checkout' | 'complete';

/**
 * Message types for BroadcastChannel communication
 */
export type CustomerDisplayMessageType =
  | 'cart-updated'
  | 'checkout-started'
  | 'payment-completed'
  | 'transaction-reset'
  | 'display-disconnect';

/**
 * BroadcastChannel message payload
 */
export interface CustomerDisplayMessage {
  type: CustomerDisplayMessageType;
  timestamp: number;
  data?: CustomerDisplayData;
}

/**
 * Data sent to customer display
 */
export interface CustomerDisplayData {
  state: CustomerDisplayState;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentAmount?: number;
  change?: number;
  transactionId?: string;
}

/**
 * Promotional content for idle state
 */
export interface PromotionalContent {
  id: string;
  type: 'image' | 'text' | 'video';
  content: string;
  duration?: number; // in seconds
  priority?: number;
}

/**
 * Customer display configuration
 */
export interface CustomerDisplayConfig {
  autoHideDelay: number; // ms to wait before returning to idle
  idleContentRotationInterval: number; // ms between promotional content
  enableAnimations: boolean;
  fontSize: 'normal' | 'large' | 'extra-large';
  theme: 'light' | 'dark' | 'auto';
}

/**
 * Default configuration
 */
export const DEFAULT_CUSTOMER_DISPLAY_CONFIG: CustomerDisplayConfig = {
  autoHideDelay: 10000, // 10 seconds
  idleContentRotationInterval: 5000, // 5 seconds
  enableAnimations: true,
  fontSize: 'large',
  theme: 'dark', // Customer displays typically use dark theme
};

/**
 * BroadcastChannel channel name (must match between POS and display)
 */
export const CUSTOMER_DISPLAY_CHANNEL = 'pos-cart-sync';