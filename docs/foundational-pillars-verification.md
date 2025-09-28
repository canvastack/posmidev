# Foundational Pillars Verification Guide

This guide verifies 4 foundational pillars: Authentication, Tenant Context, Authorization, and CRUD Flow.

## Prerequisites
- Backend running at http://localhost:9000
- A valid Bearer token from login
- A valid TENANT_UUID and USER_UUID
- Windows PowerShell examples use ^ for line continuation

## 0) One-time Setup and Cache Reset
1) Regenerate autoload and clear caches after adding policies/permissions:
```powershell
composer dump-autoload
php artisan optimize:clear
php artisan permission:cache-reset
```
2) Ensure testing permission exists:
```powershell
php artisan db:seed --class=Database\Seeders\PermissionSeeder
```

---

## Pillar 1 — Authentication (Sanctum)
- Endpoint: `GET /api/v1/test/auth`
- Protection: `auth:api` (Sanctum guard `api`)
- Expected: `{"userId":"<uuid>"}` of the authenticated user

### Get Token
```powershell
curl -X POST http://localhost:9000/api/v1/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"demo@example.com\",\"password\":\"secret\"}"
```
Copy the `token` value from the response.

### Test Auth
```powershell
curl -X GET http://localhost:9000/api/v1/test/auth ^
  -H "Authorization: Bearer YOUR_TOKEN"
```

Postman: Create request GET /api/v1/test/auth with Authorization → Bearer Token.

---

## Pillar 2 — Tenant Context (Route Model Binding + Team Context)
- Endpoint: `GET /api/v1/tenants/{tenant}/test/context`
- Middleware: `auth:api`, `team.tenant`
- Expected: `{"tenantName":"<name>"}` for the bound tenant

```powershell
curl -X GET http://localhost:9000/api/v1/tenants/TENANT_UUID/test/context ^
  -H "Authorization: Bearer YOUR_TOKEN"
```

Postman: Add path variable `tenant` = TENANT_UUID.

---

## Pillar 3 — Authorization (Policy + Permission)
- Endpoint: `GET /api/v1/tenants/{tenant}/test/policy`
- Policy: `TestPolicy@access` requires `testing.access` within current tenant context
- Expected:
  - Without permission: 403 Forbidden
  - With permission: 200 `{ "ok": true }`

### Grant Permission in Tenant Context (Tinker)
```powershell
php artisan tinker
>>> use Spatie\Permission\PermissionRegistrar;
>>> use Src\Pms\Infrastructure\Models\User;
>>> app(PermissionRegistrar::class)->setPermissionsTeamId('TENANT_UUID');
>>> $u = User::find('USER_UUID');
>>> $u->givePermissionTo('testing.access');
```

### Call Endpoint
```powershell
curl -X GET http://localhost:9000/api/v1/tenants/TENANT_UUID/test/policy ^
  -H "Authorization: Bearer YOUR_TOKEN"
```

Postman: Ensure token belongs to the user that has `testing.access` for that tenant.

---

## Pillar 4 — CRUD Flow (Categories)
- Routes: `Route::apiResource('categories', CategoryController::class)` under `/api/v1/tenants/{tenantId}`
- Required permissions: `categories.view`, `categories.create`, `categories.update`, `categories.delete`

### Grant Permissions (Tinker)
```powershell
php artisan tinker
>>> use Spatie\Permission\PermissionRegistrar;
>>> use Src\Pms\Infrastructure\Models\User;
>>> app(PermissionRegistrar::class)->setPermissionsTeamId('TENANT_UUID');
>>> $u = User::find('USER_UUID');
>>> $u->givePermissionTo('categories.view');
>>> $u->givePermissionTo('categories.create');
>>> $u->givePermissionTo('categories.update');
>>> $u->givePermissionTo('categories.delete');
```

### Create Category
```powershell
curl -X POST http://localhost:9000/api/v1/tenants/TENANT_UUID/categories ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Beverages\",\"description\":\"Drinks\"}"
```

### List Categories
```powershell
curl -X GET http://localhost:9000/api/v1/tenants/TENANT_UUID/categories ^
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Show Category
```powershell
curl -X GET http://localhost:9000/api/v1/tenants/TENANT_UUID/categories/CATEGORY_UUID ^
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Category
```powershell
curl -X PUT http://localhost:9000/api/v1/tenants/TENANT_UUID/categories/CATEGORY_UUID ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Beverages & Snacks\",\"description\":\"Drinks and snacks\"}"
```

### Delete Category
```powershell
curl -X DELETE http://localhost:9000/api/v1/tenants/TENANT_UUID/categories/CATEGORY_UUID ^
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Troubleshooting
- 401: Invalid/missing token
- 403 on policy test: Ensure `testing.access` granted in tenant context and `team.tenant` middleware runs
- 500: Run `php artisan optimize:clear`, inspect `storage/logs/laravel.log`, and re-check seeding and guards

## Postman Collection (Optional)
- Create a Postman collection with variables: `baseUrl`, `token`, `tenantId`, `categoryId`
- Import the routes above as saved requests for quick regression checks