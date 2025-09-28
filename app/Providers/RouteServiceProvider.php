<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to your application's "home" route.
     *
     * Typically, users are redirected here after authentication.
     *
     * @var string
     */
    public const HOME = '/home';

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            // Avoid touching authentication here to prevent triggering guard/user resolution
            return Limit::perMinute(60)->by($request->ip());
        });

        // Explicit scoped route model bindings for tenant isolation
        Route::bind('category', function (string $value, \Illuminate\Routing\Route $route) {
            \Illuminate\Support\Facades\Log::info('=== CATEGORY BINDING START ===');

            $tenantId = $route->parameter('tenantId');
            $categoryId = $value;

            \Illuminate\Support\Facades\Log::info('=== CATEGORY BINDING PARAMS ===', [
                'tenantId' => $tenantId,
                'categoryId' => $categoryId,
            ]);

            // Check if category exists for this tenant
            $category = \Src\Pms\Infrastructure\Models\Category::where('id', $categoryId)
                ->where('tenant_id', $tenantId)
                ->first();

            if (!$category) {
                \Illuminate\Support\Facades\Log::info('=== CATEGORY NOT FOUND - THROWING 404 ===');
                throw new \Illuminate\Database\Eloquent\ModelNotFoundException("Category not found");
            }

            \Illuminate\Support\Facades\Log::info('=== CATEGORY FOUND ===');

            return $category;
        });

        $this->routes(function () {
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }
}