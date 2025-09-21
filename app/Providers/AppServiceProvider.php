<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Src\Pms\Core\Domain\Repositories\ProductRepositoryInterface;
use Src\Pms\Core\Domain\Repositories\OrderRepositoryInterface;
use Src\Pms\Core\Domain\Repositories\TenantRepositoryInterface;
use Src\Pms\Core\Domain\Repositories\CategoryRepositoryInterface;
use Src\Pms\Core\Domain\Repositories\StockAdjustmentRepositoryInterface;
use Src\Pms\Infrastructure\Repositories\EloquentProductRepository;
use Src\Pms\Infrastructure\Repositories\EloquentOrderRepository;
use Src\Pms\Infrastructure\Repositories\EloquentTenantRepository;
use Src\Pms\Infrastructure\Repositories\EloquentCategoryRepository;
use Src\Pms\Infrastructure\Repositories\EloquentStockAdjustmentRepository;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind Repository Interfaces to Implementations
        $this->app->bind(ProductRepositoryInterface::class, EloquentProductRepository::class);
        $this->app->bind(OrderRepositoryInterface::class, EloquentOrderRepository::class);
        $this->app->bind(TenantRepositoryInterface::class, EloquentTenantRepository::class);
        $this->app->bind(CategoryRepositoryInterface::class, EloquentCategoryRepository::class);
        $this->app->bind(StockAdjustmentRepositoryInterface::class, EloquentStockAdjustmentRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register Policies
        \Illuminate\Support\Facades\Gate::policy(\Src\Pms\Infrastructure\Models\Product::class, \App\Policies\ProductPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\Src\Pms\Infrastructure\Models\Order::class, \App\Policies\OrderPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\Spatie\Permission\Models\Role::class, \App\Policies\RolePolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\Spatie\Permission\Models\Permission::class, \App\Policies\PermissionPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\Src\Pms\Infrastructure\Models\Category::class, \App\Policies\CategoryPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\Src\Pms\Infrastructure\Models\StockAdjustment::class, \App\Policies\StockAdjustmentPolicy::class);
    }
}