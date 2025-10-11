<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'name',
        'email',
        'phone',
        'address',
        'tags',
        'photo_url',
        'photo_thumb_url',
        'delivery_latitude',
        'delivery_longitude',
        'delivery_address',
    ];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'tags' => 'array',
        'delivery_latitude' => 'decimal:8',
        'delivery_longitude' => 'decimal:8',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Computed accessor: Check if customer has a photo
     */
    public function getHasPhotoAttribute(): bool
    {
        return !empty($this->photo_url);
    }

    /**
     * Computed accessor: Check if customer has delivery location
     */
    public function getHasDeliveryLocationAttribute(): bool
    {
        return !is_null($this->delivery_latitude) && !is_null($this->delivery_longitude);
    }

    /**
     * Computed accessor: Get delivery location coordinates as array
     */
    public function getDeliveryLocationCoordinatesAttribute(): ?array
    {
        if (!$this->has_delivery_location) {
            return null;
        }

        return [
            'lat' => (float) $this->delivery_latitude,
            'lng' => (float) $this->delivery_longitude,
        ];
    }
}