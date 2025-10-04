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

        $skuRule = Rule::unique('products', 'sku')
            ->where('tenant_id', $tenantId);
        
        // If updating, ignore the current product's SKU
        if ($productId) {
            $skuRule->ignore($productId);
        }

        return [
            'name' => 'required|string|max:255',
            'sku' => [
                'required',
                'string',
                'max:100',
                $skuRule
            ],
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'category_id' => 'nullable|uuid|exists:categories,id',
            'description' => 'nullable|string',
            'cost_price' => 'nullable|numeric|min:0',
            'status' => 'nullable|string|in:active,inactive,discontinued',
        ];
    }
}