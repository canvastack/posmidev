@@ .. @@
     'connections' => [
 
-        'sqlite' => [
-            'driver' => 'sqlite',
-            'url' => env('DATABASE_URL'),
-            'database' => env('DB_DATABASE', database_path('database.sqlite')),
-            'prefix' => '',
-            'foreign_key_constraints' => env('DB_FOREIGN_KEYS', true),
-        ],
-
-        'mysql' => [
-            'driver' => 'mysql',
+        'pgsql' => [
+            'driver' => 'pgsql',
             'url' => env('DATABASE_URL'),
             'host' => env('DB_HOST', '127.0.0.1'),
-            'port' => env('DB_PORT', '3306'),
+            'port' => env('DB_PORT', '5432'),
             'database' => env('DB_DATABASE', 'forge'),
             'username' => env('DB_USERNAME', 'forge'),
             'password' => env('DB_PASSWORD', ''),
-            'unix_socket' => env('DB_SOCKET', ''),
-            'charset' => 'utf8mb4',
-            'collation' => 'utf8mb4_unicode_ci',
+            'charset' => 'utf8',
             'prefix' => '',
-            'prefix_indexes' => true,
             'strict' => true,
-            'engine' => null,
-            'options' => extension_loaded('pdo_mysql') ? array_filter([
-                PDO::MYSQL_ATTR_SSL_CA => env('MYSQL_ATTR_SSL_CA'),
-            ]) : [],
+            'schema' => 'public',
+            'sslmode' => 'prefer',
         ],