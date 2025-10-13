<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'name',
        'address',
        'phone',
        'logo',
        'logo_url',
        'logo_thumb_url',
        'latitude',
        'longitude',
        'location_address',
        'status',
        'settings',
        'can_auto_activate_users',
        'auto_activate_request_pending',
        'auto_activate_requested_at',
    ];

    protected $casts = [
        'id' => 'string',
        'settings' => 'array',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'can_auto_activate_users' => 'boolean',
        'auto_activate_request_pending' => 'boolean',
        'auto_activate_requested_at' => 'datetime',
    ];

    protected $appends = [
        'has_logo',
        'has_location',
        'location_coordinates',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    /**
     * BOM Engine relationships (Phase 1)
     */
    public function materials(): HasMany
    {
        return $this->hasMany(Material::class);
    }

    public function recipes(): HasMany
    {
        return $this->hasMany(Recipe::class);
    }

    public function inventoryTransactions(): HasMany
    {
        return $this->hasMany(InventoryTransaction::class);
    }

    /**
     * Phase 5: Backend Analytics relationships
     */
    public function analyticsAnomalies(): HasMany
    {
        return $this->hasMany(AnalyticsAnomaly::class);
    }

    public function analyticsForecasts(): HasMany
    {
        return $this->hasMany(AnalyticsForecast::class);
    }

    public function analyticsPreferences(): HasMany
    {
        return $this->hasMany(AnalyticsUserPreference::class);
    }

    /**
     * Check if tenant has logo
     */
    public function getHasLogoAttribute(): bool
    {
        return !is_null($this->logo_url);
    }

    /**
     * Check if tenant has location data
     */
    public function getHasLocationAttribute(): bool
    {
        return !is_null($this->latitude) && !is_null($this->longitude);
    }

    /**
     * Get location coordinates as array for map integration
     */
    public function getLocationCoordinatesAttribute(): ?array
    {
        if (!$this->has_location) {
            return null;
        }

        return [
            'lat' => (float) $this->latitude,
            'lng' => (float) $this->longitude,
        ];
    }
}