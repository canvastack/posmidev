<?php

namespace App\Policies;

use Src\Pms\Infrastructure\Models\Customer;
use Src\Pms\Infrastructure\Models\User;

class CustomerPolicy
{
    public function viewAny(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('customers.view');
    }

    public function view(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('customers.view');
    }

    public function create(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('customers.create');
    }

    public function update(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('customers.update');
    }

    public function delete(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('customers.delete');
    }

    /**
     * Determine if the authenticated user can update the given customer.
     * 
     * This policy checks:
     * 1. User must belong to the same tenant as the customer
     * 2. User must have 'customers.update' permission
     * 
     * Note: Unlike User entities, Customers don't have a "self-update" pattern
     * because customers are business entities managed by tenant users, not 
     * authenticated users themselves.
     * 
     * HQ Super Admin bypass is handled by Gate::before in AuthServiceProvider.
     */
    public function updateCustomer(User $authenticatedUser, Customer $customer): bool
    {
        // Must be same tenant AND have permission
        return $authenticatedUser->tenant_id === $customer->tenant_id
            && $authenticatedUser->can('customers.update');
    }
}