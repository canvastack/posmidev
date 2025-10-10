<?php

namespace App\Http\Requests\BOM;

use Illuminate\Foundation\Http\FormRequest;

class MaterialUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('materials.update');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $tenantId = $this->route('tenantId');
        $materialId = $this->route('material');
        
        return [
            'name' => 'sometimes|required|string|max:255',
            'sku' => [
                'sometimes',
                'nullable',
                'string',
                'max:100',
                'unique:materials,sku,' . $materialId . ',id,tenant_id,' . $tenantId . ',deleted_at,NULL'
            ],
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:255',
            'unit' => 'sometimes|required|in:kg,g,L,ml,pcs,box,bottle,can,bag',
            'stock_quantity' => 'sometimes|required|numeric|min:0',
            'reorder_level' => 'nullable|numeric|min:0',
            'unit_cost' => 'nullable|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
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
            'name.required' => 'Material name is required.',
            'name.max' => 'Material name cannot exceed 255 characters.',
            'sku.unique' => 'This SKU is already in use for this tenant.',
            'unit.required' => 'Unit of measurement is required.',
            'unit.in' => 'Invalid unit of measurement. Must be one of: kg, g, L, ml, pcs, box, bottle, can, bag.',
            'stock_quantity.required' => 'Stock quantity is required.',
            'stock_quantity.numeric' => 'Stock quantity must be a number.',
            'stock_quantity.min' => 'Stock quantity cannot be negative.',
            'reorder_level.numeric' => 'Reorder level must be a number.',
            'reorder_level.min' => 'Reorder level cannot be negative.',
            'unit_cost.numeric' => 'Unit cost must be a number.',
            'unit_cost.min' => 'Unit cost cannot be negative.',
        ];
    }
}