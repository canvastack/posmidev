<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = $this->route('tenantId');
        $productId = $this->route('product') ? $this->route('product')->id : null;
        $isUpdate = $this->isMethod('PUT') || $this->isMethod('PATCH');

        $skuRule = Rule::unique('products', 'sku')
            ->where('tenant_id', $tenantId);
        
        // If updating, ignore the current product's SKU
        if ($productId) {
            $skuRule->ignore($productId);
        }

        // Build base rules
        $rules = [
            'category_id' => 'nullable|uuid|exists:categories,id',
            'description' => 'nullable|string',
            'cost_price' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:active,inactive,discontinued',
            'has_variants' => 'nullable|boolean',
            'manage_stock_by_variant' => 'nullable|boolean',
        ];

        // For updates, make core fields optional (sometimes)
        if ($isUpdate) {
            $rules['name'] = ['sometimes', 'required', 'string', 'max:255'];
            $rules['sku'] = ['sometimes', 'required', 'string', 'max:100', $skuRule];
            $rules['price'] = ['sometimes', 'required', 'numeric', 'min:0'];
            $rules['stock'] = ['sometimes', 'required', 'integer', 'min:0'];
        } else {
            $rules['name'] = ['required', 'string', 'max:255'];
            $rules['sku'] = ['required', 'string', 'max:100', $skuRule];
            $rules['price'] = ['required', 'numeric', 'min:0'];
            $rules['stock'] = ['required', 'integer', 'min:0'];
        }

        return $rules;
    }
}