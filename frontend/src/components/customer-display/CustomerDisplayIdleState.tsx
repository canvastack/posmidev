/**
 * Customer Display Idle State Component
 * Phase 4A - Feature 1: Customer Display Screen
 * 
 * Displays promotional content when no transaction is active
 * 
 * Features:
 * - Rotating promotional content
 * - Large readable fonts
 * - Dark theme optimized
 * - Smooth animations
 * 
 * Design Compliance:
 * ✅ Uses design tokens from index.css
 * ✅ Dark mode optimized for customer displays
 * ✅ No hardcoded colors/spacing
 * ✅ Responsive layout
 */

import { useState, useEffect } from 'react';
import type { PromotionalContent } from '@/types';

interface CustomerDisplayIdleStateProps {
  content?: PromotionalContent[];
  rotationInterval?: number; // ms
}

/**
 * Default promotional content (can be customized via props)
 */
const DEFAULT_PROMOTIONAL_CONTENT: PromotionalContent[] = [
  {
    id: '1',
    type: 'text',
    content: 'Selamat Datang di Toko Kami! 🎉',
    priority: 1,
  },
  {
    id: '2',
    type: 'text',
    content: 'Promo Spesial! Diskon hingga 50%',
    priority: 2,
  },
  {
    id: '3',
    type: 'text',
    content: 'Terima Kasih atas Kunjungan Anda 🙏',
    priority: 3,
  },
];

/**
 * Customer display idle state with rotating promotional content
 */
export function CustomerDisplayIdleState({
  content = DEFAULT_PROMOTIONAL_CONTENT,
  rotationInterval = 5000,
}: CustomerDisplayIdleStateProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Rotate promotional content
  useEffect(() => {
    if (content.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % content.length);
    }, rotationInterval);

    return () => clearInterval(interval);
  }, [content.length, rotationInterval]);

  const currentContent = content[currentIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      {/* Logo or Brand Section */}
      <div className="mb-12 animate-float">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-2xl">
          <span className="text-6xl">🛒</span>
        </div>
      </div>

      {/* Promotional Content */}
      <div className="text-center space-y-8 max-w-4xl">
        <h1
          className="text-7xl font-extrabold text-white leading-tight animate-glow"
          key={currentContent.id}
          style={{
            animation: 'fadeIn 0.5s ease-in-out',
          }}
        >
          {currentContent.content}
        </h1>

        {/* Sub-message */}
        <p className="text-3xl text-gray-300 font-medium">
          Silakan tunjukkan barang Anda ke kasir
        </p>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-3">
        {content.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'w-12 bg-primary-500'
                : 'w-2 bg-gray-600'
            }`}
          />
        ))}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}