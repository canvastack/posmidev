<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Default to empty roles if Spatie HasRoles trait is not present during minimal model testing
        $roles = [];
        if (is_object($this->resource) && method_exists($this->resource, 'getRoleNames')) {
            try {
                $roles = $this->resource->getRoleNames();
            } catch (\Throwable $e) {
                $roles = [];
            }
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'tenant_id' => $this->tenant_id,
            'status' => $this->status ?? 'pending',
            'roles' => $roles,
            'display_name' => $this->display_name,
            'photo' => $this->photo,
            'phone_number' => $this->phone_number,
            'created_at' => optional($this->created_at)->format('Y-m-d H:i:s'),
        ];
    }
}