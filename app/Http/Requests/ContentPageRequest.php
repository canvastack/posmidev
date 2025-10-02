<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ContentPageRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by Policy
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        $tenantId = $this->route('tenantId');
        $contentPageId = $this->route('contentPage');

        return [
            'slug' => [
                'required',
                'string',
                'max:255',
                'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', // kebab-case only
                Rule::unique('content_pages', 'slug')
                    ->where('tenant_id', $tenantId)
                    ->ignore($contentPageId),
            ],
            'title' => 'required|string|max:255',
            'content' => 'required|array',
            'status' => 'required|string|in:draft,published',
            'published_at' => 'nullable|date',
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
            'slug.required' => 'The slug field is required.',
            'slug.regex' => 'The slug must be in kebab-case format (e.g., about-us, contact-page).',
            'slug.unique' => 'A page with this slug already exists for this tenant.',
            'title.required' => 'The title field is required.',
            'content.required' => 'The content field is required.',
            'content.array' => 'The content must be a valid JSON object.',
            'status.in' => 'The status must be either draft or published.',
        ];
    }
}