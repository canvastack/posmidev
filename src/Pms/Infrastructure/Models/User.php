<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Concerns\HasUuids; // re-enabled for UUID support
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Src\Pms\Core\Domain\Traits\BelongsToTenant;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    // Keep Laravel + Sanctum essentials only to isolate crashes in auth middleware
    use Notifiable, HasApiTokens, HasFactory;
    use HasUuids, BelongsToTenant;
    use HasRoles;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'name',
        'email',
        'username',
        'display_name',
        'password',
        'status',
        'photo',
        'phone_number',
        'profile_photo_url',
        'profile_photo_thumb_url',
        'home_latitude',
        'home_longitude',
        'home_address',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'home_latitude' => 'decimal:8',
        'home_longitude' => 'decimal:8',
    ];

    protected $appends = [
        'has_profile_photo',
        'has_home_location',
        'home_location_coordinates',
    ];

    // Ensure Spatie permissions guard aligns with API usage
    public function getDefaultGuardName(): string
    {
        return 'api';
    }

    /**
     * Accessor: Check if user has profile photo
     */
    public function getHasProfilePhotoAttribute(): bool
    {
        return !empty($this->profile_photo_url);
    }

    /**
     * Accessor: Check if user has home location
     */
    public function getHasHomeLocationAttribute(): bool
    {
        return !empty($this->home_latitude) && !empty($this->home_longitude);
    }

    /**
     * Accessor: Get home location coordinates as array
     */
    public function getHomeLocationCoordinatesAttribute(): ?array
    {
        if ($this->has_home_location) {
            return [
                'lat' => (float) $this->home_latitude,
                'lng' => (float) $this->home_longitude,
            ];
        }
        return null;
    }

    /*
    // Temporarily disabled to fully isolate model boot issues under auth middleware
    public function tenant(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
    */
}