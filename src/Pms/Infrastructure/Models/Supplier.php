<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'suppliers';

    protected $fillable = [
        'tenant_id',
        'name',
        'contact_person',
        'email',
        'phone',
        'address',
        'status',
        'notes',
    ];

    protected $casts = [
        'tenant_id' => 'string',
    ];

    /**
     * Get the tenant that owns the supplier
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Get all products for this supplier
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'supplier_id', 'id')
            ->where('products.tenant_id', $this->tenant_id);
    }

    /**
     * Scope a query to only include suppliers for a specific tenant
     */
    public function scopeForTenant($query, string $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope a query to only include active suppliers
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Get the products count for this supplier
     */
    public function getProductsCountAttribute(): int
    {
        return $this->products()->count();
    }
}