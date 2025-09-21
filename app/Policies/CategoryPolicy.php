<?php

namespace App\Policies;

use Src\Pms\Infrastructure\Models\User;

class CategoryPolicy
{
    public function viewAny(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('categories.view');
    }

    public function view(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('categories.view');
    }

    public function create(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('categories.create');
    }

    public function update(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('categories.update');
    }

    public function delete(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('categories.delete');
    }
}