/**
 * Variant Helper Utilities
 * Phase 6: Product Variants
 * 
 * Helper functions for variant operations, SKU generation,
 * price calculations, and combination generation.
 */

import type {
  ProductVariant,
  ProductVariantInput,
  VariantMatrixConfig,
  VariantAttribute,
} from '../types/variant';

// ========================================
// FORMATTING UTILITIES
// ========================================

/**
 * Format number as currency
 * 
 * @example
 * formatCurrency(19.99) // Returns: "$19.99"
 * formatCurrency(1000) // Returns: "$1,000.00"
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

// ========================================
// VARIANT COMBINATION GENERATION
// ========================================

/**
 * Generate all possible variant combinations from attributes
 * 
 * @example
 * generateVariantCombinations([
 *   { name: "Size", values: ["S", "M"] },
 *   { name: "Color", values: ["Red", "Blue"] }
 * ])
 * // Returns:
 * // [
 * //   { Size: "S", Color: "Red" },
 * //   { Size: "S", Color: "Blue" },
 * //   { Size: "M", Color: "Red" },
 * //   { Size: "M", Color: "Blue" }
 * // ]
 */
export function generateVariantCombinations(
  attributes: { name: string; values: string[] }[]
): Record<string, string>[] {
  if (attributes.length === 0) return [];
  
  // Recursive combination generation
  function combine(
    current: Record<string, string>,
    remaining: { name: string; values: string[] }[]
  ): Record<string, string>[] {
    if (remaining.length === 0) {
      return [current];
    }
    
    const [first, ...rest] = remaining;
    const results: Record<string, string>[] = [];
    
    for (const value of first.values) {
      const newCurrent = { ...current, [first.name]: value };
      results.push(...combine(newCurrent, rest));
    }
    
    return results;
  }
  
  return combine({}, attributes);
}

/**
 * Calculate total number of combinations
 */
export function calculateCombinationCount(
  attributes: { name: string; values: string[] }[]
): number {
  if (attributes.length === 0) return 0;
  return attributes.reduce((total, attr) => total * attr.values.length, 1);
}

/**
 * Check if combination count is reasonable (warn if > 500)
 */
export function isReasonableCombinationCount(count: number): {
  isReasonable: boolean;
  warning?: string;
} {
  if (count === 0) {
    return {
      isReasonable: false,
      warning: 'No combinations will be generated. Add attribute values.',
    };
  }
  
  if (count > 1000) {
    return {
      isReasonable: false,
      warning: `${count} variants will be created. This is too many. Consider reducing attributes or values.`,
    };
  }
  
  if (count > 500) {
    return {
      isReasonable: true,
      warning: `${count} variants will be created. This is a large number. Proceed with caution.`,
    };
  }
  
  return { isReasonable: true };
}

// ========================================
// SKU GENERATION
// ========================================

/**
 * Generate SKU for a variant based on pattern
 * 
 * Patterns:
 * - {BASE} - Base product SKU
 * - {ATTR:name} - Attribute value (first 3 chars, uppercase)
 * - {SEQ} - Sequential number
 * 
 * @example
 * generateVariantSKU("TSHIRT-001", { Size: "M", Color: "Red" }, "{BASE}-{ATTR:Size}-{ATTR:Color}")
 * // Returns: "TSHIRT-001-M-RED"
 */
export function generateVariantSKU(
  baseSKU: string,
  attributes: Record<string, string>,
  pattern: string = '{BASE}-{ATTR:all}'
): string {
  let sku = pattern;
  
  // Replace {BASE}
  sku = sku.replace(/{BASE}/g, baseSKU);
  
  // Replace {ATTR:name}
  const attrMatches = sku.matchAll(/{ATTR:(\w+)}/g);
  for (const match of attrMatches) {
    const attrName = match[1];
    if (attrName === 'all') {
      // Replace with all attributes concatenated
      const attrString = Object.values(attributes)
        .map((v) => v.substring(0, 3).toUpperCase())
        .join('-');
      sku = sku.replace(/{ATTR:all}/g, attrString);
    } else if (attributes[attrName]) {
      const value = attributes[attrName].substring(0, 3).toUpperCase();
      sku = sku.replace(new RegExp(`{ATTR:${attrName}}`, 'g'), value);
    }
  }
  
  // Clean up any remaining placeholders
  sku = sku.replace(/{[^}]+}/g, '');
  
  // Remove multiple consecutive hyphens
  sku = sku.replace(/-+/g, '-');
  
  // Remove leading/trailing hyphens
  sku = sku.replace(/^-|-$/g, '');
  
  return sku.toUpperCase();
}

/**
 * Generate unique SKUs for multiple variants
 */
export function generateUniqueSKUs(
  baseSKU: string,
  combinations: Record<string, string>[],
  pattern: string = '{BASE}-{ATTR:all}',
  existingSKUs: string[] = []
): string[] {
  const skus: string[] = [];
  const usedSKUs = new Set(existingSKUs);
  
  for (const combination of combinations) {
    let sku = generateVariantSKU(baseSKU, combination, pattern);
    let counter = 1;
    
    // Ensure uniqueness
    while (usedSKUs.has(sku)) {
      sku = `${generateVariantSKU(baseSKU, combination, pattern)}-${counter}`;
      counter++;
    }
    
    skus.push(sku);
    usedSKUs.add(sku);
  }
  
  return skus;
}

// ========================================
// PRICE CALCULATION
// ========================================

/**
 * Calculate variant price with attribute modifiers
 * 
 * @example
 * calculateVariantPrice(100, { Size: "L", Color: "Black" }, {
 *   Size: { S: 0, M: 0, L: 5, XL: 10 },
 *   Color: { Red: 0, Blue: 0, Black: 2 }
 * })
 * // Returns: { price: 107, breakdown: { base: 100, Size: 5, Color: 2 } }
 */
export function calculateVariantPrice(
  basePrice: number,
  attributes: Record<string, string>,
  pricingRules?: Record<string, Record<string, number>>
): {
  price: number;
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = { base: basePrice };
  let totalModifier = 0;
  
  if (pricingRules) {
    for (const [attrName, attrValue] of Object.entries(attributes)) {
      if (pricingRules[attrName] && pricingRules[attrName][attrValue] !== undefined) {
        const modifier = pricingRules[attrName][attrValue];
        breakdown[attrName] = modifier;
        totalModifier += modifier;
      }
    }
  }
  
  const finalPrice = basePrice + totalModifier;
  
  return {
    price: Math.max(0, finalPrice), // Ensure non-negative
    breakdown,
  };
}

/**
 * Calculate profit margin
 */
export function calculateProfitMargin(price: number, costPrice: number): number {
  if (price <= 0) return 0;
  return ((price - costPrice) / price) * 100;
}

/**
 * Calculate markup percentage
 */
export function calculateMarkup(price: number, costPrice: number): number {
  if (costPrice <= 0) return 0;
  return ((price - costPrice) / costPrice) * 100;
}

/**
 * Calculate price from markup
 */
export function calculatePriceFromMarkup(costPrice: number, markupPercentage: number): number {
  return costPrice * (1 + markupPercentage / 100);
}

/**
 * Calculate price from margin
 */
export function calculatePriceFromMargin(costPrice: number, marginPercentage: number): number {
  return costPrice / (1 - marginPercentage / 100);
}

// ========================================
// VARIANT DISPLAY HELPERS
// ========================================

/**
 * Generate display name for variant
 * 
 * @example
 * generateVariantDisplayName("T-Shirt", { Size: "M", Color: "Red" })
 * // Returns: "T-Shirt - Size: M, Color: Red"
 */
export function generateVariantDisplayName(
  productName: string,
  attributes: Record<string, string>,
  separator: string = ', '
): string {
  const attrString = Object.entries(attributes)
    .map(([key, value]) => `${key}: ${value}`)
    .join(separator);
  
  return `${productName} - ${attrString}`;
}

/**
 * Format attributes for display
 */
export function formatAttributes(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
}

/**
 * Get variant badge color based on stock level
 */
export function getStockBadgeColor(variant: ProductVariant): string {
  if (variant.is_critical_stock) return 'red';
  if (variant.is_low_stock) return 'yellow';
  if (variant.available_stock > 0) return 'green';
  return 'gray';
}

/**
 * Get stock status text
 */
export function getStockStatus(variant: ProductVariant): string {
  if (variant.available_stock === 0) return 'Out of Stock';
  if (variant.is_critical_stock) return 'Critical Stock';
  if (variant.is_low_stock) return 'Low Stock';
  return 'In Stock';
}

// ========================================
// VARIANT FILTERING
// ========================================

/**
 * Filter variants by attributes
 */
export function filterVariantsByAttributes(
  variants: ProductVariant[],
  attributeFilters: Record<string, string>
): ProductVariant[] {
  if (Object.keys(attributeFilters).length === 0) return variants;
  
  return variants.filter((variant) => {
    for (const [key, value] of Object.entries(attributeFilters)) {
      if (variant.attributes[key] !== value) return false;
    }
    return true;
  });
}

/**
 * Search variants
 */
export function searchVariants(
  variants: ProductVariant[],
  searchQuery: string
): ProductVariant[] {
  if (!searchQuery.trim()) return variants;
  
  const query = searchQuery.toLowerCase();
  
  return variants.filter((variant) => {
    // Search in name
    if (variant.name.toLowerCase().includes(query)) return true;
    
    // Search in SKU
    if (variant.sku.toLowerCase().includes(query)) return true;
    
    // Search in display_name
    if (variant.display_name.toLowerCase().includes(query)) return true;
    
    // Search in attribute values
    const attrValues = Object.values(variant.attributes).join(' ').toLowerCase();
    if (attrValues.includes(query)) return true;
    
    return false;
  });
}

/**
 * Sort variants
 */
export function sortVariants(
  variants: ProductVariant[],
  sortBy: 'name' | 'sku' | 'price' | 'stock' | 'created_at' = 'name',
  sortOrder: 'asc' | 'desc' = 'asc'
): ProductVariant[] {
  const sorted = [...variants];
  
  sorted.sort((a, b) => {
    let aValue: any;
    let bValue: any;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'sku':
        aValue = a.sku.toLowerCase();
        bValue = b.sku.toLowerCase();
        break;
      case 'price':
        aValue = a.price;
        bValue = b.price;
        break;
      case 'stock':
        aValue = a.available_stock;
        bValue = b.available_stock;
        break;
      case 'created_at':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
}

// ========================================
// VARIANT VALIDATION
// ========================================

/**
 * Validate variant input
 */
export function validateVariantInput(input: ProductVariantInput): {
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  
  // Required fields
  if (!input.sku || input.sku.trim() === '') {
    errors.sku = 'SKU is required';
  }
  
  if (!input.name || input.name.trim() === '') {
    errors.name = 'Name is required';
  }
  
  if (input.price === undefined || input.price === null) {
    errors.price = 'Price is required';
  } else if (input.price < 0) {
    errors.price = 'Price must be non-negative';
  }
  
  if (input.stock === undefined || input.stock === null) {
    errors.stock = 'Stock is required';
  } else if (input.stock < 0) {
    errors.stock = 'Stock must be non-negative';
  }
  
  // Cost price validation
  if (input.cost_price !== undefined && input.cost_price !== null && input.cost_price < 0) {
    errors.cost_price = 'Cost price must be non-negative';
  }
  
  // Reserved stock validation
  if (input.reserved_stock !== undefined && input.reserved_stock !== null) {
    if (input.reserved_stock < 0) {
      errors.reserved_stock = 'Reserved stock must be non-negative';
    }
    if (input.stock !== undefined && input.reserved_stock > input.stock) {
      errors.reserved_stock = 'Reserved stock cannot exceed total stock';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Check for duplicate SKUs
 * Accepts both ProductVariant and ProductVariantInput
 */
export function checkDuplicateSKUs(
  variants: Array<{ sku?: string; id?: string }>
): {
  hasDuplicates: boolean;
  duplicates: Record<string, number[]>;
  duplicateSKUs: string[];
} {
  const skuMap: Record<string, number[]> = {};
  
  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    const sku = variant.sku?.trim().toLowerCase();
    
    // Skip if SKU is empty or undefined
    if (!sku) continue;
    
    if (!skuMap[sku]) {
      skuMap[sku] = [];
    }
    skuMap[sku].push(i);
  }
  
  const duplicates: Record<string, number[]> = {};
  const duplicateSKUs: string[] = [];
  
  for (const [sku, indices] of Object.entries(skuMap)) {
    if (indices.length > 1) {
      duplicates[sku] = indices;
      duplicateSKUs.push(sku);
    }
  }
  
  return {
    hasDuplicates: duplicateSKUs.length > 0,
    duplicates,
    duplicateSKUs,
  };
}

// ========================================
// EXPORT HELPERS
// ========================================

/**
 * Convert variants to CSV format
 */
export function variantsToCsvData(variants: ProductVariant[]): string[][] {
  const headers = [
    'SKU',
    'Name',
    'Attributes',
    'Price',
    'Cost Price',
    'Profit Margin',
    'Stock',
    'Reserved Stock',
    'Available Stock',
    'Reorder Level',
    'Status',
    'Created At',
  ];
  
  const rows = variants.map((v) => [
    v.sku,
    v.name,
    formatAttributes(v.attributes),
    v.price.toString(),
    (v.cost_price || 0).toString(),
    v.profit_margin.toFixed(2) + '%',
    v.stock.toString(),
    v.reserved_stock.toString(),
    v.available_stock.toString(),
    (v.reorder_level || '').toString(),
    v.is_active ? 'Active' : 'Inactive',
    v.created_at,
  ]);
  
  return [headers, ...rows];
}

/**
 * Download variants as CSV file
 */
export function downloadVariantsAsCsv(variants: ProductVariant[], filename: string = 'variants.csv'): void {
  const csvData = variantsToCsvData(variants);
  const csvContent = csvData.map((row) => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}