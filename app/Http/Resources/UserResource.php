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

        // Derive thumbnail URL from photo if present: append -thumb.webp or -thumb.png before extension
        $photoThumb = null;
        if (!empty($this->photo)) {
            try {
                $parts = pathinfo($this->photo);
                // Only if path contains a dot
                if (!empty($parts['filename']) && !empty($parts['dirname'])) {
                    $candidateWebp = $parts['dirname'] . '/' . $parts['filename'] . '-thumb.webp';
                    $candidatePng = $parts['dirname'] . '/' . $parts['filename'] . '-thumb.png';
                    // No filesystem check here; frontend will fallback to original via onError
                    $photoThumb = $candidateWebp;
                }
            } catch (\Throwable $e) {}
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
            'photo_thumb' => $photoThumb,
            'phone_number' => $this->phone_number,
            'created_at' => optional($this->created_at)->format('Y-m-d H:i:s'),
        ];
    }
}