# Auth + Tenant Scope Debugging Playbook

This document records the root causes, fixes, and a repeatable checklist to diagnose and prevent crashes or connection resets around authentication (Sanctum), tenant scoping, and roles/permissions.

## 1) Symptoms Observed
- Frontend/PowerShell showed connection reset or ERR_NETWORK on auth-protected routes (e.g., `/api/v1/ping-auth`, `/api/v1/guard-check`, `/api/v1/user`, dashboard endpoints).
- No (or delayed) logs in `storage/logs/laravel.log` when the PHP built-in server crashed on fatal errors.
- GET /api/v1/login returned 405 (expected; only POST is allowed).
- Inconsistent outcomes: sometimes 401 JSON (Unauthenticated), sometimes hard connection reset.
- Seeder error: `Target class [Database\Seeders\DummyDataSeeder] does not exist`.

## 2) Root Causes
- User model provider mismatch:
  - Laravel’s default `App\Models\User` conflicted with the actual domain model `Src\Pms\Infrastructure\Models\User`.
  - Sanctum attempted to resolve tokens against the wrong model/type.
- Fatal error in middleware boot path:
  - Trait not autoloaded: `Trait "Src\Pms\Core\Domain\Traits\BelongsToTenant" not found` led to immediate PHP fatal error and socket reset (seen in laravel.log when it could write).
- Trait interactions while isolating:
  - Temporarily disabling Spatie `HasRoles` removed `getRoleNames()`, causing `BadMethodCallException` via `UserResource` during login.
- Seeder class autoload:
  - New seeder required `composer dump-autoload` or use short class name to resolve class (`php artisan db:seed --class=DummyDataSeeder`).

## 3) Fixes Implemented/Validated
- Aligned the auth provider to the correct user model in `config/auth.php`:
  ```php
  'providers' => [
      'users' => [
          'driver' => 'eloquent',
          'model' => Src\Pms\Infrastructure\Models\User::class,
      ],
  ],
  ```
- Added a morph map to keep polymorphic types consistent (Sanctum, other morphs):
  ```php
  // app/Providers/AppServiceProvider.php
  use Illuminate\Database\Eloquent\Relations\Relation;

  public function boot(): void
  {
      Relation::morphMap([
          'user' => \Src\Pms\Infrastructure\Models\User::class,
      ]);
  }
  ```
- Ensured `BelongsToTenant` trait exists and is lightweight to avoid boot-time crashes:
  ```php
  // src/Pms/Core/Domain/Traits/BelongsToTenant.php
  namespace Src\Pms\Core\Domain\Traits;
  use Illuminate\Database\Eloquent\Relations\BelongsTo;
  trait BelongsToTenant {
      public function tenant(): BelongsTo
      {
          return $this->belongsTo(\Src\Pms\Infrastructure\Models\Tenant::class, 'tenant_id');
      }
  }
  ```
- Guard and tenant scoping:
  - Roles/permissions and controllers use guard `api` consistently.
  - `RoleController@index` restricted to roles actually assigned to users in the tenant.
- Diagnostic routes:
  - `/api/v1/ping` (no auth) should always 200.
  - `/api/v1/ping-auth` requires token; returns 401 without token.
  - `/api/v1/guard-check` logs/returns the resolved user id using the configured guard.

## 4) Validation Checklist (Run in Order)
1) Clear caches and autoload:
   - `php artisan optimize:clear`
   - `composer dump-autoload`
2) Verify provider/morph map:
   - `config/auth.php` provider model points to `Src\Pms\Infrastructure\Models\User`.
   - `AppServiceProvider::boot()` has `Relation::morphMap([... 'user' => User::class])`.
3) Ensure trait is present and namespaced correctly:
   - `src/Pms/Core/Domain/Traits/BelongsToTenant.php` matches namespace `Src\Pms\Core\Domain\Traits`.
4) Reset tokens (avoid wrong tokenable_type):
   - Truncate `personal_access_tokens` or delete old tokens.
   - Re-login to get a fresh Bearer token.
5) Sanity test endpoints:
   - `curl.exe -i http://127.0.0.1:9000/api/v1/ping` → 200 JSON.
   - `curl.exe -i http://127.0.0.1:9000/api/v1/ping-auth` → 401 JSON.
   - `curl.exe -i -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:9000/api/v1/ping-auth` → 200 JSON with userId.
   - `curl.exe -i -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:9000/api/v1/guard-check` → 200 JSON with userId.

## 5) Known Pitfalls and Their Handling
- Connection reset with no logs:
  - Usually a PHP fatal error (e.g., missing trait/class or extension crash). Check Windows PHP built-in server; re-run with `-d display_errors=On` if needed. Inspect `laravel.log`—fatal traces often appear when the logger flushes before the crash.
- BadMethodCallException on `getRoleNames()`:
  - Triggered when `HasRoles` is removed but `UserResource` still calls role APIs. If you need to isolate roles temporarily, guard such calls or re-enable `HasRoles` once stable.
- Seeder FQCN error:
  - Prefer short class: `php artisan db:seed --class=DummyDataSeeder`.
  - If using FQCN, run `composer dump-autoload` first.
- 403 Unauthorized on dashboard:
  - Not a crash—policy/permission failed. Ensure the logged-in user has required permissions (guard `api`).

## 6) Prevention Guidelines
- Keep a small, stable set of traits on the User model; add custom traits incrementally.
- Enforce a single guard for API (`api`) and filter permissions/roles by the same guard.
- Maintain a morph map for all polymorphic relations to avoid fully-qualified class names stored in DB.
- Provide dedicated diagnostic endpoints during development (`ping`, `ping-auth`, `guard-check`).
- When refactoring namespaces (Hexagonal architecture), update `config/auth.php` and purge tokens.

## 7) Quick Recovery Commands (PowerShell)
```powershell
# Clear caches and autoload
php artisan optimize:clear
composer dump-autoload

# Fresh tokens (optional during dev)
php artisan tinker
# >>> \DB::table('personal_access_tokens')->truncate();

# Start server
php artisan serve --port=9000

# Sanity checks
curl.exe -i http://127.0.0.1:9000/api/v1/ping
curl.exe -i http://127.0.0.1:9000/api/v1/ping-auth
curl.exe -i -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:9000/api/v1/ping-auth
curl.exe -i -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:9000/api/v1/guard-check
```

## 8) What To Do If It Regresses
- If `/ping` is fine but `/ping-auth` resets: suspect traits or auth provider again. Re-verify sections 2–4 above.
- If `/guard-check` shows a `userId` with header but other endpoints 403: review policies/permissions for required abilities and guard alignment.
- If the server dies without logs: run PHP with more verbosity, and temporarily wrap middleware-protected routes with `try/catch` and logging (as done in `guard-check`).