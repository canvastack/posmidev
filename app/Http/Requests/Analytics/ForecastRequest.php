<?php

namespace App\Http\Requests\Analytics;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Forecast Request Validator
 * 
 * Validates forecast generation requests for POS Analytics.
 * 
 * Phase 5 Day 2: API Endpoints Implementation
 * 
 * @package App\Http\Requests\Analytics
 */
class ForecastRequest extends FormRequest
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
            'metric_type' => 'sometimes|string|in:revenue,transactions,average_ticket',
            'days_ahead' => 'sometimes|integer|min:1|max:365',
            'algorithm' => 'sometimes|string|in:linear_regression,exponential_smoothing',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'metric_type.in' => 'Metric type must be one of: revenue, transactions, average_ticket',
            'days_ahead.min' => 'Days ahead must be at least 1',
            'days_ahead.max' => 'Days ahead cannot exceed 365 days',
            'algorithm.in' => 'Algorithm must be one of: linear_regression, exponential_smoothing',
        ];
    }

    /**
     * Get validated data with defaults
     */
    public function getValidatedWithDefaults(): array
    {
        return [
            'metric_type' => $this->input('metric_type', 'revenue'),
            'days_ahead' => $this->input('days_ahead', 30),
            'algorithm' => $this->input('algorithm', 'linear_regression'),
        ];
    }
}