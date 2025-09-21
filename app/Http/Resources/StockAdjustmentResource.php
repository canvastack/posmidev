<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockAdjustmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->getId(),
            'product_id' => $this->getProductId(),
            'quantity' => $this->getQuantity(),
            'reason' => $this->getReason(),
            'notes' => $this->getNotes(),
            'user_id' => $this->getUserId(),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}