/**
 * Anomaly Alerts Panel
 * 
 * Phase 4A+ Day 3: Anomaly Detection & Advanced Visualization
 * Displays detected anomalies with filtering and sorting capabilities
 * 
 * Features:
 * - List of detected anomalies
 * - Filter by type (spike/drop/flat)
 * - Filter by severity (low/medium/high/critical)
 * - Visual indicators (icons, colors)
 * - Expandable details
 * 
 * Design: Uses design tokens from index.css
 * Dark mode: Full support
 * Responsive: Mobile-optimized
 */

import React, { useState, useMemo } from 'react';
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  MinusIcon, 
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FilterIcon,
  XIcon,
} from 'lucide-react';
import type { Anomaly, AnomalyDetectionResult, AnomalyType, AnomalySeverity } from '@/types/analytics';
import { formatCurrency } from '@/lib/utils/currency';

interface AnomalyAlertsPanelProps {
  result: AnomalyDetectionResult;
  metric: 'revenue' | 'transactions' | 'average_ticket';
}

const AnomalyAlertsPanel: React.FC<AnomalyAlertsPanelProps> = ({ result, metric }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<AnomalyType | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<AnomalySeverity | 'all'>('all');

  // Filter anomalies
  const filteredAnomalies = useMemo(() => {
    return result.anomalies.filter(anomaly => {
      if (filterType !== 'all' && anomaly.type !== filterType) return false;
      if (filterSeverity !== 'all' && anomaly.severity !== filterSeverity) return false;
      return true;
    });
  }, [result.anomalies, filterType, filterSeverity]);

  // Get icon for anomaly type
  const getIcon = (type: AnomalyType) => {
    switch (type) {
      case 'spike': return <TrendingUpIcon className="w-5 h-5" />;
      case 'drop': return <TrendingDownIcon className="w-5 h-5" />;
      case 'flat': return <MinusIcon className="w-5 h-5" />;
    }
  };

  // Get color classes for anomaly type
  const getColorClasses = (anomaly: Anomaly) => {
    if (anomaly.type === 'flat') {
      return 'bg-warning-100 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400 border-warning-300 dark:border-warning-700';
    }
    
    if (anomaly.type === 'spike') {
      switch (anomaly.severity) {
        case 'critical': return 'bg-success-100 dark:bg-success-900/20 text-success-700 dark:text-success-400 border-success-300 dark:border-success-700';
        case 'high': return 'bg-success-100 dark:bg-success-900/20 text-success-600 dark:text-success-400 border-success-300 dark:border-success-700';
        default: return 'bg-success-50 dark:bg-success-900/10 text-success-600 dark:text-success-400 border-success-200 dark:border-success-800';
      }
    }
    
    if (anomaly.type === 'drop') {
      switch (anomaly.severity) {
        case 'critical': return 'bg-danger-100 dark:bg-danger-900/20 text-danger-700 dark:text-danger-400 border-danger-300 dark:border-danger-700';
        case 'high': return 'bg-danger-100 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400 border-danger-300 dark:border-danger-700';
        default: return 'bg-danger-50 dark:bg-danger-900/10 text-danger-600 dark:text-danger-400 border-danger-200 dark:border-danger-800';
      }
    }
    
    return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
  };

  // Format value based on metric
  const formatValue = (value: number) => {
    if (metric === 'revenue') return formatCurrency(value);
    if (metric === 'transactions') return `${Math.round(value)} transaksi`;
    return formatCurrency(value); // average_ticket
  };

  // Get severity label
  const getSeverityLabel = (severity: AnomalySeverity) => {
    switch (severity) {
      case 'critical': return 'Kritis';
      case 'high': return 'Tinggi';
      case 'medium': return 'Sedang';
      case 'low': return 'Rendah';
    }
  };

  // Get type label
  const getTypeLabel = (type: AnomalyType) => {
    switch (type) {
      case 'spike': return 'Lonjakan';
      case 'drop': return 'Penurunan';
      case 'flat': return 'Stagnan';
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const clearFilters = () => {
    setFilterType('all');
    setFilterSeverity('all');
  };

  const hasActiveFilters = filterType !== 'all' || filterSeverity !== 'all';

  if (result.totalAnomalies === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center text-center">
          <div>
            <AlertCircleIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              Tidak Ada Anomali Terdeteksi
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Data Anda menunjukkan pola yang normal dan konsisten
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Anomali Terdeteksi
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filteredAnomalies.length} dari {result.totalAnomalies} anomali
            </p>
          </div>
          
          {/* Filter Controls */}
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as AnomalyType | 'all')}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Semua Tipe</option>
              <option value="spike">Lonjakan</option>
              <option value="drop">Penurunan</option>
              <option value="flat">Stagnan</option>
            </select>
            
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as AnomalySeverity | 'all')}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Semua Tingkat</option>
              <option value="critical">Kritis</option>
              <option value="high">Tinggi</option>
              <option value="medium">Sedang</option>
              <option value="low">Rendah</option>
            </select>
            
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Clear filters"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Anomaly List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
        {filteredAnomalies.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <FilterIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tidak ada anomali yang cocok dengan filter yang dipilih
            </p>
          </div>
        ) : (
          filteredAnomalies.map((anomaly, index) => {
            const isExpanded = expandedId === `${anomaly.date}-${index}`;
            const colorClasses = getColorClasses(anomaly);
            
            return (
              <div key={`${anomaly.date}-${index}`} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg border ${colorClasses}`}>
                      {getIcon(anomaly.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {anomaly.description}
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
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{new Date(anomaly.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span>{getTypeLabel(anomaly.type)}</span>
                        <span className="font-medium">{anomaly.variance >= 0 ? '+' : ''}{anomaly.variance.toFixed(1)}%</span>
                      </div>
                      
                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-2">
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Nilai Aktual:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{formatValue(anomaly.value)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Nilai Ekspektasi:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{formatValue(anomaly.expectedValue)}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Z-Score:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{anomaly.zScore.toFixed(2)}σ</span>
                            </div>
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Deviasi:</span>
                              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{Math.abs(anomaly.variance).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Expand Button */}
                  <button
                    onClick={() => toggleExpanded(`${anomaly.date}-${index}`)}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    {isExpanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Summary */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>
            Deteksi menggunakan {result.detectionParams.windowSize}-hari rolling window, threshold {result.detectionParams.threshold}σ
          </span>
          <span>
            {result.spikesCount} lonjakan, {result.dropsCount} penurunan{result.flatCount > 0 && `, ${result.flatCount} stagnan`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AnomalyAlertsPanel;