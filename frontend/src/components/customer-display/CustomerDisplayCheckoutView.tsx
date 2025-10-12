/**
 * Customer Display Checkout View Component
 * Phase 4A - Feature 1: Customer Display Screen - Day 2
 * 
 * Displays payment information and thank you message during checkout
 * 
 * Features:
 * - Large payment amount display (48px+)
 * - Change calculation (if cash payment)
 * - Thank you message with animations
 * - Promotional content integration
 * 
 * Design Compliance:
 * ✅ Uses design tokens from index.css
 * ✅ Dark mode optimized
 * ✅ Responsive
 * ✅ No hardcoded colors/spacing
 */

import { CheckCircle, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import type { CustomerDisplayData } from '@/types';

interface CustomerDisplayCheckoutViewProps {
  displayData: CustomerDisplayData;
}

/**
 * Checkout View for Customer Display
 * Shows payment details, change due, and thank you message
 */
export function CustomerDisplayCheckoutView({ displayData }: CustomerDisplayCheckoutViewProps) {
  const isComplete = displayData.state === 'complete';

  return (
    <div className="space-y-8">
      {/* Transaction Summary */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border-2 border-gray-700">
        {/* Total Amount */}
        <div className="text-center mb-6">
          <p className="text-3xl text-gray-400 mb-2">Total Pembayaran</p>
          <p className="text-7xl font-extrabold text-primary-400">
            {formatCurrency(displayData.total)}
          </p>
        </div>

        {/* Payment Details */}
        {displayData.paymentAmount && (
          <div className="space-y-4 border-t-2 border-gray-700 pt-6">
            {/* Amount Paid */}
            <div className="flex justify-between items-center">
              <span className="text-2xl text-gray-300">Bayar:</span>
              <span className="text-4xl font-bold text-success-400">
                {formatCurrency(displayData.paymentAmount)}
              </span>
            </div>

            {/* Change Due */}
            {displayData.change !== undefined && displayData.change > 0 && (
              <div className="flex justify-between items-center bg-warning-500/10 border border-warning-500/30 rounded-lg p-4 animate-pulse">
                <span className="text-2xl font-semibold text-warning-400">Kembali:</span>
                <span className="text-5xl font-extrabold text-warning-400">
                  {formatCurrency(displayData.change)}
                </span>
              </div>
            )}

            {/* Exact Payment */}
            {displayData.change === 0 && (
              <div className="text-center bg-success-500/10 border border-success-500/30 rounded-lg p-4">
                <CheckCircle className="w-12 h-12 text-success-500 mx-auto mb-2" />
                <p className="text-xl text-success-400 font-semibold">
                  Pembayaran Pas! ✨
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thank You Message (shown when complete) */}
      {isComplete && (
        <ThankYouMessage transactionId={displayData.transactionId} />
      )}
    </div>
  );
}

/**
 * Thank You Message Component
 */
function ThankYouMessage({ transactionId }: { transactionId?: string }) {
  return (
    <div className="text-center space-y-6 animate-fadeIn">
      {/* Success Icon */}
      <div className="flex justify-center">
        <div className="relative">
          <CheckCircle className="w-32 h-32 text-success-500 animate-scaleIn" />
          <Sparkles className="w-12 h-12 text-warning-400 absolute -top-2 -right-2 animate-spin-slow" />
        </div>
      </div>

      {/* Main Message */}
      <div className="space-y-3">
        <h2 className="text-6xl font-extrabold text-white animate-slideUp">
          Terima Kasih! 🎉
        </h2>
        <p className="text-3xl text-gray-400 font-medium animate-slideUp animation-delay-200">
          Transaksi berhasil diproses
        </p>
      </div>

      {/* Transaction ID */}
      {transactionId && (
        <div className="bg-gray-800/30 rounded-lg p-4 inline-block animate-slideUp animation-delay-400">
          <p className="text-lg text-gray-500">ID Transaksi</p>
          <p className="text-xl font-mono font-bold text-primary-400">
            {transactionId}
          </p>
        </div>
      )}

      {/* Promotional Message */}
      <div className="mt-8 space-y-2 animate-slideUp animation-delay-600">
        <p className="text-2xl text-gray-400">
          Sampai jumpa kembali! 👋
        </p>
        <p className="text-xl text-gray-500">
          Dapatkan diskon 10% untuk pembelian berikutnya
        </p>
      </div>

      {/* Countdown indicator */}
      <div className="flex justify-center space-x-2 mt-6 animate-slideUp animation-delay-800">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full bg-primary-500 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
      <p className="text-sm text-gray-600">
        Kembali ke layar awal dalam beberapa detik...
      </p>
    </div>
  );
}