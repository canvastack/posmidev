@@ .. @@
 namespace App\Providers;

 use Illuminate\Support\ServiceProvider;
+use Src\Pms\Core\Domain\Repositories\ProductRepositoryInterface;
+use Src\Pms\Core\Domain\Repositories\OrderRepositoryInterface;
+use Src\Pms\Core\Domain\Repositories\TenantRepositoryInterface;
+use Src\Pms\Infrastructure\Repositories\EloquentProductRepository;
+use Src\Pms\Infrastructure\Repositories\EloquentOrderRepository;
+use Src\Pms\Infrastructure\Repositories\EloquentTenantRepository;

 class AppServiceProvider extends ServiceProvider
 {
@@ .. @@
     public function register(): void
     {
-        //
+        // Bind Repository Interfaces to Implementations
+        $this->app->bind(ProductRepositoryInterface::class, EloquentProductRepository::class);
+        $this->app->bind(OrderRepositoryInterface::class, EloquentOrderRepository::class);
+        $this->app->bind(TenantRepositoryInterface::class, EloquentTenantRepository::class);
     }

     /**
@@ .. @@
     public function boot(): void
     {
-        //
+        // Register Policies
+        \Illuminate\Support\Facades\Gate::policy(\Src\Pms\Infrastructure\Models\Product::class, \App\Policies\ProductPolicy::class);
+        \Illuminate\Support\Facades\Gate::policy(\Src\Pms\Infrastructure\Models\Order::class, \App\Policies\OrderPolicy::class);
     }
 }