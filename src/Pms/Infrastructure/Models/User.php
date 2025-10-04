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
    ];

    // Ensure Spatie permissions guard aligns with API usage
    public function getDefaultGuardName(): string
    {
        return 'api';
    }

    /*
    // Temporarily disabled to fully isolate model boot issues under auth middleware
    public function tenant(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
    */
}