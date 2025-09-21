<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->getId(),
            'invoice_number' => $this->getInvoiceNumber(),
            'total_amount' => $this->getTotalAmount(),
            'payment_method' => $this->getPaymentMethod(),
            'amount_paid' => $this->getAmountPaid(),
            'change_amount' => $this->getChange(),
            'items' => OrderItemResource::collection($this->getItems()),
            'created_at' => $this->getCreatedAt()?->format('Y-m-d H:i:s'),
        ];
    }
}