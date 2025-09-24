<?php

namespace Src\Pms\Core\Domain\Traits;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Minimal tenant binding trait. Keep it lightweight to avoid boot-time crashes.
 */
trait BelongsToTenant
{
    /**
     * Define tenant relationship using tenant_id.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(\Src\Pms\Infrastructure\Models\Tenant::class, 'tenant_id');
    }
}