import { ScanBarcode } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Barcode Scanner Visual Indicator
 * Shows when barcode scanner is active/scanning
 */

interface BarcodeScannerIndicatorProps {
  isScanning: boolean;
  currentBuffer?: string;
}

export const BarcodeScannerIndicator = ({
  isScanning,
  currentBuffer = '',
}: BarcodeScannerIndicatorProps) => {
  return (
    <AnimatePresence>
      {isScanning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-20 right-6 z-50"
        >
          <div className="glass-card p-4 flex items-center gap-3 shadow-2xl border-2 border-primary-500/50">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              <ScanBarcode className="h-6 w-6 text-primary-600" />
            </motion.div>
            <div>
              <p className="text-sm font-semibold">Scanning...</p>
              <p className="text-xs text-muted-foreground font-mono">
                {currentBuffer || 'Waiting for barcode'}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};