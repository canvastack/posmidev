<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\StockAdjustmentController;
use App\Http\Controllers\Api\DashboardController;

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

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'user']);

        // Tenant-specific routes
        Route::prefix('tenants/{tenantId}')->group(function () {
            Route::get('dashboard', [DashboardController::class, 'index']);
            Route::apiResource('products', ProductController::class);
            Route::apiResource('categories', CategoryController::class);
            Route::apiResource('roles', RoleController::class);
            Route::get('permissions', [PermissionController::class, 'index']);
            Route::post('orders', [OrderController::class, 'store']);
            Route::post('stock-adjustments', [StockAdjustmentController::class, 'store']);
        });
    });
});