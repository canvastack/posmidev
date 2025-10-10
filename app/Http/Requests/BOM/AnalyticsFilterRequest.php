<?php

namespace App\Http\Requests\BOM;

use Illuminate\Foundation\Http\FormRequest;

/**
 * AnalyticsFilterRequest
 * 
 * Validates analytics filter requests for BOM analytics endpoints
 * 
 * @package App\Http\Requests\BOM
 */
class AnalyticsFilterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('materials.view');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'days' => 'sometimes|integer|min:1|max:365',
            'categories' => 'sometimes|array',
            'categories.*' => 'string|max:255',
            'material_id' => 'sometimes|uuid|exists:materials,id',
            'forecast_days' => 'sometimes|integer|min:1|max:90',
            'target_days_of_stock' => 'sometimes|integer|min:1|max:365',
        ];
    }

    /**
     * Get custom error messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'days.integer' => 'Days must be a valid integer.',
            'days.min' => 'Days must be at least 1.',
            'days.max' => 'Days cannot exceed 365.',
            'categories.array' => 'Categories must be an array.',
            'categories.*.string' => 'Each category must be a string.',
            'material_id.uuid' => 'Material ID must be a valid UUID.',
            'material_id.exists' => 'The selected material does not exist.',
            'forecast_days.integer' => 'Forecast days must be a valid integer.',
            'forecast_days.min' => 'Forecast days must be at least 1.',
            'forecast_days.max' => 'Forecast days cannot exceed 90.',
            'target_days_of_stock.integer' => 'Target days of stock must be a valid integer.',
            'target_days_of_stock.min' => 'Target days of stock must be at least 1.',
            'target_days_of_stock.max' => 'Target days of stock cannot exceed 365.',
        ];
    }
}