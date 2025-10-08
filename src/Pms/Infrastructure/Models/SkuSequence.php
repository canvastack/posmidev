<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SkuSequence extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'sku_sequences';

    protected $fillable = [
        'tenant_id',
        'pattern',
        'last_sequence',
    ];

    protected $casts = [
        'tenant_id' => 'string',
        'last_sequence' => 'integer',
    ];

    /**
     * Get the tenant that owns the SKU sequence
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Scope a query to only include sequences for a specific tenant
     */
    public function scopeForTenant($query, string $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Get the next sequence number
     */
    public function getNextSequence(): int
    {
        $this->increment('last_sequence');
        return $this->last_sequence;
    }

    /**
     * Reset the sequence
     */
    public function resetSequence(): void
    {
        $this->update(['last_sequence' => 0]);
    }
}