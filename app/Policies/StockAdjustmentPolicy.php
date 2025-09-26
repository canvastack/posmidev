<?php

namespace App\Policies;

use Src\Pms\Infrastructure\Models\User;

class StockAdjustmentPolicy
{
    public function create(User $user, string $tenantId): bool
    {
        // inventory.adjust is the canonical permission for manual stock changes
        return $user->tenant_id === $tenantId && $user->can('inventory.adjust');
    }
}