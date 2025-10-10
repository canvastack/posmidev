<?php

namespace App\Http\Requests\BOM;

use Illuminate\Foundation\Http\FormRequest;

class MaterialImportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('materials.import');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'file' => 'required|file|mimes:csv,xlsx,xls|max:10240', // Max 10MB
            'update_existing' => 'nullable|boolean',
            'skip_errors' => 'nullable|boolean',
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
            'file.required' => 'Import file is required.',
            'file.file' => 'The uploaded file is invalid.',
            'file.mimes' => 'Import file must be CSV or Excel format (csv, xlsx, xls).',
            'file.max' => 'Import file size cannot exceed 10MB.',
        ];
    }
}