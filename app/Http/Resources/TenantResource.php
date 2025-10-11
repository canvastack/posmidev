<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TenantResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'address' => $this->address,
            'phone' => $this->phone,
            'logo' => $this->logo,
            
            // Image fields
            'logo_url' => $this->logo_url,
            'logo_thumb_url' => $this->logo_thumb_url,
            'has_logo' => $this->has_logo,
            
            // Location fields
            'latitude' => $this->latitude ? (float) $this->latitude : null,
            'longitude' => $this->longitude ? (float) $this->longitude : null,
            'location_address' => $this->location_address,
            'has_location' => $this->has_location,
            'location_coordinates' => $this->location_coordinates,
            
            'status' => $this->status ?? 'pending',
            'can_auto_activate_users' => (bool)($this->can_auto_activate_users ?? false),
            'auto_activate_request_pending' => (bool)($this->auto_activate_request_pending ?? false),
            'auto_activate_requested_at' => optional($this->auto_activate_requested_at)->format('Y-m-d H:i:s'),
            'customers_count' => $this->when(isset($this->customers_count), (int) $this->customers_count),
            'created_at' => optional($this->created_at)->format('Y-m-d H:i:s'),
            'updated_at' => optional($this->updated_at)->format('Y-m-d H:i:s'),
        ];
    }
}