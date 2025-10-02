<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContentPage extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'tenant_id',
        'slug',
        'title',
        'content',
        'status',
        'published_at',
    ];

    protected $casts = [
        'content' => 'array',
        'published_at' => 'datetime',
    ];

    /**
     * Relationship: ContentPage belongs to Tenant
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Scope: Published pages only
     */
    public function scopePublished($query)
    {
        return $query->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }
}