# Auth & Sanctum Troubleshooting Guide

This guide documents the connection resets and auth crashes observed, root causes, and the definitive fixes so the issues don’t recur.

## Symptoms
- Connection reset (client-side: `ERR_CONNECTION_RESET` or PowerShell `Unable to connect to the remote server`) when hitting any route protected by `auth:api`.
- No Laravel logs for the failing request; server process was terminated mid-request by a fatal error.
- Public routes (e.g. `/api/v1/ping`) work fine.
- Protected diagnostics:
  - `/api/v1/guard-check` sometimes returns 200 with `userId: null` (no token).
  - `/api/v1/ping-auth` with a valid token used to kill the server; later returns 200 or 401 when fixed or when token is missing/invalid.

## Root Causes Found
1) Missing trait referenced by `User` model
- Fatal error:
```
Trait "Src\Pms\Core\Domain\Traits\BelongsToTenant" not found
```
- Because the file didn’t exist at the PSR-4 location expected by its namespace, any attempt by Sanctum to hydrate `User` would load the model and crash the PHP process.

2) User model namespace vs. framework defaults
- We use `Src\Pms\Infrastructure\Models\User` instead of `App\Models\User`.
- `config/auth.php` must point provider `users.model` to the correct FQCN.
- Sanctum’s `personal_access_tokens.tokenable_type` may contain various strings (default `App\Models\User`, FQCN, or custom alias). A morph map is required.

3) Resource calling methods that may not exist
- `UserResource` referenced `getRoleNames()` from Spatie’s `HasRoles`. When `HasRoles` was temporarily removed during isolation tests, this caused `BadMethodCallException`. Guard the call.

## Definitive Fixes
1) Implement the missing trait
- File: `src/Pms/Core/Domain/Traits/BelongsToTenant.php`
```php
<?php

namespace Src\Pms\Core\Domain\Traits;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Minimal tenant binding */
trait BelongsToTenant
{
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(\Src\Pms\Infrastructure\Models\Tenant::class, 'tenant_id');
    }
}
```

2) Ensure correct auth provider mapping
- File: `config/auth.php`
```php
'providers' => [
    'users' => [
        'driver' => 'eloquent',
        'model' => Src\Pms\Infrastructure\Models\User::class,
    ],
],
```

3) Add morph map to resolve Sanctum tokenable_type variants
- File: `app/Providers/AppServiceProvider.php`
```php
use Illuminate\Database\Eloquent\Relations\Relation;

public function boot(): void
{
    Relation::morphMap([
        'App\\Models\\User' => \Src\Pms\Infrastructure\Models\User::class,
        'Src\\Pms\\Infrastructure\\Models\\User' => \Src\Pms\Infrastructure\Models\User::class,
        'user' => \Src\Pms\Infrastructure\Models\User::class,
    ]);
}
```

4) Make `UserResource` robust when traits are toggled
- File: `app/Http/Resources/UserResource.php` guards `getRoleNames()` with `method_exists` and try/catch.

5) Refresh autoload & caches after structural changes
- Run:
```
composer dump-autoload
php artisan optimize:clear
```

## Validation Steps
- Unauth check:
```
curl.exe -i http://127.0.0.1:9000/api/v1/ping-auth
# Expect 401 JSON: {"message":"Unauthenticated."}
```
- Login and get token (POST login): use response token as Bearer.
- Auth check:
```
curl.exe -i -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:9000/api/v1/ping-auth
# Expect 200 JSON: {"ok":true,"userId":"<uuid>"}
```
- Guard direct:
```
curl.exe -i -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:9000/api/v1/guard-check
# Expect 200 with userId populated
```
- User endpoint:
```
curl.exe -i -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:9000/api/v1/user
```

## Notes & Pitfalls
- Connection reset without Laravel logs usually indicates a PHP fatal error (e.g., autoloading failure) killing the PHP built-in server before the framework can handle/log it.
- After moving/adding namespaced files, always run `composer dump-autoload`.
- On Windows shells, prefer `curl.exe` over PowerShell’s `curl` alias; for PowerShell use `Invoke-RestMethod -Headers @{ Authorization = 'Bearer ...' }`.
- If tokens were created before morph map fixes, log in again to mint fresh tokens.

## If Issues Persist
- Verify the trait and model exist at the exact namespace path.
- Inspect `storage/logs/laravel.log` after failures.
- Temporarily disable heavy traits on `User` (e.g., third-party traits) and re-enable one by one to identify offenders.
- Try an alternate runtime (WSL/Docker) if you suspect PHP’s built-in server instability on Windows.