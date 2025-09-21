@@ .. @@
     protected $middlewareGroups = [
         'web' => [
             \App\Http\Middleware\EncryptCookies::class,
             \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
             \Illuminate\Session\Middleware\StartSession::class,
             \Illuminate\View\Middleware\ShareErrorsFromSession::class,
             \App\Http\Middleware\VerifyCsrfToken::class,
             \Illuminate\Routing\Middleware\SubstituteBindings::class,
         ],

         'api' => [
             // \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
             \Illuminate\Routing\Middleware\ThrottleRequests::class.':api',
             \Illuminate\Routing\Middleware\SubstituteBindings::class,
+            \App\Http\Middleware\ValidateOpenApiRequest::class,
         ],
     ];