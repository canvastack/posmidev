<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = $this->route('tenantId');
        
        return [
            'items' => 'required|array|min:1',
            'items.*.product_id' => [
                'required',
                'uuid',
                // Ensure product exists AND belongs to this tenant
                "exists:products,id,tenant_id,{$tenantId}",
            ],
            'items.*.quantity' => 'required|integer|min:1',
            // Accept lowercase variants to align with seeders/tests
            'payment_method' => 'required|string|in:cash,card,qris',
            'amount_paid' => 'required|numeric|min:0',
            'customer_id' => [
                'nullable',
                'uuid',
                // Also scope customer to tenant
                "exists:customers,id,tenant_id,{$tenantId}",
            ],
        ];
    }
    
    public function messages(): array
    {
        return [
            'items.*.product_id.exists' => 'The selected product does not exist or does not belong to your organization.',
            'customer_id.exists' => 'The selected customer does not exist or does not belong to your organization.',
        ];
    }
}