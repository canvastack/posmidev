# Users API

Tenant-scoped Users management with pagination, search, CRUD, and media upload.

- Base URL prefix: `/api/v1/tenants/{tenantId}`
- Auth: Bearer token (`Authorization: Bearer <token>`)

## List Users

```http
GET /api/v1/tenants/{tenantId}/users?page=1&per_page=10&q=keyword
```

- **Query params**:
  - `page` (int, default 1)
  - `per_page` (int, default 10)
  - `q` (string) — search by name/email

- **Response (200)**: Laravel paginator of `UserResource` objects

## Create User

```http
POST /api/v1/tenants/{tenantId}/users
Content-Type: application/json
```

Body:
```json
{
  "name": "Jane",
  "email": "jane@shop.com",
  "password": "secret123",
  "display_name": "Jane Q.",
  "status": "active",
  "photo": "https://.../storage/tenants/{tenantId}/user-photos/user_xxx.jpg",
  "phone_number": "+62812..."
}
```

- **Validation**:
  - `email` must be unique within the tenant: `unique:users,email WHERE tenant_id={tenantId}`

- **Response (201)**: `UserResource`

## Get User

```http
GET /api/v1/tenants/{tenantId}/users/{userId}
```

- 404 if `tenant_id` mismatch

## Update User

```http
PUT /api/v1/tenants/{tenantId}/users/{userId}
```

Body fields are optional; `password` when provided will be hashed.

- **Validation**:
  - `email` unique per tenant (ignoring current user): `unique:users,email WHERE tenant_id={tenantId} IGNORE {userId}`

- **Response (200)**: `UserResource`

## Delete User

```http
DELETE /api/v1/tenants/{tenantId}/users/{userId}
```

- **Response (200)**: `{ "message": "Deleted" }`

## Upload User Photo

Upload an image and receive a public URL (requires `php artisan storage:link`).

```http
POST /api/v1/tenants/{tenantId}/uploads/user-photo
Content-Type: multipart/form-data

file: <binary image>
```

- **Validation**: image; max 3MB
- **Response (201)**:
```json
{ "url": "/storage/tenants/{tenantId}/user-photos/user_xxx.jpg", "path": "public/tenants/{tenantId}/user-photos/user_xxx.jpg" }
```

## User Resource Shape

```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "tenant_id": "uuid",
  "status": "active|inactive|pending|banned",
  "roles": ["string"],
  "display_name": "string|null",
  "photo": "string|null",
  "phone_number": "string|null",
  "created_at": "YYYY-MM-DD HH:mm:ss"
}
```