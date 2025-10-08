<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ProductStatsController;
use App\Http\Controllers\Api\ProductHistoryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\OrderQueryController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\StockAdjustmentController;
use App\Http\Controllers\Api\StockAlertController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\ContentManagementController;
use App\Http\Controllers\Api\BarcodeController;
use App\Http\Controllers\Api\ProductVariantController;
use App\Http\Controllers\Api\VariantAttributeController;
use App\Http\Controllers\Api\VariantTemplateController;
use App\Http\Controllers\Api\VariantAnalyticsController;
use App\Http\Controllers\Api\ProductAnalyticsController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\ProductTagController;
use App\Http\Controllers\Api\SkuGenerationController;
use App\Http\Controllers\Api\TenantAnalyticsController;
use App\Http\Controllers\Api\ProductViewTrackingController;
use App\Http\Controllers\Api\SearchAnalyticsController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes
Route::prefix('v1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    // Public content (no auth): tenant public settings, products, and pages
    Route::prefix('tenants/{tenant}')->group(function () {
        Route::get('/public/settings', [\App\Http\Controllers\Api\PublicContentController::class, 'settings']);
        Route::get('/public/products', [\App\Http\Controllers\Api\PublicContentController::class, 'products']);
        Route::get('/public/products/{productId}', [\App\Http\Controllers\Api\PublicContentController::class, 'showProduct']);
        Route::get('/public/footer', [\App\Http\Controllers\Api\PublicContentController::class, 'footer']);
        Route::get('/public/pages', [\App\Http\Controllers\Api\PublicContentController::class, 'pages']);
        Route::get('/public/pages/{slug}', [\App\Http\Controllers\Api\PublicContentController::class, 'showPage']);
    });

    // Diagnostics (temporary): should always return 200 JSON
    Route::get('/ping', function () {
        return response()->json(['ok' => true]);
    });

    // Diagnostics (temporary): Basic auth middleware test (should 401, not crash)
    Route::middleware('auth.basic')->get('/ping-basic', function () {
        return response()->json(['ok' => true]);
    });

    // Diagnostics (temporary): directly invoke Sanctum guard with try/catch
    Route::get('/guard-check', function () {
        try {
            $user = \Illuminate\Support\Facades\Auth::guard('api')->user();
            return response()->json([
                'ok' => true,
                'userId' => optional($user)->id,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('guard-check error', [
                'error' => $e->getMessage(),
            ]);
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 200);
        }
    });

    // Protected routes
    Route::middleware('auth:api')->group(function () {
        // Diagnostics (temporary): tests Sanctum-only guard
        Route::get('/ping-auth', function (\Illuminate\Http\Request $request) {
            return response()->json([
                'ok' => true,
                'userId' => optional($request->user())->id,
            ]);
        });

        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'user']);

        // Pillar 1: Authentication test (Sanctum)
        Route::get('/test/auth', function (\Illuminate\Http\Request $request) {
            return response()->json(['userId' => $request->user()->id]);
        });

        // Pillar 2: Tenant Context via route-model-binding
        Route::middleware('team.tenant')->get('/tenants/{tenant}/test/context', function (\Src\Pms\Infrastructure\Models\Tenant $tenant) {
            return response()->json(['tenantName' => $tenant->name]);
        });

        // Pillar 3: Authorization via TestPolicy
        Route::middleware('team.tenant')->get('/tenants/{tenant}/test/policy', function (\Illuminate\Http\Request $request, \Src\Pms\Infrastructure\Models\Tenant $tenant) {
            \Illuminate\Support\Facades\Gate::authorize('access', [\App\Models\TestSubject::class, (string) $tenant->id]);
            return response()->json(['ok' => true]);
        });

        // Management for tenants (Super Admin/Admin + policy controlled)
        Route::apiResource('tenants', TenantController::class);
        Route::post('tenants/{tenantId}/status', [TenantController::class, 'setStatus']);
        Route::post('tenants/{tenantId}/auto-activation/request', [TenantController::class, 'requestAutoActivation']);
        Route::post('tenants/{tenantId}/auto-activation/approve', [TenantController::class, 'approveAutoActivation']);
        Route::post('tenants/{tenantId}/auto-activation/reject', [TenantController::class, 'rejectAutoActivation']);
        Route::post('tenants/{tenantId}/users/{userId}/status', [TenantController::class, 'setUserStatus']);

        // Tenant-specific routes
        Route::prefix('tenants/{tenantId}')->middleware('team.tenant')->group(function () {
            Route::get('dashboard', [DashboardController::class, 'index']);
            Route::get('products/stats', [ProductStatsController::class, 'index']);
            
            // Phase 10: Tenant Analytics & Reporting
            Route::prefix('analytics')->group(function () {
                // Tenant-wide analytics
                Route::get('overview', [TenantAnalyticsController::class, 'overview']);
                Route::get('top-products', [TenantAnalyticsController::class, 'topProducts']);
                Route::get('revenue-breakdown', [TenantAnalyticsController::class, 'revenueBreakdown']);
                Route::get('profit-analysis', [TenantAnalyticsController::class, 'profitAnalysis']);
                Route::get('category-performance', [TenantAnalyticsController::class, 'categoryPerformance']);
                Route::get('most-viewed', [TenantAnalyticsController::class, 'mostViewed']);
                Route::get('search-terms', [TenantAnalyticsController::class, 'searchTerms']);
                Route::get('search-trends', [TenantAnalyticsController::class, 'searchTrends']);
                Route::get('search-stats', [SearchAnalyticsController::class, 'searchStats']);
                Route::get('zero-result-searches', [TenantAnalyticsController::class, 'zeroResultSearches']);
                
                // Tracking endpoints (can be called without strict auth for public views)
                Route::post('track-search', [SearchAnalyticsController::class, 'trackSearch']);
            });
            
            // Bulk operations (must be before apiResource to avoid route conflicts)
            Route::delete('products/bulk', [ProductController::class, 'bulkDelete']);
            Route::patch('products/bulk/status', [ProductController::class, 'bulkUpdateStatus']);
            Route::patch('products/bulk/category', [ProductController::class, 'bulkUpdateCategory']);
            Route::patch('products/bulk/price', [ProductController::class, 'bulkUpdatePrice']);
            
            // Export/Import operations
            Route::get('products/export', [ProductController::class, 'export']);
            Route::get('products/import/template', [ProductController::class, 'downloadTemplate']);
            Route::post('products/import', [ProductController::class, 'import']);
            
            // Product duplication (Phase 8)
            Route::post('products/{product}/duplicate', [ProductController::class, 'duplicate']);
            
            // Barcode operations
            Route::post('products/barcode/bulk', [BarcodeController::class, 'bulkGenerate']);
            Route::get('products/{productId}/barcode', [BarcodeController::class, 'generate']);
            
            // Product history & audit trail
            Route::get('products/{productId}/history', [ProductHistoryController::class, 'index']);
            Route::get('products/{productId}/history/price', [ProductHistoryController::class, 'priceHistory']);
            Route::get('products/{productId}/history/stock', [ProductHistoryController::class, 'stockHistory']);
            
            // Product analytics (Phase 6 - Stage 2)
            Route::prefix('products/{productId}/analytics')->group(function () {
                Route::get('sales', [ProductAnalyticsController::class, 'salesMetrics']);
                Route::get('stock', [ProductAnalyticsController::class, 'stockMetrics']);
                Route::get('profit', [ProductAnalyticsController::class, 'profitMetrics']);
                Route::get('variants', [ProductAnalyticsController::class, 'variantPerformance']);
                Route::get('overview', [ProductAnalyticsController::class, 'overview']);
                Route::get('export/csv', [ProductAnalyticsController::class, 'exportCsv']);
                Route::get('export/pdf', [ProductAnalyticsController::class, 'exportPdf']);
            });
            
            // Phase 10: Product View Tracking
            Route::post('products/{productId}/track-view', [ProductViewTrackingController::class, 'trackView']);
            Route::get('products/{productId}/view-stats', [ProductViewTrackingController::class, 'viewStats']);
            Route::get('products/{productId}/view-trends', [ProductViewTrackingController::class, 'viewTrends']);
            
            Route::apiResource('products', ProductController::class);
            Route::post('products/{product}/upload-image', [ProductController::class, 'uploadImage']);
            
            // Product Images (Phase 7: Multi-Image Gallery)
            Route::prefix('products/{productId}/images')->group(function () {
                Route::get('/', [\App\Http\Controllers\Api\ProductImageController::class, 'index']);
                Route::post('/', [\App\Http\Controllers\Api\ProductImageController::class, 'upload']);
                Route::delete('/{imageId}', [\App\Http\Controllers\Api\ProductImageController::class, 'delete']);
                Route::patch('/{imageId}/primary', [\App\Http\Controllers\Api\ProductImageController::class, 'setPrimary']);
                Route::patch('/reorder', [\App\Http\Controllers\Api\ProductImageController::class, 'reorder']);
            });
            
            // Product Variants (Phase 6)
            // Export/Import operations (must be before nested routes to avoid conflicts)
            Route::get('variants/export', [ProductVariantController::class, 'export']);
            Route::get('variants/import/template', [ProductVariantController::class, 'downloadTemplate']);
            Route::post('variants/import', [ProductVariantController::class, 'import']);
            
            Route::prefix('products/{productId}/variants')->group(function () {
                Route::get('/', [ProductVariantController::class, 'index']);
                Route::post('/', [ProductVariantController::class, 'store']);
                Route::post('/bulk', [ProductVariantController::class, 'bulkStore']);
                Route::patch('/bulk', [ProductVariantController::class, 'bulkUpdate']);
                Route::delete('/bulk', [ProductVariantController::class, 'bulkDestroy']);
                // Analytics routes MUST be before /{variantId} to avoid route conflicts
                Route::get('/analytics', [VariantAnalyticsController::class, 'productAnalytics']);
                Route::get('/{variantId}/analytics', [VariantAnalyticsController::class, 'show']);
                // Parameterized routes come last
                Route::get('/{variantId}', [ProductVariantController::class, 'show']);
                Route::patch('/{variantId}', [ProductVariantController::class, 'update']);
                Route::delete('/{variantId}', [ProductVariantController::class, 'destroy']);
                Route::post('/{variantId}/stock', [ProductVariantController::class, 'updateStock']);
                Route::post('/{variantId}/reserve', [ProductVariantController::class, 'reserveStock']);
                Route::post('/{variantId}/release', [ProductVariantController::class, 'releaseStock']);
            });
            
            // Variant Attributes (Phase 6)
            Route::get('variant-attributes', [VariantAttributeController::class, 'index']);
            Route::get('variant-attributes/popular', [VariantAttributeController::class, 'popular']);
            Route::post('variant-attributes', [VariantAttributeController::class, 'store']);
            Route::get('variant-attributes/{id}', [VariantAttributeController::class, 'show']);
            Route::patch('variant-attributes/{id}', [VariantAttributeController::class, 'update']);
            Route::delete('variant-attributes/{id}', [VariantAttributeController::class, 'destroy']);
            Route::post('variant-attributes/{id}/values', [VariantAttributeController::class, 'addValue']);
            Route::delete('variant-attributes/{id}/values', [VariantAttributeController::class, 'removeValue']);
            
            // Variant Templates (Phase 6)
            Route::get('variant-templates', [VariantTemplateController::class, 'index']);
            Route::post('variant-templates', [VariantTemplateController::class, 'store']);
            Route::get('variant-templates/{id}', [VariantTemplateController::class, 'show']);
            Route::patch('variant-templates/{id}', [VariantTemplateController::class, 'update']);
            Route::delete('variant-templates/{id}', [VariantTemplateController::class, 'destroy']);
            Route::post('variant-templates/{id}/apply', [VariantTemplateController::class, 'applyToProduct']);
            Route::post('variant-templates/{id}/preview', [VariantTemplateController::class, 'preview']);
            
            // Variant Analytics (Phase 6) - Global analytics endpoints
            Route::get('variants/analytics/top-performers', [VariantAnalyticsController::class, 'topPerformers']);
            Route::post('variants/analytics/compare', [VariantAnalyticsController::class, 'compare']);
            Route::get('variants/analytics/performance-summary', [VariantAnalyticsController::class, 'performanceSummary']);
            
            Route::apiResource('categories', CategoryController::class);
            Route::apiResource('roles', RoleController::class);
            Route::apiResource('users', UserController::class); // enable index, show, store, update, destroy
            Route::post('uploads/user-photo', [UserController::class, 'uploadPhoto']); // upload user photo to storage
            Route::post('users/{userId}/roles', [UserController::class, 'updateRoles']); // assign roles per tenant (team-scoped)
            Route::get('permissions', [PermissionController::class, 'index']);

            // Customers
            Route::apiResource('customers', \App\Http\Controllers\Api\CustomerController::class);
            Route::post('customers/search', [\App\Http\Controllers\Api\CustomerController::class, 'search']);

            // Phase 9: Suppliers
            Route::apiResource('suppliers', SupplierController::class);
            Route::get('suppliers/{supplierId}/products', [SupplierController::class, 'products']);

            // Phase 9: Product Tags
            Route::get('tags', [ProductTagController::class, 'index']);
            Route::post('tags', [ProductTagController::class, 'store']);
            Route::get('tags/popular', [ProductTagController::class, 'popular']);
            Route::get('tags/{tagId}', [ProductTagController::class, 'show']);
            Route::patch('tags/{tagId}', [ProductTagController::class, 'update']);
            Route::delete('tags/{tagId}', [ProductTagController::class, 'destroy']);
            Route::post('tags/bulk-attach', [ProductTagController::class, 'bulkAttach']);
            Route::post('tags/bulk-detach', [ProductTagController::class, 'bulkDetach']);

            // Phase 9: SKU Generation
            Route::get('sku-patterns', [SkuGenerationController::class, 'patterns']);
            Route::post('generate-sku', [SkuGenerationController::class, 'generate']);
            Route::post('preview-sku', [SkuGenerationController::class, 'preview']);
            Route::get('validate-sku', [SkuGenerationController::class, 'validateSku']);

            // EAV Blueprints
            Route::get('blueprints', [\App\Http\Controllers\Api\BlueprintsController::class, 'index']);
            Route::post('blueprints', [\App\Http\Controllers\Api\BlueprintsController::class, 'store']);
            Route::get('blueprints/{id}', [\App\Http\Controllers\Api\BlueprintsController::class, 'show']);
            Route::patch('blueprints/{id}', [\App\Http\Controllers\Api\BlueprintsController::class, 'update']);
            Route::post('blueprints/{id}/fields', [\App\Http\Controllers\Api\BlueprintsController::class, 'addField']);

            // Customer Attributes
            Route::get('customers/{customerId}/attributes', [\App\Http\Controllers\Api\CustomerAttributesController::class, 'show']);
            Route::put('customers/{customerId}/attributes', [\App\Http\Controllers\Api\CustomerAttributesController::class, 'put']);

            // Settings
            Route::get('settings', [\App\Http\Controllers\Api\SettingsController::class, 'show']);
            Route::patch('settings', [\App\Http\Controllers\Api\SettingsController::class, 'update']);

            // Content Management
            Route::get('content/footer', [ContentManagementController::class, 'getFooter']);
            Route::put('content/footer', [ContentManagementController::class, 'updateFooter']);
            Route::delete('content/footer', [ContentManagementController::class, 'deleteFooter']);
            
            // Content Pages Management
            Route::apiResource('content/pages', \App\Http\Controllers\Api\ContentPagesController::class);

            // Orders
            Route::get('orders', [OrderQueryController::class, 'index']);
            Route::get('orders/{orderId}', [OrderQueryController::class, 'show']);
            Route::post('orders', [OrderController::class, 'store']);

            // Stock Adjustments (Phase 5)
            Route::get('stock-adjustments/reasons', [StockAdjustmentController::class, 'getAdjustmentReasons']);
            Route::post('stock-adjustments', [StockAdjustmentController::class, 'store']);

            // Stock Alerts (Phase 5)
            Route::get('stock-alerts', [StockAlertController::class, 'index']);
            Route::get('stock-alerts/stats', [StockAlertController::class, 'stats']);
            Route::get('stock-alerts/low-stock-products', [StockAlertController::class, 'lowStockProducts']);
            Route::post('stock-alerts/{alertId}/acknowledge', [StockAlertController::class, 'acknowledge']);
            Route::post('stock-alerts/{alertId}/resolve', [StockAlertController::class, 'resolve']);
            Route::post('stock-alerts/{alertId}/dismiss', [StockAlertController::class, 'dismiss']);
        });
    });
});