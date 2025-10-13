<?php

namespace App\Http\Requests\Analytics;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Update Preferences Request Validator
 * 
 * Validates analytics preferences update requests.
 * 
 * Phase 5 Day 2: API Endpoints Implementation
 * 
 * @package App\Http\Requests\Analytics
 */
class UpdatePreferencesRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by controller
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Anomaly Detection Settings
            'anomaly_window_days' => 'sometimes|integer|min:3|max:90',
            'anomaly_threshold_low' => 'sometimes|numeric|min:0.5|max:5.0',
            'anomaly_threshold_medium' => 'sometimes|numeric|min:0.5|max:5.0',
            'anomaly_threshold_high' => 'sometimes|numeric|min:0.5|max:5.0',
            'anomaly_threshold_critical' => 'sometimes|numeric|min:0.5|max:5.0',
            
            // Forecasting Settings
            'forecast_days_ahead' => 'sometimes|integer|min:1|max:365',
            'forecast_algorithm' => 'sometimes|string|in:linear_regression,exponential_smoothing',
            
            // Notification Settings
            'email_notifications_enabled' => 'sometimes|boolean',
            'notification_severity_filter' => 'sometimes|array',
            'notification_severity_filter.*' => 'string|in:low,medium,high,critical',
            'notification_digest_frequency' => 'sometimes|string|in:realtime,daily,weekly',
            
            // Benchmark Settings
            'benchmark_baseline_days' => 'sometimes|integer|min:7|max:365',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'anomaly_window_days.min' => 'Anomaly window must be at least 3 days',
            'anomaly_window_days.max' => 'Anomaly window cannot exceed 90 days',
            'anomaly_threshold_low.min' => 'Threshold must be at least 0.5',
            'anomaly_threshold_low.max' => 'Threshold cannot exceed 5.0',
            'forecast_days_ahead.max' => 'Forecast cannot exceed 365 days',
            'forecast_algorithm.in' => 'Algorithm must be linear_regression or exponential_smoothing',
            'notification_severity_filter.*.in' => 'Severity filter must be: low, medium, high, or critical',
            'notification_digest_frequency.in' => 'Digest frequency must be: realtime, daily, or weekly',
            'benchmark_baseline_days.min' => 'Baseline must be at least 7 days',
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $data = $validator->getData();
            
            // Ensure thresholds are in ascending order
            $thresholds = [
                'low' => $data['anomaly_threshold_low'] ?? null,
                'medium' => $data['anomaly_threshold_medium'] ?? null,
                'high' => $data['anomaly_threshold_high'] ?? null,
                'critical' => $data['anomaly_threshold_critical'] ?? null,
            ];
            
            $filtered = array_filter($thresholds, fn($v) => $v !== null);
            
            if (count($filtered) >= 2) {
                $values = array_values($filtered);
                for ($i = 1; $i < count($values); $i++) {
                    if ($values[$i] <= $values[$i - 1]) {
                        $validator->errors()->add(
                            'anomaly_thresholds',
                            'Anomaly thresholds must be in ascending order (low < medium < high < critical)'
                        );
                        break;
                    }
                }
            }
        });
    }
}