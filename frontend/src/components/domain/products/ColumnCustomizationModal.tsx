import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  required?: boolean; // Cannot be hidden
}

interface ColumnCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onSave: (columns: ColumnConfig[]) => void;
}

export const ColumnCustomizationModal: React.FC<ColumnCustomizationModalProps> = ({
  isOpen,
  onClose,
  columns,
  onSave,
}) => {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);

  if (!isOpen) return null;

  const handleToggle = (key: string) => {
    setLocalColumns((prev) =>
      prev.map((col) =>
        col.key === key && !col.required ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleShowAll = () => {
    setLocalColumns((prev) => prev.map((col) => ({ ...col, visible: true })));
  };

  const handleResetToDefault = () => {
    // Default visible columns: checkbox, image, name, sku, category, price, stock, status, actions
    const defaultVisibleKeys = [
      'checkbox',
      'image',
      'name',
      'sku',
      'category',
      'price',
      'stock',
      'status',
      'actions',
    ];
    setLocalColumns((prev) =>
      prev.map((col) => ({
        ...col,
        visible: defaultVisibleKeys.includes(col.key),
      }))
    );
  };

  const handleSave = () => {
    onSave(localColumns);
    onClose();
  };

  const visibleCount = localColumns.filter((col) => col.visible).length;
  const totalCount = localColumns.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Customize Columns</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Show or hide table columns ({visibleCount}/{totalCount} visible)
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {localColumns.map((column) => (
                  <div
                    key={column.key}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      column.visible
                        ? 'border-primary-200 bg-primary-50'
                        : 'border-gray-200 bg-white'
                    } ${column.required ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={() => !column.required && handleToggle(column.key)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={column.visible}
                        onChange={() => handleToggle(column.key)}
                        disabled={column.required}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 disabled:cursor-not-allowed"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label className="text-sm font-medium text-gray-700">
                        {column.label}
                        {column.required && (
                          <span className="ml-2 text-xs text-gray-500">(Required)</span>
                        )}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={handleShowAll}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Show All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleResetToDefault}
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                >
                  Reset to Default
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};