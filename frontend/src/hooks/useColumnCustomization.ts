import { useState, useEffect } from 'react';
import type { ColumnConfig } from '../types/column';

const STORAGE_KEY = 'products_column_config';

// Default column configuration
const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'checkbox', label: 'Select', visible: true, required: true },
  { key: 'image', label: 'Image', visible: true },
  { key: 'name', label: 'Product Name', visible: true, required: true },
  { key: 'sku', label: 'SKU', visible: true },
  { key: 'category', label: 'Category', visible: true },
  { key: 'price', label: 'Price', visible: true },
  { key: 'cost_price', label: 'Cost Price', visible: false },
  { key: 'profit_margin', label: 'Profit Margin', visible: false },
  { key: 'stock', label: 'Stock', visible: true },
  { key: 'status', label: 'Status', visible: true },
  { key: 'created_at', label: 'Created Date', visible: false },
  { key: 'updated_at', label: 'Last Updated', visible: false },
  { key: 'actions', label: 'Actions', visible: true, required: true },
];

export const useColumnCustomization = () => {
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    // Try to load from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ColumnConfig[];
        // Merge with defaults to handle new columns
        return DEFAULT_COLUMNS.map((defaultCol) => {
          const storedCol = parsed.find((col) => col.key === defaultCol.key);
          return storedCol || defaultCol;
        });
      }
    } catch (error) {
      console.error('Failed to load column configuration:', error);
    }
    return DEFAULT_COLUMNS;
  });

  // Save to localStorage whenever columns change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    } catch (error) {
      console.error('Failed to save column configuration:', error);
    }
  }, [columns]);

  const saveColumns = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns);
  };

  const resetToDefault = () => {
    setColumns(DEFAULT_COLUMNS);
  };

  const isColumnVisible = (key: string): boolean => {
    const column = columns.find((col) => col.key === key);
    return column ? column.visible : true;
  };

  const visibleColumns = columns.filter((col) => col.visible);

  return {
    columns,
    saveColumns,
    resetToDefault,
    isColumnVisible,
    visibleColumns,
  };
};