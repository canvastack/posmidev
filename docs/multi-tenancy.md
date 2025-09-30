# Multi-Tenancy (Current, Implemented)

POSMID uses a single-database, tenant-scoped authorization model built on Spatie Laravel Permission with Teams enabled. Team = `tenant_id`. The system does not create separate databases per tenant.

## Key Principles
- **Teams enabled**: Spatie team context is mapped to `tenant_id`.
- **Guard**: `api` everywhere for permissions/policies.
- **Morph key**: `model_morph_key = model_uuid` (UUID PK).
- **Per-request team context**: Set from route param `tenants/{tenantId}` (or `tenant`) or fallback to the authenticated user’s `tenant_id`.
- **No global roles**: All roles/permissions are tenant-scoped; no roles with `NULL tenant_id`.
- **HQ Super Admin bypass**: Only Super Admins within the configured HQ tenant receive a full-access bypass via `Gate::before`.

## How Tenant Context Is Set
- Middleware: `App\Http\Middleware\SetPermissionsTeamFromTenant`
  - Reads `tenantId` or `tenant` route parameter (supports route-model-binding), or falls back to `request->user()->tenant_id`.
  - Calls `PermissionRegistrar::setPermissionsTeamId((string)$tenantId)` to scope Spatie queries to the current team.
- Routes: Tenant-bound endpoints are grouped under `tenants/{tenantId}` and apply the middleware (alias often `team.tenant`).

Example snippet (see `routes/api.php`):
```php
Route::prefix('tenants/{tenantId}')->middleware('team.tenant')->group(function () {
    Route::apiResource('products', ProductController::class);
    // ...
});
```

## Configuration
- `config/permission.php` (important parts):
```php
return [
    'models' => [
        'permission' => Spatie\Permission\Models\Permission::class,
        // Use our extended Role that supports tenant_id
        'role' => App\Models\Role::class,
    ],
    'column_names' => [
        'model_morph_key' => 'model_uuid',   // UUID morph key
        'team_foreign_key' => 'tenant_id',   // Team column => tenant_id
    ],
    'teams' => true,
    'cache' => [
        'store' => 'default',
        'expiration_time' => \DateInterval::createFromDateString('24 hours'),
        'key' => 'spatie.permission.cache',
    ],
];
```
- Role model override: `App\Models\Role` casts `tenant_id` as string and includes it in `$fillable`.

## HQ Tenant and Gate Bypass
- `config/tenancy.php` provides:
  - `hq_tenant_id` (UUID)
  - `hq_tenant_name`
- `App\Providers\AuthServiceProvider` registers `Gate::before` which grants all abilities when:
  - `user.tenant_id === config('tenancy.hq_tenant_id')`, and
  - the user holds the `Super Admin` role within the HQ team context.

This preserves tenant scoping system-wide while allowing a controlled HQ Super Admin override.

## Database and Migrations
- Single database. Key migrations include:
  - Spatie tables with team scoping and UUID morph key
  - Roles table extended with `tenant_id` (UUID)
  - Pivots updated to include `tenant_id` and composite keys where applicable
- See repository migrations under `database/migrations` around 2025-09-23..25 for permission/teams updates.

## Do Not Do (Legacy/Deprecated)
- No separate databases per tenant.
- No domain/header-based multi-DB switching.
- No global roles (no `NULL tenant_id`).
- No non-Teams Spatie configuration.

## Testing & Troubleshooting
- After changing permission schema/config: run
  - `php artisan config:clear`
  - `php artisan cache:clear`
  - `php artisan permission:cache-reset`
- Ensure routes under `tenants/{tenantId}` apply the team-context middleware so policies/permissions resolve correctly.