<?php

namespace App\Policies;

use App\Models\User;
use Src\Pms\Infrastructure\Models\Supplier;

class SupplierPolicy
{
    /**
     * Determine if the user can view any suppliers
     */
    public function viewAny(User $user, string $tenantId): bool
    {
        // Users can view suppliers if they have products.view permission
        return $user->can('products.view');
    }

    /**
     * Determine if the user can view the supplier
     */
    public function view(User $user, Supplier $supplier, string $tenantId): bool
    {
        // Ensure supplier belongs to the tenant
        if ($supplier->tenant_id !== $tenantId) {
            return false;
        }

        return $user->can('products.view');
    }

    /**
     * Determine if the user can create suppliers
     */
    public function create(User $user, string $tenantId): bool
    {
        // Users can create suppliers if they can update products
        return $user->can('products.update');
    }

    /**
     * Determine if the user can update the supplier
     */
    public function update(User $user, Supplier $supplier, string $tenantId): bool
    {
        // Ensure supplier belongs to the tenant
        if ($supplier->tenant_id !== $tenantId) {
            return false;
        }

        return $user->can('products.update');
    }

    /**
     * Determine if the user can delete the supplier
     */
    public function delete(User $user, Supplier $supplier, string $tenantId): bool
    {
        // Ensure supplier belongs to the tenant
        if ($supplier->tenant_id !== $tenantId) {
            return false;
        }

        return $user->can('products.delete');
    }
}