<?php

namespace App\Http\Requests\BOM;

use Illuminate\Foundation\Http\FormRequest;

class RecipeComponentCreateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('recipes.manage_components');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $tenantId = $this->route('tenantId');
        
        return [
            'material_id' => [
                'required',
                'uuid',
                'exists:materials,id,tenant_id,' . $tenantId . ',deleted_at,NULL'
            ],
            'quantity_required' => 'required|numeric|min:0.001',
            'unit' => 'required|string|max:50',
            'waste_percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string',
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
            'material_id.required' => 'Material is required.',
            'material_id.uuid' => 'Invalid material ID format.',
            'material_id.exists' => 'Selected material not found.',
            'quantity_required.required' => 'Quantity is required.',
            'quantity_required.numeric' => 'Quantity must be a number.',
            'quantity_required.min' => 'Quantity must be greater than 0.',
            'unit.required' => 'Unit is required.',
            'waste_percentage.numeric' => 'Waste percentage must be a number.',
            'waste_percentage.min' => 'Waste percentage cannot be negative.',
            'waste_percentage.max' => 'Waste percentage cannot exceed 100%.',
        ];
    }
}