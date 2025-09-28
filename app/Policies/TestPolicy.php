<?php

namespace App\Policies;

use Src\Pms\Infrastructure\Models\User;

class TestPolicy
{
    /**
     * Authorize access based on 'testing.access' permission in the current team (tenant) context.
     */
    public function access(User $user, string $tenantId): bool
    {
        // Ensure the call is tenant-scoped and permission is evaluated within Spatie Teams context
        return (string) $user->tenant_id === (string) $tenantId && $user->can('testing.access');
    }
}