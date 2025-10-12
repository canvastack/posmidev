/**
 * Export Modal Component (Phase 4A+ Day 4)
 * 
 * Modal dialog for exporting analytics data in multiple formats
 * Supports CSV, Excel, JSON, and PDF exports with customizable options
 * 
 * Features:
 * - Format selector (CSV, Excel, JSON, PDF)
 * - Date range configuration
 * - Section selection (Overview, Trends, Forecast, etc.)
 * - Charts inclusion (PDF only)
 * - Loading states during export
 * 
 * Design: Design tokens from index.css, no hardcoded colors
 * Dark mode: Full support
 * Responsive: Mobile-optimized
 */

import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileJson, 
  FileImage,
  CheckCircle2,
  Circle,
  LoaderIcon,
} from 'lucide-react';
import type { ExportConfig, AnalyticsExportData } from '@/utils/export';
import { 
  exportToCSV, 
  exportToExcel, 
  exportToJSON, 
  exportToPDF,
  getDefaultFilename,
} from '@/utils/export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AnalyticsExportData;
  chartRefs?: React.RefObject<HTMLElement>[];
}

/**
 * Export Modal Component
 */
export function ExportModal({ isOpen, onClose, data, chartRefs }: ExportModalProps) {
  const [format, setFormat] = useState<'csv' | 'excel' | 'json' | 'pdf'>('excel');
  const [isExporting, setIsExporting] = useState(false);
  const [sections, setSections] = useState({
    overview: true,
    trends: true,
    forecast: true,
    benchmarks: true,
    anomalies: true,
    bestSellers: true,
    cashierPerformance: true,
  });
  const [includeCharts, setIncludeCharts] = useState(true);

  if (!isOpen) return null;

  /**
   * Handle export action
   */
  const handleExport = async () => {
    setIsExporting(true);

    try {
      const config: ExportConfig = {
        format,
        filename: getDefaultFilename(data.dateRange),
        dateRange: data.dateRange,
        includeSections: sections,
        includeCharts: format === 'pdf' ? includeCharts : false,
      };

      switch (format) {
        case 'csv': {
          const csvData = exportToCSV(data, config);
          const link = document.createElement('a');
          link.setAttribute('href', csvData);
          link.setAttribute('download', `${config.filename}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          break;
        }

        case 'excel':
          exportToExcel(data, config);
          break;

        case 'json':
          exportToJSON(data, config);
          break;

        case 'pdf':
          await exportToPDF(data, config, chartRefs);
          break;

        default:
          throw new Error('Unsupported format');
      }

      // Success - close modal after short delay
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
      setIsExporting(false);
    }
  };

  /**
   * Toggle section selection
   */
  const toggleSection = (section: keyof typeof sections) => {
    setSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  /**
   * Select all sections
   */
  const selectAllSections = () => {
    setSections({
      overview: true,
      trends: true,
      forecast: true,
      benchmarks: true,
      anomalies: true,
      bestSellers: true,
      cashierPerformance: true,
    });
  };

  /**
   * Deselect all sections
   */
  const deselectAllSections = () => {
    setSections({
      overview: false,
      trends: false,
      forecast: false,
      benchmarks: false,
      anomalies: false,
      bestSellers: false,
      cashierPerformance: false,
    });
  };

  /**
   * Format options configuration
   */
  const formatOptions = [
    {
      value: 'csv' as const,
      label: 'CSV',
      description: 'Simple comma-separated values',
      icon: FileText,
      color: 'success',
    },
    {
      value: 'excel' as const,
      label: 'Excel',
      description: 'Multi-sheet workbook with formatting',
      icon: FileSpreadsheet,
      color: 'primary',
    },
    {
      value: 'json' as const,
      label: 'JSON',
      description: 'API-compatible structured data',
      icon: FileJson,
      color: 'warning',
    },
    {
      value: 'pdf' as const,
      label: 'PDF',
      description: 'Business report with charts',
      icon: FileImage,
      color: 'danger',
    },
  ];

  /**
   * Section options
   */
  const sectionOptions = [
    { key: 'overview' as const, label: 'Overview Metrics', available: !!data.overview },
    { key: 'trends' as const, label: 'Sales Trends', available: !!data.trends && data.trends.length > 0 },
    { key: 'forecast' as const, label: 'Forecast Data', available: !!data.forecast },
    { key: 'benchmarks' as const, label: 'Performance Benchmarks', available: !!data.benchmarks },
    { key: 'anomalies' as const, label: 'Anomaly Detection', available: !!data.anomalies && data.anomalies.anomalies.length > 0 },
    { key: 'bestSellers' as const, label: 'Best Sellers', available: !!data.bestSellers && data.bestSellers.length > 0 },
    { key: 'cashierPerformance' as const, label: 'Cashier Performance', available: !!data.cashierPerformance && data.cashierPerformance.length > 0 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Download className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Export Analytics Data
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Choose format and select data to export
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {formatOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = format === option.value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => setFormat(option.value)}
                    disabled={isExporting}
                    className={`
                      relative p-4 rounded-lg border-2 text-left transition-all
                      ${isSelected
                        ? `border-${option.color}-600 bg-${option.color}-50 dark:bg-${option.color}-900/20`
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 flex-shrink-0 ${
                        isSelected 
                          ? `text-${option.color}-600 dark:text-${option.color}-400` 
                          : 'text-gray-400 dark:text-gray-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {option.description}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className={`h-5 w-5 text-${option.color}-600 dark:text-${option.color}-400`} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range Info */}
          {data.dateRange && (
            <div className="p-4 bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800 rounded-lg">
              <p className="text-sm text-info-900 dark:text-info-100">
                <span className="font-semibold">Date Range:</span>{' '}
                {data.dateRange.startDate} to {data.dateRange.endDate}
              </p>
            </div>
          )}

          {/* Section Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Include Sections
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAllSections}
                  disabled={isExporting}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
                >
                  Select All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={deselectAllSections}
                  disabled={isExporting}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {sectionOptions.map((option) => (
                <label
                  key={option.key}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer
                    ${option.available
                      ? 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                    }
                    ${sections[option.key] && option.available ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800' : ''}
                  `}
                >
                  <button
                    type="button"
                    onClick={() => option.available && toggleSection(option.key)}
                    disabled={!option.available || isExporting}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    {sections[option.key] && option.available ? (
                      <CheckCircle2 className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${
                      option.available
                        ? 'text-gray-900 dark:text-gray-100'
                        : 'text-gray-400 dark:text-gray-600'
                    }`}>
                      {option.label}
                    </span>
                  </button>
                  {!option.available && (
                    <span className="text-xs text-gray-400 dark:text-gray-600">
                      No data
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* PDF-specific options */}
          {format === 'pdf' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                PDF Options
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  disabled={isExporting}
                  className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Include Charts (captures visible charts as images)
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {Object.values(sections).filter(Boolean).length} section(s) selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || Object.values(sections).every(v => !v)}
              className="px-6 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <LoaderIcon className="h-4 w-4 animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Export {format.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExportModal;