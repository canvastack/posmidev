<?php

namespace App\Http\Requests\BOM;

use Illuminate\Foundation\Http\FormRequest;

class MaterialBulkCreateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('materials.create');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'materials' => 'required|array|min:1|max:100',
            'materials.*.name' => 'required|string|max:255',
            'materials.*.sku' => 'nullable|string|max:100',
            'materials.*.description' => 'nullable|string',
            'materials.*.category' => 'nullable|string|max:255',
            'materials.*.unit' => 'required|in:kg,g,L,ml,pcs,box,bottle,can,bag',
            'materials.*.stock_quantity' => 'required|numeric|min:0',
            'materials.*.reorder_level' => 'nullable|numeric|min:0',
            'materials.*.unit_cost' => 'nullable|numeric|min:0',
            'materials.*.supplier' => 'nullable|string|max:255',
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
            'materials.required' => 'Materials array is required.',
            'materials.array' => 'Materials must be an array.',
            'materials.min' => 'At least one material is required.',
            'materials.max' => 'Cannot create more than 100 materials at once.',
            'materials.*.name.required' => 'Material name is required.',
            'materials.*.unit.required' => 'Unit of measurement is required.',
            'materials.*.unit.in' => 'Invalid unit of measurement.',
            'materials.*.stock_quantity.required' => 'Stock quantity is required.',
            'materials.*.stock_quantity.numeric' => 'Stock quantity must be a number.',
            'materials.*.stock_quantity.min' => 'Stock quantity cannot be negative.',
        ];
    }
}