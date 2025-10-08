<?php

namespace App\Policies;

use Src\Pms\Infrastructure\Models\User;

class ProductPolicy
{
    public function viewAny(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('products.view');
    }

    public function view(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('products.view');
    }

    public function create(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('products.create');
    }

    public function update(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('products.update');
    }

    public function delete(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('products.delete');
    }

    /**
     * Phase 11: Archive & Soft Delete
     * Determine if the user can restore archived products
     */
    public function restore(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('products.restore');
    }

    /**
     * Phase 11: Archive & Soft Delete
     * Determine if the user can permanently delete products
     */
    public function forceDelete(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('products.delete.permanent');
    }
}