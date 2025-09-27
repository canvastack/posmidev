<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\OrderQueryController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\StockAdjustmentController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\TenantController;

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
            Route::apiResource('products', ProductController::class);
            Route::apiResource('categories', CategoryController::class);
            Route::apiResource('roles', RoleController::class);
            Route::apiResource('users', UserController::class); // enable index, show, store, update, destroy
            Route::post('uploads/user-photo', [UserController::class, 'uploadPhoto']); // upload user photo to storage
            Route::post('users/{userId}/roles', [UserController::class, 'updateRoles']); // assign roles per tenant (team-scoped)
            Route::get('permissions', [PermissionController::class, 'index']);

            // Customers
            Route::apiResource('customers', \App\Http\Controllers\Api\CustomerController::class);
            Route::post('customers/search', [\App\Http\Controllers\Api\CustomerController::class, 'search']);

            // Settings
            Route::get('settings', [\App\Http\Controllers\Api\SettingsController::class, 'show']);
            Route::patch('settings', [\App\Http\Controllers\Api\SettingsController::class, 'update']);

            // Orders
            Route::get('orders', [OrderQueryController::class, 'index']);
            Route::get('orders/{orderId}', [OrderQueryController::class, 'show']);
            Route::post('orders', [OrderController::class, 'store']);

            Route::post('stock-adjustments', [StockAdjustmentController::class, 'store']);
        });
    });
});