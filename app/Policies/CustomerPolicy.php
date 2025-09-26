<?php

namespace App\Policies;

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
}