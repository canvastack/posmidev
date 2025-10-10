<?php

namespace App\Http\Requests\BOM;

use Illuminate\Foundation\Http\FormRequest;

class MaterialExportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('materials.export');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'format' => 'nullable|in:csv,xlsx',
            'category' => 'nullable|string|max:255',
            'low_stock' => 'nullable|boolean',
            'search' => 'nullable|string|max:255',
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
            'format.in' => 'Export format must be either csv or xlsx.',
        ];
    }
}