import { useEffect, useCallback, useState } from 'react';

/**
 * Barcode Scanner Hook
 * 
 * Detects barcode scanner input (rapid keyboard events ending with Enter)
 * Typical barcode scanners act as keyboard input devices with ~100ms delay
 * between characters and auto-submit with Enter key
 */

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
  maxLength?: number;
  timeout?: number; // Time window for barcode input (ms)
  enabled?: boolean;
}

export const useBarcodeScanner = ({
  onScan,
  minLength = 4,
  maxLength = 50,
  timeout = 100,
  enabled = true,
}: BarcodeScannerOptions) => {
  const [buffer, setBuffer] = useState<string>('');
  const [lastKeyTime, setLastKeyTime] = useState<number>(0);

  const processBarcode = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (trimmed.length >= minLength && trimmed.length <= maxLength) {
        onScan(trimmed);
        
        // Play success sound (optional)
        try {
          const audio = new Audio('/sounds/beep.mp3');
          audio.volume = 0.3;
          audio.play().catch(() => {
            // Ignore audio errors (file might not exist)
          });
        } catch (error) {
          // Silent fail
        }
      }
    },
    [onScan, minLength, maxLength]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if focused on input/textarea (unless it's the barcode scanner)
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        // Only allow if explicitly marked as barcode input
        if (!target.dataset.barcode) return;
      }

      const currentTime = Date.now();
      const timeSinceLastKey = currentTime - lastKeyTime;

      // If Enter key, process the buffer
      if (e.key === 'Enter') {
        e.preventDefault();
        if (buffer.length >= minLength) {
          processBarcode(buffer);
        }
        setBuffer('');
        setLastKeyTime(0);
        return;
      }

      // Reset buffer if too much time has passed
      if (timeSinceLastKey > timeout && buffer.length > 0) {
        setBuffer('');
      }

      // Add character to buffer (alphanumeric and some special chars)
      if (e.key.length === 1) {
        setBuffer((prev) => {
          const newBuffer = timeSinceLastKey > timeout ? e.key : prev + e.key;
          setLastKeyTime(currentTime);
          return newBuffer;
        });
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [buffer, lastKeyTime, timeout, minLength, processBarcode, enabled]);

  return {
    isScanning: buffer.length > 0,
    currentBuffer: buffer,
  };
};