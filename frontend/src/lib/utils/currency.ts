/**
 * Currency Formatting Utilities
 * 
 * Provides standardized currency formatting for Indonesian Rupiah (IDR)
 * Used across POS and financial components
 * 
 * @module currency
 */

/**
 * Format number as Indonesian Rupiah (IDR) currency
 * 
 * @param amount - The numeric amount to format
 * @returns Formatted currency string (e.g., "Rp 1.000.000")
 * 
 * @example
 * formatCurrency(50000) // Returns: "Rp 50.000"
 * formatCurrency(1500000) // Returns: "Rp 1.500.000"
 * formatCurrency(0) // Returns: "Rp 0"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number as currency with decimal places
 * Useful for detailed financial reports
 * 
 * @param amount - The numeric amount to format
 * @returns Formatted currency string with decimals
 * 
 * @example
 * formatCurrencyDetailed(50000.50) // Returns: "Rp 50.000,50"
 */
export function formatCurrencyDetailed(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse currency string back to number
 * Removes IDR symbol and formatting
 * 
 * @param currencyString - Formatted currency string
 * @returns Numeric value
 * 
 * @example
 * parseCurrency("Rp 50.000") // Returns: 50000
 * parseCurrency("Rp 1.500.000") // Returns: 1500000
 */
export function parseCurrency(currencyString: string): number {
  const cleaned = currencyString.replace(/[^\d,-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}