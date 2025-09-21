<?php

namespace App\Policies;

use Src\Pms\Infrastructure\Models\User;

class PermissionPolicy
{
    public function viewAny(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('roles.view');
    }
}