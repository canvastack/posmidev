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
            'photo_url' => $this->getPhotoUrl(),
            'photo_thumb_url' => $this->getPhotoThumbUrl(),
            'has_photo' => $this->hasPhoto(),
            'delivery_latitude' => $this->getDeliveryLatitude(),
            'delivery_longitude' => $this->getDeliveryLongitude(),
            'delivery_address' => $this->getDeliveryAddress(),
            'has_delivery_location' => $this->hasDeliveryLocation(),
            'delivery_location_coordinates' => $this->getDeliveryLocationCoordinates(),
            'created_at' => optional($this->getCreatedAt())?->format('c'),
            'updated_at' => optional($this->getUpdatedAt())?->format('c'),
        ];
    }
}