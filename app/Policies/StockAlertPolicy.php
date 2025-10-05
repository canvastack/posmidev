<?php

namespace App\Policies;

use Src\Pms\Infrastructure\Models\User;

/**
 * StockAlertPolicy
 * 
 * 🔒 CORE IMMUTABLE RULES ENFORCED:
 * ✅ guard_name: 'api' - All permissions checked with API guard
 * ✅ Tenant-scoped: All methods verify user tenant_id matches resource tenantId
 * ✅ Strictly tenant-scoped permissions - No global roles
 */
class StockAlertPolicy
{
    /**
     * Determine if user can view any stock alerts
     * 
     * Permission: products.view (view alerts associated with products)
     */
    public function viewAny(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('products.view');
    }

    /**
     * Determine if user can view a specific stock alert
     * 
     * Permission: products.view
     */
    public function view(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('products.view');
    }

    /**
     * Determine if user can acknowledge stock alerts
     * 
     * Permission: products.view (acknowledgment is a read-only action)
     */
    public function acknowledge(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('products.view');
    }

    /**
     * Determine if user can resolve stock alerts
     * 
     * Permission: inventory.adjust (resolving implies taking action on stock)
     */
    public function resolve(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('inventory.adjust');
    }

    /**
     * Determine if user can dismiss stock alerts
     * 
     * Permission: products.view (dismiss is marking as not actionable)
     */
    public function dismiss(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('products.view');
    }
}