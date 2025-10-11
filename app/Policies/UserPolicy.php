<?php

namespace App\Policies;

use Src\Pms\Infrastructure\Models\User;

class UserPolicy
{
    public function viewAny(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('users.view');
    }

    public function view(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('users.view');
    }

    public function update(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('users.update');
    }

    /**
     * Determine if user can update a specific target user (for photo upload, profile update, etc.)
     * - Users can always update their own profile (self-update)
     * - OR must have users.update permission AND belong to same tenant
     * - HQ Super Admin can update any user (handled by Gate::before)
     */
    public function updateUser(User $authenticatedUser, User $targetUser): bool
    {
        // Allow self-update (user can always update their own profile/photo)
        if ((string) $authenticatedUser->id === (string) $targetUser->id) {
            return true;
        }

        // For updating other users: must have permission AND same tenant
        return ((string) $authenticatedUser->tenant_id === (string) $targetUser->tenant_id)
               && $authenticatedUser->can('users.update');
    }

    public function delete(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('users.delete');
    }
}