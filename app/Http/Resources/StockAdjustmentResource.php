<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Stock Adjustment API Resource
 * 
 * 🔒 IMMUTABLE RULE: tenant_id MUST be returned in all responses
 * This ensures frontend can verify data ownership and tenant context
 */
class StockAdjustmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->getId(),
            'tenant_id' => $this->getTenantId(), // ✅ IMMUTABLE RULE: tenant_id in response
            'product_id' => $this->getProductId(),
            'quantity' => $this->getQuantity(),
            'reason' => $this->getReason(),
            'notes' => $this->getNotes(),
            'user_id' => $this->getUserId(),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}