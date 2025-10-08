<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ProductView Model
 * 
 * Tracks product detail page views for analytics purposes.
 * Supports both authenticated and anonymous user tracking.
 * 
 * @property string $id
 * @property string $tenant_id
 * @property string $product_id
 * @property string|null $user_id
 * @property string|null $ip_address
 * @property string|null $user_agent
 * @property \Carbon\Carbon $viewed_at
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * 
 * @property-read Tenant $tenant
 * @property-read Product $product
 * @property-read \App\Models\User|null $user
 */
class ProductView extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'product_views';

    protected $fillable = [
        'tenant_id',
        'product_id',
        'user_id',
        'ip_address',
        'user_agent',
        'viewed_at',
    ];

    protected $casts = [
        'viewed_at' => 'datetime',
    ];

    /**
     * Get the tenant that owns this view record
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Get the product that was viewed
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * Get the user who viewed the product (if authenticated)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id');
    }

    /**
     * Scope: Filter by tenant
     */
    public function scopeTenantScoped($query, string $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope: Filter by date range
     */
    public function scopeDateRange($query, ?string $startDate = null, ?string $endDate = null)
    {
        if ($startDate) {
            $query->where('viewed_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('viewed_at', '<=', $endDate);
        }
        return $query;
    }

    /**
     * Scope: Filter by product
     */
    public function scopeForProduct($query, string $productId)
    {
        return $query->where('product_id', $productId);
    }

    /**
     * Scope: Only authenticated user views
     */
    public function scopeAuthenticated($query)
    {
        return $query->whereNotNull('user_id');
    }

    /**
     * Scope: Only anonymous views
     */
    public function scopeAnonymous($query)
    {
        return $query->whereNull('user_id');
    }
}