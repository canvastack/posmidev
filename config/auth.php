@@ .. @@
     'guards' => [
         'web' => [
             'driver' => 'session',
             'provider' => 'users',
         ],
+
+        'api' => [
+            'driver' => 'sanctum',
+            'provider' => 'users',
+        ],
     ],

     /*
@@ .. @@
     'providers' => [
         'users' => [
             'driver' => 'eloquent',
-            'model' => App\Models\User::class,
+            'model' => Src\Pms\Infrastructure\Models\User::class,
         ],

         // 'users' => [