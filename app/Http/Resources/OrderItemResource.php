<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'product_id' => $this->getProductId(),
            'product_name' => $this->getProductName(),
            'quantity' => $this->getQuantity(),
            'price' => $this->getPrice(),
            'subtotal' => $this->getSubtotal(),
        ];
    }
}