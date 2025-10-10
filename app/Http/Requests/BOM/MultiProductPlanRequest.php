<?php

namespace App\Http\Requests\BOM;

use Illuminate\Foundation\Http\FormRequest;

class MultiProductPlanRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('bom.batch_plan');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'products' => 'required|array|min:1|max:20',
            'products.*.product_id' => 'required|uuid',
            'products.*.quantity' => 'required|numeric|min:0.01',
            'strategy' => 'nullable|string|in:priority,balanced,maximize',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'products.required' => 'Products array is required.',
            'products.array' => 'Products must be an array.',
            'products.min' => 'At least one product is required.',
            'products.max' => 'Maximum 20 products can be planned at once.',
            'products.*.product_id.required' => 'Product ID is required for each item.',
            'products.*.product_id.uuid' => 'Product ID must be a valid UUID.',
            'products.*.quantity.required' => 'Quantity is required for each product.',
            'products.*.quantity.numeric' => 'Quantity must be a number.',
            'products.*.quantity.min' => 'Quantity must be greater than 0.',
            'strategy.in' => 'Strategy must be one of: priority, balanced, maximize.',
        ];
    }
}