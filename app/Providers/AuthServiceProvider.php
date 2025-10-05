<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Src\Pms\Infrastructure\Models\{Product, Order, Category, StockAdjustment, StockAlert, User, Tenant, Customer, ContentPage};
use App\Policies\{ProductPolicy, OrderPolicy, CategoryPolicy, StockAdjustmentPolicy, StockAlertPolicy, UserPolicy, TenantPolicy, CustomerPolicy, ContentPagePolicy};

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
        StockAlert::class => StockAlertPolicy::class,
        User::class => UserPolicy::class,
        Tenant::class => TenantPolicy::class,
        Customer::class => CustomerPolicy::class,
        ContentPage::class => ContentPagePolicy::class,
        \App\Models\TestSubject::class => \App\Policies\TestPolicy::class,
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

            /// Explicit role check to avoid ambiguous columns and team-context interference
            $isHqSuperAdmin = \Spatie\Permission\Models\Role::query()
                ->join('model_has_roles as mhr', 'roles.id', '=', 'mhr.role_id')
                ->where('mhr.model_uuid', $user->getKey())               // UUID PK
                ->where('mhr.model_type', $user->getMorphClass())        // Polymorphic type
                ->where('mhr.tenant_id', $hqTenantId)                    // Pivot team = HQ
                ->where('roles.tenant_id', $hqTenantId)                  // Role scoped to HQ
                ->where('roles.guard_name', 'api')
                ->where('roles.name', 'Super Admin')
                ->exists();

            return $isHqSuperAdmin ? true : null;
        });
    }
}