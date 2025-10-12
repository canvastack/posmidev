import { useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { Printer, Mail, MessageCircle, Download, Check, QrCode as QrCodeIcon, Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import type { CartItem, CostSummary } from '@/types';
import { useAuth } from '@/hooks/useAuth';

/**
 * Receipt Preview Modal Component
 * 
 * Features:
 * - Beautiful receipt preview
 * - Print receipt
 * - Email receipt (if backend supports)
 * - WhatsApp share
 * - Download as PDF
 * - QR code for digital receipt
 * - Phase 4A Day 6: Manager-only cost analysis section
 * 
 * Design: Professional receipt layout with tenant branding
 */

interface ReceiptData {
  orderId: string;
  orderNumber: string;
  date: string;
  time: string;
  cashierName: string;
  customerName?: string;
  customerId?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountType: 'percentage' | 'flat';
  tax: number;
  taxRate: number;
  total: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  loyaltyPointsEarned?: number;
  loyaltyPointsBalance?: number;
  // Phase 4A Day 6: Cost tracking
  costSummary?: CostSummary | null;
}

interface TenantInfo {
  name: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  taxId?: string;
}

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: ReceiptData;
  tenantInfo: TenantInfo;
  onPrint?: () => void;
  onEmail?: (email: string) => Promise<void>;
  onWhatsApp?: (phone: string) => void;
  onDownloadPDF?: () => void;
}

export const ReceiptPreviewModal = ({
  isOpen,
  onClose,
  receiptData,
  tenantInfo,
  onPrint,
  onEmail,
  onWhatsApp,
  onDownloadPDF,
}: ReceiptPreviewModalProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Phase 4A Day 6: Check if user can view cost analysis
  // Typically managers/admins only (can be customized with permissions)
  const canViewCosts = user?.roles?.some(role => 
    role.toLowerCase().includes('manager') || 
    role.toLowerCase().includes('admin') ||
    role.toLowerCase().includes('owner')
  );

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      // Default print behavior
      window.print();
    }
  };

  const handleWhatsApp = () => {
    if (receiptData.customerName && onWhatsApp) {
      const phone = prompt('Enter customer WhatsApp number (with country code):');
      if (phone) {
        onWhatsApp(phone);
      }
    } else {
      alert('Customer information required for WhatsApp sharing');
    }
  };

  const handleEmail = async () => {
    if (onEmail) {
      const email = prompt('Enter customer email address:');
      if (email) {
        try {
          await onEmail(email);
          alert('Receipt sent successfully!');
        } catch (error) {
          alert('Failed to send receipt');
        }
      }
    }
  };

  const receiptUrl = `${window.location.origin}/receipt/${receiptData.orderId}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Receipt Preview"
      size="xl"
    >
      <div className="space-y-6">
        {/* Receipt Preview */}
        <div 
          ref={receiptRef}
          className="bg-white text-gray-900 p-8 rounded-lg border-2 border-dashed border-gray-300 max-w-md mx-auto"
          style={{ fontFamily: 'monospace' }}
        >
          {/* Header with Logo */}
          <div className="text-center mb-6">
            {tenantInfo.logo && (
              <img 
                src={tenantInfo.logo} 
                alt={tenantInfo.name}
                className="h-16 mx-auto mb-3 object-contain"
              />
            )}
            <h2 className="text-xl font-bold uppercase">{tenantInfo.name}</h2>
            {tenantInfo.address && (
              <p className="text-xs mt-1 text-gray-600">{tenantInfo.address}</p>
            )}
            {tenantInfo.phone && (
              <p className="text-xs text-gray-600">Tel: {tenantInfo.phone}</p>
            )}
            {tenantInfo.email && (
              <p className="text-xs text-gray-600">{tenantInfo.email}</p>
            )}
            {tenantInfo.taxId && (
              <p className="text-xs text-gray-600">Tax ID: {tenantInfo.taxId}</p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t-2 border-dashed border-gray-400 my-4" />

          {/* Order Info */}
          <div className="text-xs space-y-1 mb-4">
            <div className="flex justify-between">
              <span>Receipt #:</span>
              <span className="font-bold">{receiptData.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{receiptData.date}</span>
            </div>
            <div className="flex justify-between">
              <span>Time:</span>
              <span>{receiptData.time}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{receiptData.cashierName}</span>
            </div>
            {receiptData.customerName && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span>{receiptData.customerName}</span>
              </div>
            )}
            {receiptData.customerId && (
              <div className="flex justify-between">
                <span>Member ID:</span>
                <span>{receiptData.customerId}</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t-2 border-dashed border-gray-400 my-4" />

          {/* Items Table */}
          <div className="text-xs mb-4">
            <div className="grid grid-cols-12 gap-1 font-bold mb-2 border-b border-gray-300 pb-1">
              <div className="col-span-6">Item</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-4 text-right">Total</div>
            </div>
            
            {receiptData.items.map((item, index) => (
              <div key={index} className="mb-2">
                <div className="grid grid-cols-12 gap-1">
                  <div className="col-span-6 font-medium">{item.product.name}</div>
                  <div className="col-span-2 text-center">{item.quantity}</div>
                  <div className="col-span-4 text-right">
                    {formatCurrency(item.product.price * item.quantity)}
                  </div>
                </div>
                <div className="text-gray-600 pl-1">
                  @ {formatCurrency(item.product.price)}
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t-2 border-dashed border-gray-400 my-4" />

          {/* Totals */}
          <div className="text-xs space-y-1 mb-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(receiptData.subtotal)}</span>
            </div>
            
            {receiptData.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>
                  Discount {receiptData.discountType === 'percentage' ? `(${receiptData.discount}%)` : '(Flat)'}:
                </span>
                <span>
                  -{formatCurrency(
                    receiptData.discountType === 'percentage'
                      ? receiptData.subtotal * (receiptData.discount / 100)
                      : receiptData.discount
                  )}
                </span>
              </div>
            )}
            
            {receiptData.tax > 0 && (
              <div className="flex justify-between">
                <span>Tax ({receiptData.taxRate}%):</span>
                <span>{formatCurrency(receiptData.tax)}</span>
              </div>
            )}
            
            <div className="border-t border-gray-300 my-2 pt-2" />
            
            <div className="flex justify-between text-base font-bold">
              <span>TOTAL:</span>
              <span>{formatCurrency(receiptData.total)}</span>
            </div>
            
            <div className="border-t border-gray-300 my-2 pt-2" />
            
            <div className="flex justify-between">
              <span>Paid ({receiptData.paymentMethod}):</span>
              <span>{formatCurrency(receiptData.amountPaid)}</span>
            </div>
            
            {receiptData.change > 0 && (
              <div className="flex justify-between font-bold">
                <span>Change:</span>
                <span>{formatCurrency(receiptData.change)}</span>
              </div>
            )}
          </div>
          
          {/* Phase 4A Day 6: Cost Analysis (Manager Only) */}
          {canViewCosts && receiptData.costSummary && receiptData.costSummary.total_cost > 0 && (
            <>
              <div className="border-t-2 border-dashed border-gray-400 my-4" />
              <div className="text-xs space-y-1 mb-4 bg-gray-100 p-3 rounded">
                <div className="flex items-center justify-between font-bold text-gray-800 mb-2">
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    COST ANALYSIS (Manager Only)
                  </span>
                </div>
                
                <div className="flex justify-between text-gray-700">
                  <span>Material Cost:</span>
                  <span className="font-mono">{formatCurrency(receiptData.costSummary.total_cost)}</span>
                </div>
                
                <div className="flex justify-between text-gray-700">
                  <span>Revenue:</span>
                  <span className="font-mono">{formatCurrency(receiptData.costSummary.total_revenue)}</span>
                </div>
                
                <div className="border-t border-gray-300 my-1 pt-1" />
                
                <div className="flex justify-between text-green-700 font-bold">
                  <span>Gross Profit:</span>
                  <span className="font-mono">{formatCurrency(receiptData.costSummary.total_profit)}</span>
                </div>
                
                <div className="flex justify-between text-gray-700">
                  <span>Profit Margin:</span>
                  <span className="font-mono font-bold">
                    {receiptData.costSummary.overall_profit_margin.toFixed(2)}%
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Loyalty Points */}
          {(receiptData.loyaltyPointsEarned || receiptData.loyaltyPointsBalance !== undefined) && (
            <>
              <div className="border-t-2 border-dashed border-gray-400 my-4" />
              <div className="text-xs space-y-1 mb-4">
                {receiptData.loyaltyPointsEarned && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Points Earned:</span>
                    <span>+{receiptData.loyaltyPointsEarned} pts</span>
                  </div>
                )}
                {receiptData.loyaltyPointsBalance !== undefined && (
                  <div className="flex justify-between">
                    <span>Current Balance:</span>
                    <span className="font-bold">{receiptData.loyaltyPointsBalance} pts</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* QR Code Placeholder */}
          <div className="flex flex-col items-center justify-center my-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <QrCodeIcon className="h-16 w-16 text-gray-400 mb-2" />
            <p className="text-xs text-center text-gray-600">
              QR Code for Digital Receipt
            </p>
            <p className="text-xs text-center text-gray-500 mt-1">
              Receipt ID: {receiptData.orderId}
            </p>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-dashed border-gray-400 my-4" />
          <div className="text-center text-xs space-y-1">
            <p className="font-bold">Thank you for your purchase!</p>
            <p>Visit us again soon! 🙏</p>
            <p className="text-gray-600 mt-2">
              Powered by POSMID
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            variant="default"
            className="bg-primary-600 hover:bg-primary-700 text-white"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          
          {onEmail && (
            <Button
              variant="outline"
              onClick={handleEmail}
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </Button>
          )}
          
          {onWhatsApp && (
            <Button
              variant="outline"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          )}
          
          {onDownloadPDF && (
            <Button
              variant="outline"
              onClick={onDownloadPDF}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>

        {/* Success Message */}
        <div className="bg-success-50 dark:bg-success-950/20 border border-success-200 dark:border-success-800 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-success-100 dark:bg-success-900 rounded-full">
              <Check className="h-5 w-5 text-success-600 dark:text-success-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-success-900 dark:text-success-100 mb-1">
                Transaction Completed Successfully!
              </h4>
              <p className="text-sm text-success-700 dark:text-success-300">
                Order #{receiptData.orderNumber} has been processed. 
                {receiptData.customerName && ` Receipt will be available for ${receiptData.customerName}.`}
              </p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={onClose}
        >
          Close
        </Button>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          ${receiptRef.current ? '#receipt-preview' : ''} * {
            visibility: visible;
          }
          ${receiptRef.current ? '#receipt-preview' : ''} {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
          }
        }
      `}</style>
    </Modal>
  );
};