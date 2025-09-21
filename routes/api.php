@@ .. @@
 use Illuminate\Http\Request;
 use Illuminate\Support\Facades\Route;
+use App\Http\Controllers\Api\AuthController;
+use App\Http\Controllers\Api\ProductController;
+use App\Http\Controllers\Api\OrderController;

 /*
 |--------------------------------------------------------------------------
@@ .. @@
 |
 */

-Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
-    return $request->user();
-});
+// Public routes
+Route::prefix('v1')->group(function () {
+    Route::post('/register', [AuthController::class, 'register']);
+    Route::post('/login', [AuthController::class, 'login']);
+
+    // Protected routes
+    Route::middleware('auth:sanctum')->group(function () {
+        Route::post('/logout', [AuthController::class, 'logout']);
+        Route::get('/user', [AuthController::class, 'user']);
+
+        // Tenant-specific routes
+        Route::prefix('tenants/{tenantId}')->group(function () {
+            Route::apiResource('products', ProductController::class);
+            Route::post('orders', [OrderController::class, 'store']);
+        });
+    });
+});