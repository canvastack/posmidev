<?php

namespace App\Http\Requests\BOM;

use Illuminate\Foundation\Http\FormRequest;

class RecipeUpdateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('recipes.update');
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
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'yield_quantity' => 'sometimes|required|numeric|min:0.001',
            'yield_unit' => 'sometimes|required|in:pcs,kg,L,serving,batch',
            'is_active' => 'nullable|boolean',
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
            'name.required' => 'Recipe name is required.',
            'name.max' => 'Recipe name cannot exceed 255 characters.',
            'yield_quantity.required' => 'Yield quantity is required.',
            'yield_quantity.numeric' => 'Yield quantity must be a number.',
            'yield_quantity.min' => 'Yield quantity must be greater than 0.',
            'yield_unit.required' => 'Yield unit is required.',
            'yield_unit.in' => 'Invalid yield unit. Must be one of: pcs, kg, L, serving, batch.',
        ];
    }
}