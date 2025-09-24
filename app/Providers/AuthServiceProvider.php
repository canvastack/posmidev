<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Src\Pms\Infrastructure\Models\{Product, Order, Category, StockAdjustment, User, Tenant};
use App\Policies\{ProductPolicy, OrderPolicy, CategoryPolicy, StockAdjustmentPolicy, UserPolicy, TenantPolicy};

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Product::class => ProductPolicy::class,
        Order::class => OrderPolicy::class,
        Category::class => CategoryPolicy::class,
        StockAdjustment::class => StockAdjustmentPolicy::class,
        User::class => UserPolicy::class,
        Tenant::class => TenantPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // Allow admin-level roles to bypass all policy checks
        Gate::before(function ($user, string $ability) {
            if (method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['Super Admin', 'admin'])) {
                return true;
            }
            return null;
        });
    }
}