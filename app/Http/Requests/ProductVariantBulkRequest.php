<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductVariantBulkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = $this->route('tenantId');

        return [
            'variants' => 'required|array|min:1|max:500', // Limit to 500 variants per bulk operation
            'variants.*.sku' => [
                'required',
                'string',
                'max:100',
            ],
            'variants.*.name' => 'nullable|string|max:255',
            'variants.*.attributes' => 'nullable|array',
            'variants.*.attributes.*' => 'string|max:255',
            'variants.*.price' => 'nullable|numeric|min:0',
            'variants.*.cost_price' => 'nullable|numeric|min:0',
            'variants.*.price_modifier' => 'nullable|numeric',
            'variants.*.stock' => 'nullable|integer|min:0',
            'variants.*.reorder_point' => 'nullable|integer|min:0',
            'variants.*.reorder_quantity' => 'nullable|integer|min:0',
            'variants.*.low_stock_alert_enabled' => 'nullable|boolean',
            'variants.*.image_path' => 'nullable|string|max:500',
            'variants.*.barcode' => 'nullable|string|max:100',
            'variants.*.is_active' => 'nullable|boolean',
            'variants.*.is_default' => 'nullable|boolean',
            'variants.*.sort_order' => 'nullable|integer|min:0',
            'variants.*.notes' => 'nullable|string',
            'variants.*.metadata' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'variants.required' => 'At least one variant is required',
            'variants.max' => 'Maximum 500 variants allowed per bulk operation',
            'variants.*.sku.required' => 'SKU is required for each variant',
        ];
    }

    /**
     * Validate SKU uniqueness within the request
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $skus = collect($this->variants)->pluck('sku')->filter();
            $duplicates = $skus->duplicates();
            
            if ($duplicates->count() > 0) {
                $validator->errors()->add('variants', 'Duplicate SKUs found in request: ' . $duplicates->implode(', '));
            }
        });
    }
}