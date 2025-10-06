<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = $this->route('tenantId');
        $productId = $this->route('productId');
        $variantId = $this->route('variantId');
        $isUpdate = $this->isMethod('PATCH') || $this->isMethod('PUT') || $variantId;

        $skuRule = Rule::unique('product_variants', 'sku')
            ->where('tenant_id', $tenantId);
        
        // If updating, ignore the current variant's SKU
        if ($variantId) {
            $skuRule->ignore($variantId);
        }

        return [
            'sku' => [
                $isUpdate ? 'sometimes' : 'required',
                'string',
                'max:100',
                $skuRule
            ],
            'name' => 'nullable|string|max:255',
            'attributes' => 'nullable|array',
            'attributes.*' => 'string|max:255',
            'price' => ($isUpdate ? 'sometimes' : 'required') . '|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'price_modifier' => 'nullable|numeric',
            'stock' => 'nullable|integer|min:0',
            'reorder_point' => 'nullable|integer|min:0',
            'reorder_quantity' => 'nullable|integer|min:0',
            'low_stock_alert_enabled' => 'nullable|boolean',
            'image_path' => 'nullable|string|max:500',
            'thumbnail_path' => 'nullable|string|max:500',
            'barcode' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('product_variants', 'barcode')
                    ->where('tenant_id', $tenantId)
                    ->where('product_id', $productId)
                    ->ignore($variantId)
            ],
            'is_active' => 'nullable|boolean',
            'is_default' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
            'metadata' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'sku.required' => 'SKU is required',
            'sku.unique' => 'This SKU already exists for this tenant',
            'price.required' => 'Price is required',
            'price.min' => 'Price must be at least 0',
            'barcode.unique' => 'This barcode already exists for this product',
        ];
    }
}