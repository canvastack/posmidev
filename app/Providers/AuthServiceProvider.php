<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Src\Pms\Infrastructure\Models\{Product, Order, Category, StockAdjustment, User, Tenant, Customer};
use App\Policies\{ProductPolicy, OrderPolicy, CategoryPolicy, StockAdjustmentPolicy, UserPolicy, TenantPolicy, CustomerPolicy};

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
        Customer::class => CustomerPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        $this->registerPolicies();

        // HQ Super Admin bypass: full access across tenants (ignore current team context)
        Gate::before(function ($user, string $ability) {
            $hqTenantId = (string) config('tenancy.hq_tenant_id');
            if ((string) $user->tenant_id !== $hqTenantId) {
                return null;
            }
            // Check SA role explicitly within HQ team to avoid team-context false negatives
            $isHqSuperAdmin = $user->roles()
                ->where('guard_name', 'api')
                ->where('name', 'Super Admin')
                ->where('tenant_id', $hqTenantId)
                ->exists();
            return $isHqSuperAdmin ? true : null;
        });
    }
}