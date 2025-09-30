<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->getId(),
            'name' => (string) $this->getName(),
            'email' => $this->getEmail(),
            'phone' => $this->getPhone(),
            'address' => $this->getAddress(),
            'tags' => $this->getTags(),
            'created_at' => optional($this->getCreatedAt())?->format('c'),
            'updated_at' => optional($this->getUpdatedAt())?->format('c'),
        ];
    }
}