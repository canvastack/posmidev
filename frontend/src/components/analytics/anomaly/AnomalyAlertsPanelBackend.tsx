/**
 * Anomaly Alerts Panel (Backend-Powered)
 * 
 * Phase 5 Day 4: Backend Integration
 * Displays anomalies fetched from backend API (persistent storage)
 * 
 * Features:
 * - Fetch anomalies from database
 * - Filter by type, severity, acknowledged status
 * - Pagination support
 * - Acknowledge anomaly workflow
 * - Visual indicators (icons, colors)
 * 
 * Design: Uses design tokens from index.css
 * Dark mode: Full support
 * Responsive: Mobile-optimized
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  MinusIcon, 
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XIcon,
  CheckCircleIcon,
  LoaderIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import type { BackendAnomaly, AnomalyFilters } from '@/types/analytics';
import { formatCurrency } from '@/lib/utils/currency';

interface AnomalyAlertsPanelBackendProps {
  tenantId: string;
  metric?: 'revenue' | 'transactions' | 'average_ticket'; // Optional filter
}

const AnomalyAlertsPanelBackend: React.FC<AnomalyAlertsPanelBackendProps> = ({ 
  tenantId,
  metric,
}) => {
  const {
    anomalies,
    anomaliesMeta,
    isLoadingAnomalies,
    anomaliesError,
    fetchAnomalies,
    acknowledgeAnomaly,
  } = useAnalyticsStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnomalyFilters>({
    metric_type: metric,
    acknowledged: false, // Show unacknowledged by default
    page: 1,
    per_page: 10,
  });

  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  // Fetch anomalies on mount and when filters change
  useEffect(() => {
    if (tenantId) {
      fetchAnomalies(tenantId, filters);
    }
  }, [tenantId, filters, fetchAnomalies]);

  // Update filters
  const updateFilter = (key: keyof AnomalyFilters, value: string | number | boolean | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 })); // Reset to page 1 on filter change
  };

  const clearFilters = () => {
    setFilters({
      metric_type: metric,
      acknowledged: false,
      page: 1,
      per_page: 10,
    });
  };

  const handleAcknowledge = async (anomalyId: string) => {
    setAcknowledgingId(anomalyId);
    try {
      await acknowledgeAnomaly(tenantId, anomalyId);
    } catch (error: unknown) {
      console.error('Failed to acknowledge anomaly:', error);
      // Could show toast notification here
    } finally {
      setAcknowledgingId(null);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Get icon for anomaly type
  const getIcon = (type: string) => {
    switch (type) {
      case 'spike': return <TrendingUpIcon className="w-5 h-5" />;
      case 'drop': return <TrendingDownIcon className="w-5 h-5" />;
      case 'flat': return <MinusIcon className="w-5 h-5" />;
      default: return <AlertCircleIcon className="w-5 h-5" />;
    }
  };

  // Get color classes for anomaly
  const getColorClasses = (anomaly: BackendAnomaly) => {
    if (anomaly.anomaly_type === 'flat') {
      return 'bg-warning-100 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400 border-warning-300 dark:border-warning-700';
    }
    
    if (anomaly.anomaly_type === 'spike') {
      switch (anomaly.severity) {
        case 'critical': return 'bg-success-100 dark:bg-success-900/20 text-success-700 dark:text-success-400 border-success-300 dark:border-success-700';
        case 'high': return 'bg-success-100 dark:bg-success-900/20 text-success-600 dark:text-success-400 border-success-300 dark:border-success-700';
        default: return 'bg-success-50 dark:bg-success-900/10 text-success-600 dark:text-success-400 border-success-200 dark:border-success-800';
      }
    }
    
    if (anomaly.anomaly_type === 'drop') {
      switch (anomaly.severity) {
        case 'critical': return 'bg-danger-100 dark:bg-danger-900/20 text-danger-700 dark:text-danger-400 border-danger-300 dark:border-danger-700';
        case 'high': return 'bg-danger-100 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400 border-danger-300 dark:border-danger-700';
        default: return 'bg-danger-50 dark:bg-danger-900/10 text-danger-600 dark:text-danger-400 border-danger-200 dark:border-danger-800';
      }
    }
    
    return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
  };

  // Format value based on metric
  const formatValue = (value: number, metricType: string) => {
    if (metricType === 'revenue' || metricType === 'average_ticket') return formatCurrency(value);
    return `${Math.round(value)} transaksi`;
  };

  // Get severity label
  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Kritis';
      case 'high': return 'Tinggi';
      case 'medium': return 'Sedang';
      case 'low': return 'Rendah';
      default: return severity;
    }
  };

  // Get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'spike': return 'Lonjakan';
      case 'drop': return 'Penurunan';
      case 'flat': return 'Stagnan';
      default: return type;
    }
  };

  // Get anomaly description
  const getDescription = (anomaly: BackendAnomaly) => {
    const typeLabel = getTypeLabel(anomaly.anomaly_type);
    const metricLabel = anomaly.metric_type === 'revenue' ? 'Pendapatan' : 
                        anomaly.metric_type === 'transactions' ? 'Transaksi' : 'Rata-rata Tiket';
    return `${typeLabel} ${metricLabel} yang Tidak Biasa`;
  };

  const hasActiveFilters = 
    filters.anomaly_type || 
    filters.severity || 
    (filters.acknowledged !== false && filters.acknowledged !== undefined);

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  if (anomaliesError) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center text-center">
          <div>
            <AlertCircleIcon className="w-12 h-12 text-danger-400 dark:text-danger-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              Gagal Memuat Anomali
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {anomaliesError}
            </p>
            <button
              onClick={() => fetchAnomalies(tenantId, filters)}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingAnomalies && !anomalies.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12">
        <div className="flex items-center justify-center">
          <LoaderIcon className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (anomalies.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center text-center">
          <div>
            <AlertCircleIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              {hasActiveFilters ? 'Tidak Ada Anomali yang Cocok' : 'Tidak Ada Anomali Terdeteksi'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {hasActiveFilters 
                ? 'Coba ubah filter untuk melihat anomali lainnya' 
                : 'Data Anda menunjukkan pola yang normal dan konsisten'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                Hapus Filter
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Anomali Terdeteksi
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {anomaliesMeta?.total || 0} total anomali{filters.acknowledged === false ? ' (belum diakui)' : ''}
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.anomaly_type || 'all'}
            onChange={(e) => updateFilter('anomaly_type', e.target.value === 'all' ? undefined : e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Semua Tipe</option>
            <option value="spike">Lonjakan</option>
            <option value="drop">Penurunan</option>
            <option value="flat">Stagnan</option>
          </select>
          
          <select
            value={filters.severity || 'all'}
            onChange={(e) => updateFilter('severity', e.target.value === 'all' ? undefined : e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Semua Tingkat</option>
            <option value="critical">Kritis</option>
            <option value="high">Tinggi</option>
            <option value="medium">Sedang</option>
            <option value="low">Rendah</option>
          </select>

          <select
            value={filters.acknowledged === undefined ? 'all' : String(filters.acknowledged)}
            onChange={(e) => updateFilter('acknowledged', e.target.value === 'all' ? undefined : e.target.value === 'true')}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="false">Belum Diakui</option>
            <option value="true">Sudah Diakui</option>
            <option value="all">Semua Status</option>
          </select>
          
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              title="Hapus filter"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Anomaly List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
        {anomalies.map((anomaly) => {
          const isExpanded = expandedId === anomaly.id;
          const colorClasses = getColorClasses(anomaly);
          
          return (
            <div key={anomaly.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg border ${colorClasses}`}>
                    {getIcon(anomaly.anomaly_type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {getDescription(anomaly)}
                      </h4>
                      
                      {/* Severity Badge */}
                      {anomaly.severity !== 'low' && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                          anomaly.severity === 'critical' 
                            ? 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400'
                            : anomaly.severity === 'high'
                            ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400'
                            : 'bg-info-100 text-info-700 dark:bg-info-900/30 dark:text-info-400'
                        }`}>
                          {getSeverityLabel(anomaly.severity)}
                        </span>
                      )}

                      {/* Acknowledged Badge */}
                      {anomaly.acknowledged && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400 flex items-center gap-1">
                          <CheckCircleIcon className="w-3 h-3" />
                          Diakui
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>{new Date(anomaly.detected_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>{getTypeLabel(anomaly.anomaly_type)}</span>
                      <span className="font-medium">{anomaly.variance_percent >= 0 ? '+' : ''}{anomaly.variance_percent.toFixed(1)}%</span>
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-2">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Nilai Aktual:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {formatValue(anomaly.actual_value, anomaly.metric_type)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Nilai Ekspektasi:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                              {formatValue(anomaly.expected_value, anomaly.metric_type)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Z-Score:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{anomaly.z_score.toFixed(2)}σ</span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Deviasi:</span>
                            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{Math.abs(anomaly.variance_percent).toFixed(1)}%</span>
                          </div>
                        </div>

                        {!anomaly.acknowledged && (
                          <div className="pt-2">
                            <button
                              onClick={() => handleAcknowledge(anomaly.id)}
                              disabled={acknowledgingId === anomaly.id}
                              className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              {acknowledgingId === anomaly.id ? (
                                <>
                                  <LoaderIcon className="w-4 h-4 animate-spin" />
                                  Mengakui...
                                </>
                              ) : (
                                <>
                                  <CheckCircleIcon className="w-4 h-4" />
                                  Akui Anomali
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Expand Button */}
                <button
                  onClick={() => toggleExpanded(anomaly.id)}
                  className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  {isExpanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      {anomaliesMeta && anomaliesMeta.last_page > 1 && (
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Menampilkan {anomaliesMeta.from} - {anomaliesMeta.to} dari {anomaliesMeta.total} anomali
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(anomaliesMeta.current_page - 1)}
                disabled={anomaliesMeta.current_page === 1}
                className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300 px-2">
                Halaman {anomaliesMeta.current_page} dari {anomaliesMeta.last_page}
              </span>
              <button
                onClick={() => handlePageChange(anomaliesMeta.current_page + 1)}
                disabled={anomaliesMeta.current_page === anomaliesMeta.last_page}
                className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnomalyAlertsPanelBackend;