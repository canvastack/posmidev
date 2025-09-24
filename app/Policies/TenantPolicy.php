<?php

namespace App\Policies;

use Src\Pms\Infrastructure\Models\User;

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
}