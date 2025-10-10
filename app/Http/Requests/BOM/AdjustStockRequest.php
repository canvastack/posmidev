<?php

namespace App\Http\Requests\BOM;

use Illuminate\Foundation\Http\FormRequest;

class AdjustStockRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('materials.adjust_stock');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'type' => 'required|in:adjustment,deduction,restock',
            'quantity' => 'required|numeric|min:0.001',
            'reason' => 'required|in:purchase,waste,damage,count_adjustment,production,sale,other',
            'notes' => 'nullable|string|max:1000',
            'reference_type' => 'nullable|string|max:255',
            'reference_id' => 'nullable|uuid',
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
            'type.required' => 'Transaction type is required.',
            'type.in' => 'Invalid transaction type. Must be one of: adjustment, deduction, restock.',
            'quantity.required' => 'Quantity is required.',
            'quantity.numeric' => 'Quantity must be a number.',
            'quantity.min' => 'Quantity must be greater than 0.',
            'reason.required' => 'Reason is required.',
            'reason.in' => 'Invalid reason. Must be one of: purchase, waste, damage, count_adjustment, production, sale, other.',
            'notes.max' => 'Notes cannot exceed 1000 characters.',
            'reference_id.uuid' => 'Reference ID must be a valid UUID.',
        ];
    }
}