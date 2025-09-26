<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tenant_name' => 'required|string|max:255',
            'user_name' => 'required|string|max:255',
            // Enforce global email uniqueness across all tenants
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
        ];
    }
}