<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;

class ProductStockHistory extends Model
{
    use HasFactory;

    protected $table = 'product_stock_history';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'product_id',
        'old_stock',
        'new_stock',
        'change_amount',
        'change_type',
        'reference_id',
        'reference_type',
        'notes',
        'changed_by',
        'changed_at',
    ];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'product_id' => 'string',
        'old_stock' => 'integer',
        'new_stock' => 'integer',
        'change_amount' => 'integer',
        'reference_id' => 'string',
        'changed_by' => 'string',
        'changed_at' => 'datetime',
    ];

    /**
     * Get the tenant that owns the stock history.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the product that owns the stock history.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the user who changed the stock.
     */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    /**
     * Get the change direction (increase/decrease).
     */
    public function getChangeDirectionAttribute(): string
    {
        return $this->change_amount > 0 ? 'increase' : ($this->change_amount < 0 ? 'decrease' : 'no-change');
    }

    /**
     * Get absolute change amount.
     */
    public function getAbsoluteChangeAttribute(): int
    {
        return abs($this->change_amount);
    }
}