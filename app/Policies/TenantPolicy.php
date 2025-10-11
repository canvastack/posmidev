<?php

namespace App\Policies;

use Src\Pms\Infrastructure\Models\User;
use Src\Pms\Infrastructure\Models\Tenant;

class TenantPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tenants.view');
    }

    public function view(User $user): bool
    {
        return $user->can('tenants.view');
    }

    public function create(User $user): bool
    {
        return $user->can('tenants.create');
    }

    public function update(User $user): bool
    {
        return $user->can('tenants.update');
    }

    /**
     * Determine if user can update a specific tenant (for logo upload, location update, etc.)
     * Tenant admin can update their own tenant, or HQ admin can update any tenant
     */
    public function updateTenant(User $user, Tenant $tenant): bool
    {
        // User must have tenants.update permission AND belong to the same tenant
        // OR HQ Super Admin (handled by Gate::before in AuthServiceProvider)
        return ((string) $user->tenant_id === (string) $tenant->id) && $user->can('tenants.update');
    }

    public function delete(User $user): bool
    {
        return $user->can('tenants.delete');
    }

    public function setStatus(User $user): bool
    {
        return $user->can('tenants.set-status');
    }

    public function manageAutoActivation(User $user): bool
    {
        return $user->can('tenants.manage-auto-activation');
    }

    // Settings-specific abilities (tenant-scoped)
    public function viewSettings(User $user, string $tenantId): bool
    {
        return ((string) $user->tenant_id === (string) $tenantId) && $user->can('settings.view');
    }

    public function updateSettings(User $user, string $tenantId): bool
    {
        return ((string) $user->tenant_id === (string) $tenantId) && $user->can('settings.update');
    }
}