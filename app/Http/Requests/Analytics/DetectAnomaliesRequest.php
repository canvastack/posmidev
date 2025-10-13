<?php

namespace App\Http\Requests\Analytics;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Detect Anomalies Request Validator
 * 
 * Validates anomaly detection requests for POS Analytics.
 * 
 * Phase 5 Day 2: API Endpoints Implementation
 * 
 * @package App\Http\Requests\Analytics
 */
class DetectAnomaliesRequest extends FormRequest
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
            'start_date' => 'sometimes|date|before_or_equal:today',
            'end_date' => 'sometimes|date|after_or_equal:start_date|before_or_equal:today',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'start_date.before_or_equal' => 'Start date cannot be in the future',
            'end_date.after_or_equal' => 'End date must be after or equal to start date',
            'end_date.before_or_equal' => 'End date cannot be in the future',
        ];
    }

    /**
     * Get validated data with defaults
     */
    public function getValidatedWithDefaults(): array
    {
        return [
            'start_date' => $this->input('start_date', now()->subDays(30)->toDateString()),
            'end_date' => $this->input('end_date', now()->toDateString()),
        ];
    }
}