/**
 * Analytics Settings Modal
 * 
 * Phase 5 Day 4: Frontend Integration
 * User preferences management for analytics features
 * 
 * Features:
 * - Configure anomaly detection thresholds
 * - Configure forecast settings
 * - Configure notification preferences
 * - Configure benchmark baselines
 * 
 * Design: Uses design tokens from index.css
 * Dark mode: Full support
 * Responsive: Mobile-optimized
 */

import React, { useState, useEffect } from 'react';
import {
  XIcon,
  SettingsIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  BellIcon,
  TargetIcon,
  SaveIcon,
  LoaderIcon,
} from 'lucide-react';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import type { AnalyticsPreferences, AnalyticsPreferencesUpdate } from '@/types/analytics';

interface AnalyticsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
}

const AnalyticsSettingsModal: React.FC<AnalyticsSettingsModalProps> = ({
  isOpen,
  onClose,
  tenantId,
}) => {
  const {
    preferences,
    isLoadingPreferences,
    fetchPreferences,
    updatePreferences,
  } = useAnalyticsStore();

  const [formData, setFormData] = useState<AnalyticsPreferencesUpdate>({
    anomaly_window_days: 7,
    anomaly_threshold_low: 1.5,
    anomaly_threshold_medium: 2.0,
    anomaly_threshold_high: 2.5,
    anomaly_threshold_critical: 3.0,
    forecast_days_ahead: 30,
    forecast_algorithm: 'linear_regression',
    email_notifications_enabled: true,
    notification_severity_filter: ['high', 'critical'],
    notification_digest_frequency: 'realtime',
    benchmark_baseline_days: 30,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch preferences on mount
  useEffect(() => {
    if (isOpen && tenantId) {
      fetchPreferences(tenantId);
    }
  }, [isOpen, tenantId, fetchPreferences]);

  // Update form data when preferences are fetched
  useEffect(() => {
    if (preferences) {
      setFormData({
        anomaly_window_days: preferences.anomaly_window_days,
        anomaly_threshold_low: preferences.anomaly_threshold_low,
        anomaly_threshold_medium: preferences.anomaly_threshold_medium,
        anomaly_threshold_high: preferences.anomaly_threshold_high,
        anomaly_threshold_critical: preferences.anomaly_threshold_critical,
        forecast_days_ahead: preferences.forecast_days_ahead,
        forecast_algorithm: preferences.forecast_algorithm,
        email_notifications_enabled: preferences.email_notifications_enabled,
        notification_severity_filter: preferences.notification_severity_filter,
        notification_digest_frequency: preferences.notification_digest_frequency,
        benchmark_baseline_days: preferences.benchmark_baseline_days,
      });
    }
  }, [preferences]);

  const handleInputChange = (field: keyof AnalyticsPreferencesUpdate, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSeverityToggle = (severity: string) => {
    const currentFilters = formData.notification_severity_filter || [];
    const newFilters = currentFilters.includes(severity)
      ? currentFilters.filter((s) => s !== severity)
      : [...currentFilters, severity];
    handleInputChange('notification_severity_filter', newFilters);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updatePreferences(tenantId, formData);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1500);
    } catch (error: any) {
      setSaveError(error.message || 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSaveError(null);
    setSaveSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <SettingsIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Pengaturan Analytics
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Konfigurasi deteksi anomali, forecast, dan notifikasi
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoadingPreferences ? (
            <div className="flex items-center justify-center py-12">
              <LoaderIcon className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" />
            </div>
          ) : (
            <>
              {/* Anomaly Detection Settings */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangleIcon className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Deteksi Anomali
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Rolling Window (Hari)
                    </label>
                    <input
                      type="number"
                      min="3"
                      max="90"
                      value={formData.anomaly_window_days}
                      onChange={(e) => handleInputChange('anomaly_window_days', parseInt(e.target.value))}
                      className="input w-full"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Jumlah hari yang digunakan untuk menghitung rata-rata (3-90 hari)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Threshold Rendah (σ)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="5.0"
                        value={formData.anomaly_threshold_low}
                        onChange={(e) => handleInputChange('anomaly_threshold_low', parseFloat(e.target.value))}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Threshold Sedang (σ)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="5.0"
                        value={formData.anomaly_threshold_medium}
                        onChange={(e) => handleInputChange('anomaly_threshold_medium', parseFloat(e.target.value))}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Threshold Tinggi (σ)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="5.0"
                        value={formData.anomaly_threshold_high}
                        onChange={(e) => handleInputChange('anomaly_threshold_high', parseFloat(e.target.value))}
                        className="input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Threshold Kritis (σ)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="5.0"
                        value={formData.anomaly_threshold_critical}
                        onChange={(e) => handleInputChange('anomaly_threshold_critical', parseFloat(e.target.value))}
                        className="input w-full"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Forecasting Settings */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUpIcon className="w-5 h-5 text-info-600 dark:text-info-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Forecasting
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Periode Forecast (Hari)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.forecast_days_ahead}
                      onChange={(e) => handleInputChange('forecast_days_ahead', parseInt(e.target.value))}
                      className="input w-full"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Jumlah hari ke depan untuk prediksi (1-365 hari)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Algoritma Forecast
                    </label>
                    <select
                      value={formData.forecast_algorithm}
                      onChange={(e) => handleInputChange('forecast_algorithm', e.target.value as 'linear_regression' | 'exponential_smoothing')}
                      className="input w-full"
                    >
                      <option value="linear_regression">Linear Regression</option>
                      <option value="exponential_smoothing">Exponential Smoothing</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Notification Settings */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <BellIcon className="w-5 h-5 text-success-600 dark:text-success-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Notifikasi
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="email-notifications"
                      checked={formData.email_notifications_enabled}
                      onChange={(e) => handleInputChange('email_notifications_enabled', e.target.checked)}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="email-notifications" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Aktifkan notifikasi email
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Filter Tingkat Notifikasi
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['low', 'medium', 'high', 'critical'].map((severity) => (
                        <button
                          key={severity}
                          onClick={() => handleSeverityToggle(severity)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                            formData.notification_severity_filter?.includes(severity)
                              ? 'bg-primary-100 border-primary-300 text-primary-700 dark:bg-primary-900/30 dark:border-primary-600 dark:text-primary-400'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {severity === 'low' ? 'Rendah' : severity === 'medium' ? 'Sedang' : severity === 'high' ? 'Tinggi' : 'Kritis'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Frekuensi Digest
                    </label>
                    <select
                      value={formData.notification_digest_frequency}
                      onChange={(e) => handleInputChange('notification_digest_frequency', e.target.value as 'realtime' | 'daily' | 'weekly')}
                      className="input w-full"
                    >
                      <option value="realtime">Real-time (Segera)</option>
                      <option value="daily">Harian</option>
                      <option value="weekly">Mingguan</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Benchmark Settings */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <TargetIcon className="w-5 h-5 text-accent-600 dark:text-accent-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Benchmark
                  </h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Baseline (Hari)
                  </label>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={formData.benchmark_baseline_days}
                    onChange={(e) => handleInputChange('benchmark_baseline_days', parseInt(e.target.value))}
                    className="input w-full"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Jumlah hari untuk menghitung rata-rata baseline (7-365 hari)
                  </p>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50">
          <div className="flex-1">
            {saveSuccess && (
              <div className="flex items-center gap-2 text-success-600 dark:text-success-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Pengaturan berhasil disimpan!</span>
              </div>
            )}
            {saveError && (
              <div className="flex items-center gap-2 text-danger-600 dark:text-danger-400">
                <AlertTriangleIcon className="w-5 h-5" />
                <span className="text-sm font-medium">{saveError}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isLoadingPreferences}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <SaveIcon className="w-4 h-4" />
                  Simpan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsSettingsModal;