# Authorization

POSMID uses Spatie Laravel Permission with Teams enabled as a core, immutable rule. Authorization is tenant-scoped via team context mapped to `tenant_id`, using the `api` guard and `model_morph_key = model_uuid`. This document is aligned with that standard; any non-Teams guidance is considered legacy.

## Core System Rules (Immutable)
- Spatie Permission with Teams is required and cannot be disabled.
- Team foreign key: `tenant_id`. Guard: `api`. Morph key: `model_uuid`.
- Team context must be set per-request (from route `tenants/{tenantId}` or from authenticated user).
- Roles and permissions are tenant-scoped only. No global roles; HQ bypass is via `Gate::before` using configured HQ tenant.


## Overview

The authorization system provides:

- **Role-Based Access Control** - Users assigned to roles with specific permissions
- **Granular Permissions** - Fine-grained control over resources and actions
- **Permission Groups** - Organize permissions into logical groups
- **Dynamic Permission Assignment** - Runtime permission checking
- **Multi-tenant Support** - Tenant-scoped permissions

## Configuration

### Permission Package Configuration

Located in `config/permission.php`:

```php
<?php

return [
    'models' => [
        'permission' => Spatie\Permission\Models\Permission::class,
        'role' => Spatie\Permission\Models\Role::class,
    ],

    'table_names' => [
        'roles' => 'roles',
        'permissions' => 'permissions',
        'model_has_permissions' => 'model_has_permissions',
        'model_has_roles' => 'model_has_roles',
        'role_has_permissions' => 'role_has_permissions',
    ],

    'column_names' => [
        'role_pivot_key' => null,
        'permission_pivot_key' => null,
        'model_morph_key' => 'model_id',
        'team_foreign_key' => 'team_id',
    ],

    'use_passport_client_credentials' => false,

    'display_permission_in_exception' => false,

    'display_role_in_exception' => false,

    'enable_wildcard_permission' => false,

    'cache' => [
        'expiration_time' => \DateInterval::createFromDateString('24 hours'),
        'key' => 'spatie.permission.cache',
        'store' => 'default',
    ],
];
```

**Configuration Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `models` | array | [...] | Model classes for permissions and roles |
| `table_names` | array | [...] | Database table names |
| `column_names` | array | [...] | Column names for pivot tables |
| `use_passport_client_credentials` | boolean | false | Enable Passport client credentials |
| `display_permission_in_exception` | boolean | false | Show permission in exceptions |
| `display_role_in_exception` | boolean | false | Show role in exceptions |
| `enable_wildcard_permission` | boolean | false | Enable wildcard permissions |
| `cache` | array | [...] | Cache configuration for permissions |

## Database Schema

The permission system creates several tables:

### Permissions Table
```sql
CREATE TABLE permissions (
    id bigint PRIMARY KEY,
    name varchar(255) UNIQUE,
    guard_name varchar(255),
    created_at timestamp,
    updated_at timestamp
);
```

### Roles Table
```sql
CREATE TABLE roles (
    id bigint PRIMARY KEY,
    name varchar(255) UNIQUE,
    guard_name varchar(255),
    created_at timestamp,
    updated_at timestamp
);
```

### Pivot Tables
```sql
-- Role-Permission relationships
CREATE TABLE role_has_permissions (
    permission_id bigint,
    role_id bigint,
    PRIMARY KEY (permission_id, role_id)
);

-- Model-Role relationships
CREATE TABLE model_has_roles (
    role_id bigint,
    model_type varchar(255),
    model_id bigint,
    PRIMARY KEY (role_id, model_type, model_id)
);

-- Model-Permission relationships
CREATE TABLE model_has_permissions (
    permission_id bigint,
    model_type varchar(255),
    model_id bigint,
    PRIMARY KEY (permission_id, model_type, model_id)
);
```

## Permission Definitions

### Core Permissions

POSMID defines the following permission groups:

```php
// Product permissions
'products.view' => 'View products',
'products.create' => 'Create products',
'products.update' => 'Update products',
'products.delete' => 'Delete products',

// Order permissions
'orders.view' => 'View orders',
'orders.create' => 'Create orders',
'orders.update' => 'Update orders',
'orders.delete' => 'Delete orders',

// Customer permissions
'customers.view' => 'View customers',
'customers.create' => 'Create customers',
'customers.update' => 'Update customers',
'customers.delete' => 'Delete customers',

// User management permissions
'users.view' => 'View users',
'users.create' => 'Create users',
'users.update' => 'Update users',
'users.delete' => 'Delete users',

// Role permissions
'roles.view' => 'View roles',
'roles.create' => 'Create roles',
'roles.update' => 'Update roles',
'roles.delete' => 'Delete roles',

// System permissions
'system.settings' => 'Access system settings',
'system.reports' => 'View reports',
'system.backup' => 'Create backups',
```

### Permission Seeder

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends Seeder
{
    public function run()
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            // Products
            'products.view',
            'products.create',
            'products.update',
            'products.delete',

            // Orders
            'orders.view',
            'orders.create',
            'orders.update',
            'orders.delete',

            // Customers
            'customers.view',
            'customers.create',
            'customers.update',
            'customers.delete',

            // Users
            'users.view',
            'users.create',
            'users.update',
            'users.delete',

            // Roles
            'roles.view',
            'roles.create',
            'roles.update',
            'roles.delete',

            // System
            'system.settings',
            'system.reports',
            'system.backup',
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission]);
        }

        // Create roles and assign permissions
        $adminRole = Role::create(['name' => 'admin']);
        $adminRole->givePermissionTo(Permission::all());

        $managerRole = Role::create(['name' => 'manager']);
        $managerRole->givePermissionTo([
            'products.view', 'products.create', 'products.update',
            'orders.view', 'orders.create', 'orders.update',
            'customers.view', 'customers.create', 'customers.update',
            'users.view',
            'system.reports',
        ]);

        $cashierRole = Role::create(['name' => 'cashier']);
        $cashierRole->givePermissionTo([
            'products.view',
            'orders.view', 'orders.create', 'orders.update',
            'customers.view', 'customers.create', 'customers.update',
        ]);

        $customerRole = Role::create(['name' => 'customer']);
        $customerRole->givePermissionTo([
            'products.view',
            'orders.view', 'orders.create',
            'customers.view', 'customers.update', // own profile
        ]);
    }
}
```

## User Model with Permissions

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
        'tenant_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    // Permission relationships
    public function getPermissionsAttribute()
    {
        return $this->getAllPermissions()->pluck('name');
    }

    public function getRolesAttribute()
    {
        return $this->getRoleNames();
    }

    // Check if user has specific permission
    public function hasPermission(string $permission): bool
    {
        return $this->can($permission);
    }

    // Check if user has any of the permissions
    public function hasAnyPermission(array $permissions): bool
    {
        return $this->hasAnyPermission($permissions);
    }

    // Check if user has all permissions
    public function hasAllPermissions(array $permissions): bool
    {
        foreach ($permissions as $permission) {
            if (!$this->can($permission)) {
                return false;
            }
        }
        return true;
    }
}
```

## Middleware for Authorization

### Permission Middleware

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        if (!$request->user() || !$request->user()->can($permission)) {
            return response()->json([
                'message' => 'Unauthorized',
                'required_permission' => $permission,
            ], 403);
        }

        return $next($request);
    }
}
```

### Role Middleware

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        if (!$request->user() || !$request->user()->hasRole($role)) {
            return response()->json([
                'message' => 'Unauthorized',
                'required_role' => $role,
            ], 403);
        }

        return $next($request);
    }
}
```

### Register Middleware

In `bootstrap/app.php` or `app/Http/Kernel.php`:

```php
<?php

// In Laravel 11 (bootstrap/app.php)
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(...)
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'permission' => \App\Http\Middleware\CheckPermission::class,
            'role' => \App\Http\Middleware\CheckRole::class,
        ]);
    })
    ->create();
```

## Route Protection

### Protected Routes with Permissions

```php
<?php

use App\Http\Controllers\Api\ProductController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->group(function () {

    // Product routes - different permissions for different actions
    Route::get('/products', [ProductController::class, 'index'])
        ->middleware('permission:products.view');

    Route::post('/products', [ProductController::class, 'store'])
        ->middleware('permission:products.create');

    Route::put('/products/{product}', [ProductController::class, 'update'])
        ->middleware('permission:products.update');

    Route::delete('/products/{product}', [ProductController::class, 'destroy'])
        ->middleware('permission:products.delete');

    // Admin only routes
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::apiResource('roles', RoleController::class);
        Route::get('/system/reports', [ReportController::class, 'index']);
    });

});
```

### Controller Authorization

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        // User must have permission to view products
        $this->authorize('view', Product::class);

        $products = Product::paginate();

        return response()->json($products);
    }

    public function store(Request $request)
    {
        // User must have permission to create products
        $this->authorize('create', Product::class);

        $product = Product::create($request->validated());

        return response()->json($product, 201);
    }

    public function update(Request $request, Product $product)
    {
        // User must have permission to update this product
        $this->authorize('update', $product);

        $product->update($request->validated());

        return response()->json($product);
    }

    public function destroy(Request $request, Product $product)
    {
        // User must have permission to delete this product
        $this->authorize('delete', $product);

        $product->delete();

        return response()->json(['message' => 'Product deleted']);
    }
}
```

## Policy Classes

### Product Policy

```php
<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('products.view');
    }

    public function view(User $user, Product $product): bool
    {
        return $user->can('products.view');
    }

    public function create(User $user): bool
    {
        return $user->can('products.create');
    }

    public function update(User $user, Product $product): bool
    {
        // Admin can update any product
        if ($user->hasRole('admin')) {
            return true;
        }

        // Manager can update products in their tenant
        if ($user->hasRole('manager')) {
            return $product->tenant_id === $user->tenant_id;
        }

        return false;
    }

    public function delete(User $user, Product $product): bool
    {
        // Only admin can delete
        return $user->hasRole('admin');
    }

    public function restore(User $user, Product $product): bool
    {
        return $user->hasRole('admin');
    }

    public function forceDelete(User $user, Product $product): bool
    {
        return $user->hasRole('admin');
    }
}
```

### Register Policies

In `App\Providers\AppServiceProvider.php`:

```php
<?php

namespace App\Providers;

use App\Models\Product;
use App\Policies\ProductPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    protected $policies = [
        Product::class => ProductPolicy::class,
    ];

    public function boot(): void
    {
        // Register policies
        // (automatically registered in Laravel 11)
    }
}
```

## Frontend Authorization

### Permission Checking in React

```typescript
// src/hooks/usePermissions.ts
import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  };

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) ?? false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  return {
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    permissions: user?.permissions ?? [],
    roles: user?.roles ?? [],
  };
};
```

### Protected Components

```tsx
// src/components/ProtectedComponent.tsx
import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface ProtectedComponentProps {
  permission?: string;
  role?: string;
  permissions?: string[];
  roles?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  permission,
  role,
  permissions,
  roles,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasRole, hasAnyPermission } = usePermissions();

  // Check single permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  // Check single role
  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  // Check multiple permissions (any)
  if (permissions && !hasAnyPermission(permissions)) {
    return <>{fallback}</>;
  }

  // Check multiple roles (any)
  if (roles && roles.some(r => hasRole(r))) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
```

### Usage Example

```tsx
// src/pages/Products.tsx
import React from 'react';
import { ProtectedComponent } from '../components/ProtectedComponent';
import { usePermissions } from '../hooks/usePermissions';

export const Products: React.FC = () => {
  const { hasPermission } = usePermissions();

  return (
    <div>
      <h1>Products</h1>

      {/* Show products list to anyone who can view products */}
      <ProtectedComponent permission="products.view">
        <ProductList />
      </ProtectedComponent>

      {/* Show create button only to users who can create products */}
      <ProtectedComponent permission="products.create">
        <button>Create Product</button>
      </ProtectedComponent>

      {/* Admin panel - only for admins */}
      <ProtectedComponent role="admin">
        <AdminPanel />
      </ProtectedComponent>

      {/* Reports - for managers and admins */}
      <ProtectedComponent roles={['admin', 'manager']}>
        <Reports />
      </ProtectedComponent>
    </div>
  );
};
```

## API Authorization

### Permission-Based API Responses

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $data = [
            'id' => $this->id,
            'name' => $this->name,
            'price' => $this->price,
            'category' => $this->category,
        ];

        // Add sensitive data only for authorized users
        if ($user && $user->can('products.view_sensitive')) {
            $data['cost_price'] = $this->cost_price;
            $data['profit_margin'] = $this->profit_margin;
        }

        // Add admin-only fields
        if ($user && $user->hasRole('admin')) {
            $data['created_at'] = $this->created_at;
            $data['updated_at'] = $this->updated_at;
            $data['deleted_at'] = $this->deleted_at;
        }

        return $data;
    }
}
```

## Role and Permission Management

### Creating Roles and Permissions Programmatically

```php
<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class CreateRoleCommand extends Command
{
    protected $signature = 'roles:create {name} {--permissions=*}';

    protected $description = 'Create a new role with optional permissions';

    public function handle()
    {
        $roleName = $this->argument('name');
        $permissions = $this->option('permissions');

        $role = Role::create(['name' => $roleName]);

        if (!empty($permissions)) {
            $role->givePermissionTo($permissions);
        }

        $this->info("Role '{$roleName}' created successfully!");
        return Command::SUCCESS;
    }
}
```

### Assigning Roles to Users

```php
<?php

// Assign role to user
$user->assignRole('admin');

// Assign multiple roles
$user->assignRole(['admin', 'manager']);

// Remove role
$user->removeRole('manager');

// Sync roles (replace all)
$user->syncRoles(['cashier']);
```

### Managing Permissions

```php
<?php

// Create permission
$permission = Permission::create(['name' => 'products.export']);

// Give permission to role
$role->givePermissionTo('products.export');

// Give multiple permissions
$role->givePermissionTo(['products.export', 'products.import']);

// Revoke permission
$role->revokePermissionTo('products.export');

// Sync permissions
$role->syncPermissions(['products.view', 'products.create']);
```

## Testing Authorization

### Unit Tests for Policies

```php
<?php

namespace Tests\Unit\Policies;

use App\Models\Product;
use App\Models\User;
use App\Policies\ProductPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_any_product()
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $product = Product::factory()->create();

        $policy = new ProductPolicy();

        $this->assertTrue($policy->update($admin, $product));
    }

    public function test_manager_can_only_update_tenant_products()
    {
        $manager = User::factory()->create();
        $manager->assignRole('manager');

        $tenantProduct = Product::factory()->create(['tenant_id' => $manager->tenant_id]);
        $otherProduct = Product::factory()->create(['tenant_id' => 999]);

        $policy = new ProductPolicy();

        $this->assertTrue($policy->update($manager, $tenantProduct));
        $this->assertFalse($policy->update($manager, $otherProduct));
    }

    public function test_cashier_cannot_update_products()
    {
        $cashier = User::factory()->create();
        $cashier->assignRole('cashier');

        $product = Product::factory()->create();

        $policy = new ProductPolicy();

        $this->assertFalse($policy->update($cashier, $product));
    }
}
```

### Feature Tests for Authorization

```php
<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_with_permission_can_create_product()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('products.create');

        $token = $user->createToken('Test Token');

        $productData = [
            'name' => 'Test Product',
            'price' => 100.00,
            'category_id' => 1,
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
        ])->post('/api/products', $productData);

        $response->assertCreated();
    }

    public function test_user_without_permission_cannot_create_product()
    {
        $user = User::factory()->create();
        // No permissions assigned

        $token = $user->createToken('Test Token');

        $productData = [
            'name' => 'Test Product',
            'price' => 100.00,
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
        ])->post('/api/products', $productData);

        $response->assertForbidden();
    }

    public function test_admin_can_access_all_products()
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        Product::factory()->count(5)->create();

        $token = $admin->createToken('Test Token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
        ])->get('/api/products');

        $response->assertOk()
                ->assertJsonCount(5, 'data');
    }
}
```

## Troubleshooting

### Common Issues

1. **Permission Cache Issues**
   ```bash
   # Clear permission cache
   php artisan permission:cache-reset
   ```

2. **Role Assignment Not Working**
   - Check if user has the correct guard
   - Verify role exists in database
   - Clear permission cache

3. **Middleware Not Working**
   - Ensure middleware is registered in `bootstrap/app.php`
   - Check middleware alias names
   - Verify route middleware application

4. **Policy Not Found**
   - Register policy in `AppServiceProvider`
   - Check model-policy mapping
   - Verify policy class exists

### Debugging Commands

```bash
# Show user permissions
php artisan tinker
$user = App\Models\User::find(1);
$user->getAllPermissions()

# Show user roles
$user->getRoleNames()

# Check specific permission
$user->can('products.create')

# List all permissions
Spatie\Permission\Models\Permission::all()

# List all roles
Spatie\Permission\Models\Role::all()
```

## Best Practices

1. **Use Descriptive Permission Names** - `products.create` instead of `create_product`
2. **Group Related Permissions** - Use prefixes like `products.`, `orders.`
3. **Implement Policies** - Use Laravel policies for complex authorization logic
4. **Cache Permissions** - Enable caching for better performance
5. **Test Authorization** - Write comprehensive tests for all permission checks
6. **Document Permissions** - Keep permission lists updated in documentation
7. **Use Middleware Wisely** - Apply middleware at appropriate levels

## Next Steps

- [API Reference](api.md) - Complete API endpoints with authorization requirements
- [Testing](testing.md) - Authorization testing guidelines
- [Multi-tenancy](multi-tenancy.md) - Tenant-scoped authorization

---

[← Authentication](authentication.md) | [API Reference →](api.md)