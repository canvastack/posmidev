<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = $this->route('tenantId');

        return [
            'name' => 'required|string|max:255',
            'sku' => [
                'required',
                'string',
                'max:100',
                'unique:products,sku' . ($this->route('product') ? ',' . $this->route('product')->id . ',id' : '') . ',tenant_id,' . $tenantId
            ],
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'category_id' => 'nullable|uuid|exists:categories,id',
            'description' => 'nullable|string',
            'cost_price' => 'nullable|numeric|min:0',
        ];
    }
}