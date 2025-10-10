<?php

namespace App\Http\Requests\BOM;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * ReportExportRequest
 * 
 * Validates report export requests
 * 
 * @package App\Http\Requests\BOM
 */
class ReportExportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('bom.reports.export');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'report_type' => [
                'required',
                'string',
                Rule::in([
                    'executive_dashboard',
                    'material_usage',
                    'recipe_costing',
                    'stock_movement',
                    'production_efficiency',
                    'comprehensive',
                ]),
            ],
            'format' => [
                'sometimes',
                'string',
                Rule::in(['json', 'csv', 'pdf', 'excel']),
            ],
            'days' => 'sometimes|integer|min:1|max:365',
            'include_charts' => 'sometimes|boolean',
            'include_details' => 'sometimes|boolean',
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
            'report_type.required' => 'Report type is required.',
            'report_type.in' => 'Invalid report type. Must be one of: executive_dashboard, material_usage, recipe_costing, stock_movement, production_efficiency, comprehensive.',
            'format.in' => 'Invalid format. Must be one of: json, csv, pdf, excel.',
            'days.integer' => 'Days must be a valid integer.',
            'days.min' => 'Days must be at least 1.',
            'days.max' => 'Days cannot exceed 365.',
            'include_charts.boolean' => 'Include charts must be a boolean.',
            'include_details.boolean' => 'Include details must be a boolean.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'report_type' => 'report type',
            'include_charts' => 'include charts option',
            'include_details' => 'include details option',
        ];
    }
}