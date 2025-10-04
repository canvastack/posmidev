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

        // Get user permissions (all direct + role-based permissions)
        $permissions = [];
        if (is_object($this->resource) && method_exists($this->resource, 'getAllPermissions')) {
            try {
                $permissions = $this->resource->getAllPermissions()->pluck('name')->toArray();
            } catch (\Throwable $e) {
                $permissions = [];
            }
        }

        // Check if user is HQ Super Admin (same logic as Gate::before in AuthServiceProvider)
        $isHqSuperAdmin = false;
        if (is_object($this->resource) && !empty($this->tenant_id)) {
            $hqTenantId = (string) config('tenancy.hq_tenant_id');
            
            if ((string) $this->tenant_id === $hqTenantId) {
                try {
                    $isHqSuperAdmin = \Spatie\Permission\Models\Role::query()
                        ->join('model_has_roles as mhr', 'roles.id', '=', 'mhr.role_id')
                        ->where('mhr.model_uuid', $this->resource->getKey())
                        ->where('mhr.model_type', $this->resource->getMorphClass())
                        ->where('mhr.tenant_id', $hqTenantId)
                        ->where('roles.tenant_id', $hqTenantId)
                        ->where('roles.guard_name', 'api')
                        ->where('roles.name', 'Super Admin')
                        ->exists();
                } catch (\Throwable $e) {
                    $isHqSuperAdmin = false;
                }
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
            'permissions' => $permissions,
            'is_hq_super_admin' => $isHqSuperAdmin,
            'display_name' => $this->display_name,
            'photo' => $this->photo,
            'photo_thumb' => $photoThumb,
            'phone_number' => $this->phone_number,
            'created_at' => optional($this->created_at)->format('Y-m-d H:i:s'),
        ];
    }
}