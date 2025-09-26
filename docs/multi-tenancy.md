# Multi-Tenancy

POSMID supports multi-tenant architecture, allowing multiple independent instances to run on the same application with isolated data. This guide explains how multi-tenancy works in POSMID and how to configure it.

## Overview

POSMID uses a single-database model with tenant scoping via Spatie Permission Teams (team = `tenant_id`). This is the active and immutable architecture for authorization and tenant context.

IMPORTANT enforcement updates:
- Global email uniqueness: `users.email` is globally unique across all tenants. Registration validates `unique:users,email` and DB enforces a unique index on `email`.
- HQ visibility rule: Users in the HQ tenant (ID from `config('tenancy.hq_tenant_id')`) may view all tenants only if their role grants `tenants.view`. Non-HQ users can only view their own tenant.
- No blanket HQ bypass: There is no global Gate bypass for HQ users. All access is governed by policies and permissions. You can exclude specific HQ roles (e.g., Super Admin) from `tenants.view` via role management if needed.

### Key Features

- **Complete Data Isolation**: Each tenant's data is completely separate
- **Shared Application Code**: Single codebase serves all tenants
- **Tenant-Aware Authentication**: Users are scoped to their tenant
- **Tenant-Specific Configuration**: Per-tenant settings and branding
- **Scalable Architecture**: Easy to add new tenants

## Architecture

### Database Structure

```
Main Database (posmid)
├── tenants table
├── global_users table (optional)
└── shared_data table

Tenant Databases (posmid_tenant_1, posmid_tenant_2, etc.)
├── users
├── products
├── orders
├── customers
└── tenant-specific data
```

### Tenant Identification

Tenants are identified by:

1. **Domain/Subdomain**: `tenant1.posmid.com`
2. **Request Header**: `X-Tenant-ID: tenant-uuid`
3. **Route Parameter**: `/tenant/{tenant}/api/...`
4. **User Session**: Automatic based on logged-in user

## Configuration

### Environment Variables

```env
# Enable multi-tenancy
MULTI_TENANCY_ENABLED=true

# Main database (shared across tenants)
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=posmid
DB_USERNAME=posmid_user
DB_PASSWORD=secure_password

# Tenant databases
DB_TENANT_CONNECTION=pgsql
DB_TENANT_HOST=127.0.0.1
DB_TENANT_PORT=5432
DB_TENANT_PREFIX=posmid_tenant_
DB_TENANT_USERNAME=posmid_user
DB_TENANT_PASSWORD=secure_password

# Tenant identification
TENANT_IDENTIFIER=domain
TENANT_DOMAIN_SUFFIX=posmid.com
```

### Database Configuration

**config/database.php:**
```php
<?php

return [
    'connections' => [
        'pgsql' => [
            'driver' => 'pgsql',
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'posmid'),
            'username' => env('DB_USERNAME'),
            'password' => env('DB_PASSWORD'),
            'charset' => 'utf8',
            'prefix' => '',
            'schema' => 'public',
        ],

        'tenant' => [
            'driver' => env('DB_TENANT_CONNECTION', 'pgsql'),
            'host' => env('DB_TENANT_HOST', '127.0.0.1'),
            'port' => env('DB_TENANT_PORT', '5432'),
            'database' => null, // Set dynamically
            'username' => env('DB_TENANT_USERNAME'),
            'password' => env('DB_TENANT_PASSWORD'),
            'charset' => 'utf8',
            'prefix' => env('DB_TENANT_PREFIX', ''),
            'schema' => 'public',
        ],
    ],
];
```

## Tenant Model

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Tenant extends Model
{
    protected $fillable = [
        'name',
        'domain',
        'uuid',
        'database',
        'is_active',
        'settings',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'settings' => 'array',
    ];

    protected static function booted()
    {
        static::creating(function ($tenant) {
            $tenant->uuid = (string) Str::uuid();
            $tenant->database = 'tenant_' . $tenant->uuid;
        });
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function getDomainAttribute($value)
    {
        return $value ?: $this->uuid . '.' . config('app.tenant_domain_suffix');
    }
}
```

## Tenant Resolution

### Domain-Based Resolution

**App\Http\Middleware\SetTenant.php:**
```php
<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetTenant extends Request
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = $this->resolveTenant($request);

        if (!$tenant) {
            return response()->json(['message' => 'Tenant not found'], 404);
        }

        // Set tenant context
        config(['database.connections.tenant.database' => $tenant->database]);
        DB::setDefaultConnection('tenant');

        // Store tenant in request
        $request->merge(['tenant' => $tenant]);

        return $next($request);
    }

    private function resolveTenant(Request $request): ?Tenant
    {
        $identifier = config('multitenancy.identifier', 'domain');

        switch ($identifier) {
            case 'domain':
                return $this->resolveByDomain($request->getHost());

            case 'header':
                return $this->resolveByHeader($request->header('X-Tenant-ID'));

            case 'route':
                return $this->resolveByRoute($request->route('tenant'));

            default:
                return null;
        }
    }

    private function resolveByDomain(string $host): ?Tenant
    {
        $suffix = config('multitenancy.domain_suffix');
        $subdomain = str_replace('.' . $suffix, '', $host);

        return Tenant::where('uuid', $subdomain)->orWhere('domain', $host)->first();
    }

    private function resolveByHeader(?string $tenantId): ?Tenant
    {
        return $tenantId ? Tenant::where('uuid', $tenantId)->first() : null;
    }

    private function resolveByRoute(?string $tenantParam): ?Tenant
    {
        return $tenantParam ? Tenant::where('uuid', $tenantParam)->first() : null;
    }
}
```

### User-Based Tenant Context

For authenticated requests, tenant can be resolved from the user's tenant_id:

```php
<?php

class User extends Authenticatable
{
    // ... other methods

    protected static function booted()
    {
        static::addGlobalScope('tenant', function (Builder $builder) {
            $tenant = tenant(); // Helper function
            if ($tenant) {
                $builder->where('tenant_id', $tenant->id);
            }
        });
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
```

## Tenant Management

### Creating Tenants

```php
<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CreateTenantCommand extends Command
{
    protected $signature = 'tenant:create {name} {domain?}';

    protected $description = 'Create a new tenant';

    public function handle()
    {
        $name = $this->argument('name');
        $domain = $this->argument('domain') ?? Str::slug($name) . '.posmid.com';

        // Create tenant record
        $tenant = Tenant::create([
            'name' => $name,
            'domain' => $domain,
        ]);

        // Create tenant database
        $this->createTenantDatabase($tenant);

        // Run tenant migrations
        $this->runTenantMigrations($tenant);

        // Seed tenant data
        $this->seedTenantData($tenant);

        $this->info("Tenant '{$name}' created successfully!");
        $this->info("Domain: {$domain}");
        $this->info("Database: {$tenant->database}");

        return Command::SUCCESS;
    }

    private function createTenantDatabase(Tenant $tenant)
    {
        $database = $tenant->database;

        // Create database if it doesn't exist
        DB::statement("CREATE DATABASE {$database}");

        $this->info("Database '{$database}' created");
    }

    private function runTenantMigrations(Tenant $tenant)
    {
        // Switch to tenant database
        config(['database.connections.tenant.database' => $tenant->database]);
        DB::setDefaultConnection('tenant');

        // Run migrations
        $this->call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenant',
        ]);

        $this->info("Migrations run for tenant '{$tenant->name}'");
    }

    private function seedTenantData(Tenant $tenant)
    {
        // Create admin user for tenant
        $admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@' . $tenant->domain,
            'password' => bcrypt('password'),
            'tenant_id' => $tenant->id,
        ]);

        $admin->assignRole('admin');

        $this->info("Admin user created for tenant '{$tenant->name}'");
    }
}
```

### Tenant Migrations

Store tenant-specific migrations in `database/migrations/tenant/`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateTenantProductsTable extends Migration
{
    public function up()
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->decimal('cost_price', 10, 2)->nullable();
            $table->string('sku')->unique();
            $table->foreignId('category_id')->constrained();
            $table->integer('stock_quantity')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('products');
    }
}
```

## Routing

### Tenant-Aware Routes

```php
<?php

// routes/tenant.php
Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
    Route::apiResource('products', ProductController::class);
    Route::apiResource('orders', OrderController::class);
    Route::apiResource('customers', CustomerController::class);
});

// Main routes/web.php or api.php
Route::middleware('tenant')->group(function () {
    require __DIR__.'/tenant.php';
});
```

### Route Service Provider

```php
<?php

namespace App\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;

class RouteServiceProvider extends ServiceProvider
{
    public function boot()
    {
        $this->routes(function () {
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            Route::middleware(['web', 'tenant'])
                ->group(base_path('routes/tenant.php'));
        });
    }
}
```

## Tenant-Specific Features

### Branding and Theming

```php
<?php

class Tenant extends Model
{
    // ... other methods

    public function getBrandingAttribute()
    {
        return $this->settings['branding'] ?? [
            'primary_color' => '#007bff',
            'logo_url' => '/images/default-logo.png',
            'company_name' => $this->name,
        ];
    }

    public function getFeaturesAttribute()
    {
        return $this->settings['features'] ?? [
            'inventory_management' => true,
            'customer_loyalty' => false,
            'multi_currency' => false,
        ];
    }
}
```

### Feature Flags

```php
<?php

// In controllers or middleware
if (!tenant()->features['inventory_management']) {
    return response()->json(['message' => 'Feature not available'], 403);
}
```

## Testing Multi-Tenant Applications

### Tenant Test Trait

```php
<?php

namespace Tests\Traits;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;

trait TenantTestTrait
{
    protected Tenant $tenant;

    protected function setUpTenant()
    {
        $this->tenant = Tenant::factory()->create();

        // Create tenant database for testing
        $this->createTestTenantDatabase();

        // Switch to tenant database
        config(['database.connections.tenant.database' => $this->tenant->database]);
        DB::setDefaultConnection('tenant');
    }

    private function createTestTenantDatabase()
    {
        $database = $this->tenant->database;

        // Use SQLite for testing
        config([
            'database.connections.tenant.driver' => 'sqlite',
            'database.connections.tenant.database' => database_path("{$database}.sqlite"),
        ]);

        // Create SQLite database file
        touch(database_path("{$database}.sqlite"));
    }

    protected function tearDownTenant()
    {
        // Clean up test database
        $database = $this->tenant->database;
        $path = database_path("{$database}.sqlite");

        if (file_exists($path)) {
            unlink($path);
        }
    }
}
```

### Multi-Tenant Test Example

```php
<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\TenantTestTrait;

class MultiTenantProductTest extends TestCase
{
    use RefreshDatabase, TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenant();
    }

    protected function tearDown(): void
    {
        $this->tearDownTenant();
        parent::tearDown();
    }

    public function test_user_can_create_product_in_tenant()
    {
        $user = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $token = $user->createToken('Test Token');

        $productData = [
            'name' => 'Tenant Product',
            'price' => 10.00,
            'category_id' => 1,
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
            'X-Tenant-ID' => $this->tenant->uuid,
        ])->post('/api/products', $productData);

        $response->assertCreated();
        $this->assertDatabaseHas('products', ['name' => 'Tenant Product']);
    }

    public function test_tenant_data_isolation()
    {
        // Create product in current tenant
        $product = Product::factory()->create(['name' => 'Tenant A Product']);

        // Create another tenant
        $tenantB = Tenant::factory()->create();
        $this->createTestTenantDatabase($tenantB);

        // Switch to tenant B
        config(['database.connections.tenant.database' => $tenantB->database]);
        DB::setDefaultConnection('tenant');

        // Product from tenant A should not be visible
        $this->assertDatabaseMissing('products', ['name' => 'Tenant A Product']);
    }
}
```

## Performance Considerations

### Database Optimization

1. **Connection Pooling**: Use connection pooling for tenant databases
2. **Read Replicas**: Implement read replicas for frequently accessed data
3. **Caching**: Cache tenant-specific data appropriately
4. **Database Sharding**: Consider sharding for high-traffic tenants

### Application Performance

1. **Tenant Context Caching**: Cache tenant resolution results
2. **Lazy Loading**: Load tenant data only when needed
3. **Background Jobs**: Use queues for tenant-specific background tasks
4. **CDN**: Use CDN for tenant-specific static assets

## Security Considerations

### Data Isolation

1. **Database-Level Security**: Ensure proper database user permissions
2. **Query Scoping**: Always scope queries to current tenant
3. **Access Control**: Implement tenant-level access controls
4. **Audit Logging**: Log cross-tenant access attempts

### Tenant Administration

1. **Super Admin**: Create super admin role for cross-tenant management
2. **Tenant Impersonation**: Allow support staff to impersonate tenant users
3. **Resource Limits**: Implement resource limits per tenant
4. **Backup Security**: Secure tenant database backups

## Monitoring and Maintenance

### Tenant Metrics

```php
<?php

class TenantMetrics
{
    public static function getTenantStats(Tenant $tenant)
    {
        return [
            'users_count' => $tenant->users()->count(),
            'products_count' => DB::connection('tenant')->table('products')->count(),
            'orders_count' => DB::connection('tenant')->table('orders')->count(),
            'database_size' => self::getDatabaseSize($tenant),
            'last_activity' => $tenant->updated_at,
        ];
    }

    private static function getDatabaseSize(Tenant $tenant)
    {
        // Implementation depends on database type
        // For PostgreSQL:
        $result = DB::select("
            SELECT pg_size_pretty(pg_database_size(?)) as size
        ", [$tenant->database]);

        return $result[0]->size ?? 'Unknown';
    }
}
```

### Maintenance Commands

```bash
# List all tenants
php artisan tenant:list

# Backup tenant database
php artisan tenant:backup {tenant-id}

# Migrate tenant database
php artisan tenant:migrate {tenant-id}

# Delete tenant
php artisan tenant:delete {tenant-id} --force
```

## Best Practices

1. **Consistent Naming**: Use consistent naming conventions for tenant databases
2. **Migration Strategy**: Plan tenant migrations carefully to avoid downtime
3. **Backup Strategy**: Implement regular backups for all tenant databases
4. **Monitoring**: Monitor tenant resource usage and performance
5. **Documentation**: Document tenant-specific customizations
6. **Testing**: Test multi-tenant scenarios thoroughly
7. **Security**: Implement defense in depth for tenant isolation
8. **Scalability**: Design for horizontal scaling of tenants

## Troubleshooting

### Common Issues

1. **Tenant Not Found**: Check tenant resolution logic and database records
2. **Database Connection Errors**: Verify tenant database exists and credentials
3. **Data Leakage**: Ensure all queries are properly scoped to tenant
4. **Performance Issues**: Monitor slow queries and optimize indexes
5. **Migration Failures**: Test migrations on staging before production

### Debugging Commands

```bash
# Show current tenant
php artisan tenant:current

# List tenant databases
php artisan tenant:databases

# Check tenant connectivity
php artisan tenant:ping {tenant-id}

# Show tenant statistics
php artisan tenant:stats {tenant-id}
```

## Next Steps

- [Configuration](configuration.md) - Configure multi-tenancy settings
- [Deployment](deployment.md) - Deploy multi-tenant applications
- [Troubleshooting](troubleshooting.md) - Multi-tenant specific issues

---

[← Testing](testing.md) | [Deployment →](deployment.md)