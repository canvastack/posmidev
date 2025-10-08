<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * ProductSearchTerm Model
 * 
 * Tracks product search queries for analytics and trend analysis.
 * Captures search terms, result counts, and user information.
 * 
 * @property string $id
 * @property string $tenant_id
 * @property string $search_term
 * @property string|null $user_id
 * @property int $results_count
 * @property string|null $ip_address
 * @property \Carbon\Carbon $searched_at
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * 
 * @property-read Tenant $tenant
 * @property-read \App\Models\User|null $user
 */
class ProductSearchTerm extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'product_search_terms';

    protected $fillable = [
        'tenant_id',
        'search_term',
        'user_id',
        'results_count',
        'ip_address',
        'searched_at',
    ];

    protected $casts = [
        'results_count' => 'integer',
        'searched_at' => 'datetime',
    ];

    /**
     * Get the tenant that owns this search record
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Get the user who performed the search (if authenticated)
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
            $query->where('searched_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('searched_at', '<=', $endDate);
        }
        return $query;
    }

    /**
     * Scope: Get popular search terms
     * Groups by search term and returns count
     */
    public function scopePopularSearches($query, int $limit = 10)
    {
        return $query->selectRaw('search_term, COUNT(*) as search_count, MAX(searched_at) as last_searched')
            ->groupBy('search_term')
            ->orderByDesc('search_count')
            ->limit($limit);
    }

    /**
     * Scope: Searches with results
     */
    public function scopeWithResults($query)
    {
        return $query->where('results_count', '>', 0);
    }

    /**
     * Scope: Searches with no results (zero-result searches)
     */
    public function scopeWithoutResults($query)
    {
        return $query->where('results_count', 0);
    }
}