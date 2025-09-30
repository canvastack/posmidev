# Authorization (Current, Implemented)

POSMID uses Spatie Laravel Permission with Teams enabled as a core, immutable rule. Authorization is tenant-scoped via team context mapped to `tenant_id`, using the `api` guard and `model_morph_key = model_uuid`.

## Core System Rules (Immutable)
- Teams enabled; `team_foreign_key = tenant_id`; guard `api`; morph key `model_uuid`.
- Team context set per-request from `tenants/{tenantId}` (or `tenant`) route param or authenticated user's `tenant_id`.
- Roles and permissions are tenant-scoped only. No global roles; HQ bypass is via `Gate::before` inside the configured HQ tenant for the `Super Admin` role.

## Configuration (Aligned with Code)
- `config/permission.php`
```php
return [
    'models' => [
        'permission' => Spatie\Permission\Models\Permission::class,
        'role' => App\Models\Role::class, // supports tenant_id
    ],
    'table_names' => [
        'roles' => 'roles',
        'permissions' => 'permissions',
        'model_has_permissions' => 'model_has_permissions',
        'model_has_roles' => 'model_has_roles',
        'role_has_permissions' => 'role_has_permissions',
    ],
    'column_names' => [
        'model_morph_key' => 'model_uuid',
        'team_foreign_key' => 'tenant_id',
    ],
    'teams' => true,
    'display_permission_in_exception' => false,
    'enable_wildcard_permission' => false,
    'cache' => [
        'store' => 'default',
        'expiration_time' => \DateInterval::createFromDateString('24 hours'),
        'key' => 'spatie.permission.cache',
        'model_key' => 'name',
        'forget_cache_credentials' => false,
    ],
];
```

## Gate HQ Bypass
- Implemented in `App\Providers\AuthServiceProvider`:
  - Applies only if the user belongs to the HQ tenant (`config('tenancy.hq_tenant_id')`) and holds `Super Admin` in HQ team.
  - Returns `true` from `Gate::before` to grant all abilities; otherwise returns `null` to continue normal checks.

## Policies
- Mapped for core models (Product, Order, Category, StockAdjustment, User, Tenant, Customer) in `AuthServiceProvider::$policies`.
- Policies should always assume team context is already set by middleware.

## Permissions & Roles
- Seeders define a consistent permission set (e.g., `products.view/create/update/delete`, etc.).
- `App\Models\Role` extends Spatie Role and includes `tenant_id` in `$fillable` and `$casts`.

## Operational Notes
- Always reset caches after permission schema/config changes:
  - `php artisan config:clear`
  - `php artisan cache:clear`
  - `php artisan permission:cache-reset`

## Deprecated/Legacy (Do not use)
- Spatie without Teams.
- Global roles (`tenant_id = NULL`).
- Blanket HQ visibility bypass not tied to `Super Admin` in HQ team.