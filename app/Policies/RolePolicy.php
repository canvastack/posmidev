<?php

namespace App\Policies;

use Src\Pms\Infrastructure\Models\User;

class RolePolicy
{
    public function viewAny(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('roles.view');
    }

    public function view(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('roles.view');
    }

    public function create(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('roles.create');
    }

    public function update(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('roles.update');
    }

    public function delete(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('roles.delete');
    }
}