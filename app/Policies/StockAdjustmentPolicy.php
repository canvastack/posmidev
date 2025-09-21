<?php

namespace App\Policies;

use Src\Pms\Infrastructure\Models\User;

class StockAdjustmentPolicy
{
    public function create(User $user, string $tenantId): bool
    {
        return $user->tenant_id === $tenantId && $user->can('products.update');
    }
}