<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;

class ProductPriceHistory extends Model
{
    use HasFactory;

    protected $table = 'product_price_history';

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'product_id',
        'old_price',
        'new_price',
        'old_cost_price',
        'new_cost_price',
        'changed_by',
        'changed_at',
    ];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'product_id' => 'string',
        'old_price' => 'decimal:2',
        'new_price' => 'decimal:2',
        'old_cost_price' => 'decimal:2',
        'new_cost_price' => 'decimal:2',
        'changed_by' => 'string',
        'changed_at' => 'datetime',
    ];

    /**
     * Get the tenant that owns the price history.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the product that owns the price history.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the user who changed the price.
     */
    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    /**
     * Calculate price change amount.
     */
    public function getPriceChangeAttribute(): float
    {
        return $this->new_price - $this->old_price;
    }

    /**
     * Calculate price change percentage.
     */
    public function getPriceChangePercentageAttribute(): float
    {
        if ($this->old_price == 0) {
            return 0;
        }

        return (($this->new_price - $this->old_price) / $this->old_price) * 100;
    }
}