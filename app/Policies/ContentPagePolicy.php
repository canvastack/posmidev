<?php

namespace App\Policies;

use Src\Pms\Infrastructure\Models\User;

class ContentPagePolicy
{
    public function viewAny(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('content.view');
    }

    public function view(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('content.view');
    }

    public function create(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('content.create');
    }

    public function update(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('content.update');
    }

    public function delete(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('content.delete');
    }
}