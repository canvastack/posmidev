<?php

namespace App\Http\Requests\BOM;

use Illuminate\Foundation\Http\FormRequest;

class BulkAvailabilityRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('bom.calculate');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'product_ids' => 'required|array|min:1|max:50',
            'product_ids.*' => 'required|uuid|distinct',
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
            'product_ids.required' => 'Product IDs are required.',
            'product_ids.array' => 'Product IDs must be an array.',
            'product_ids.min' => 'At least one product ID is required.',
            'product_ids.max' => 'Maximum 50 products can be checked at once.',
            'product_ids.*.required' => 'Each product ID is required.',
            'product_ids.*.uuid' => 'Each product ID must be a valid UUID.',
            'product_ids.*.distinct' => 'Duplicate product IDs are not allowed.',
        ];
    }
}