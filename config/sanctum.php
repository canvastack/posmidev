@@ .. @@
     'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
         '%s%s',
         'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1',
         Sanctum::currentApplicationUrlWithPort()
-    ))),
+    ))) ?: [],
 
     /*
     |--------------------------------------------------------------------------
@@ .. @@
     | requests. Typically, this should reference the `api` guard.
     |
     */
    'guard' => ['web'],
-    'guard' => ['web'],
+    'guard' => ['api'],
    ))),