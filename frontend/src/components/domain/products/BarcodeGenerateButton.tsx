/**
 * BarcodeGenerateButton Component
 * Phase 3: Barcode & Printing
 * 
 * Button to trigger barcode preview modal for a single product
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';
import { BarcodePreviewModal } from './BarcodePreviewModal';
import type { Product } from '@/types/product';

interface BarcodeGenerateButtonProps {
  product: Product;
  variant?: 'ghost' | 'outline' | 'default';
  size?: 'sm' | 'default' | 'lg';
}

export function BarcodeGenerateButton({
  product,
  variant = 'ghost',
  size = 'sm',
}: BarcodeGenerateButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowModal(true)}
        title="Generate Barcode"
      >
        <QrCode className="w-4 h-4 mr-2" />
        Barcode
      </Button>

      <BarcodePreviewModal
        product={product}
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}