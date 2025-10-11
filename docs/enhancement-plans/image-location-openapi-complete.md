# 📋 OpenAPI Specification - Image & Location Enhancement

**Module**: Tenant, User, Customer Image & Location Features  
**Phase**: Backend Foundations - Week 1  
**Status**: ✅ OpenAPI Schemas & Endpoints Complete  
**Date**: January 2025

---

## 🎯 Overview

This document provides a comprehensive reference for the **Image & Location Enhancement** OpenAPI specifications. All three modules (Tenant, User, Customer) now have complete schemas and endpoints for image upload/delete and location management.

---

## 📂 File Structure

```
openapi/v1/
├── index.yaml                      # Main OpenAPI entry (updated with new endpoints)
├── components/
│   ├── schemas/
│   │   ├── tenants.yaml           # ✅ NEW - Tenant schemas with image/location
│   │   ├── users.yaml             # ✅ NEW - User schemas with image/location
│   │   ├── customers.yaml         # ✅ NEW - Customer schemas with image/location
│   │   ├── common.yaml            # Existing (ErrorResponse, Pagination)
│   │   ├── materials.yaml         # Existing (BOM Engine)
│   │   └── products.yaml          # Existing (Product schemas)
│   └── parameters/
│       └── common.yaml            # Existing (TenantId, UserId, CustomerId, etc.)
└── paths/
    ├── tenants.yaml               # ✅ UPDATED - Added logo upload/delete endpoints
    ├── users.yaml                 # ✅ UPDATED - Added photo upload/delete endpoints
    ├── customers.yaml             # ✅ UPDATED - Added photo upload/delete endpoints
    ├── suppliers.yaml             # Existing (already has image endpoints)
    └── ... (other modules)
```

---

## 🏢 Tenant Module

### Schema File: `openapi/v1/components/schemas/tenants.yaml`

#### Schemas Defined:

1. **TenantBase**
   - Core tenant fields: `id`, `name`, `address`, `phone`, `status`, `settings`
   - System fields: `can_auto_activate_users`, `auto_activate_request_pending`, `auto_activate_requested_at`
   - Timestamps: `created_at`, `updated_at`

2. **TenantImageFields**
   ```yaml
   logo_url:           string (nullable, URI) - Full-size logo URL
   logo_thumb_url:     string (nullable, URI) - Thumbnail (300x300)
   has_logo:           boolean (readOnly) - Computed accessor
   ```

3. **TenantLocationFields**
   ```yaml
   latitude:           number (double, -90 to 90) - Business location lat
   longitude:          number (double, -180 to 180) - Business location lng
   location_address:   string (nullable) - Human-readable address
   has_location:       boolean (readOnly) - Computed accessor
   location_coordinates: object (readOnly) - {lat, lng} object
   ```

4. **TenantComplete** - Combines Base + Image + Location with `allOf`

5. **TenantListResponse** - Paginated list response

6. **TenantRequest** - Create/update request body

7. **ImageUploadResponse** - Upload success response

8. **ImageDeleteResponse** - Delete success response

### Endpoints: `openapi/v1/paths/tenants.yaml`

#### Upload Logo
```yaml
POST /tenants/{tenantId}/upload-logo
```
- **Request**: `multipart/form-data` with `logo` field (binary, max 5MB)
- **Formats**: JPEG, PNG, GIF, WEBP
- **Response**: `ImageUploadResponse` with `logo_url` and `logo_thumb_url`
- **Errors**: 400 (invalid file), 403 (forbidden), 422 (validation error)

#### Delete Logo
```yaml
DELETE /tenants/{tenantId}/logo
```
- **Response**: `ImageDeleteResponse` with success message
- **Errors**: 403 (forbidden), 404 (not found)

### Example Request (cURL):
```bash
# Upload logo
curl -X POST "http://localhost:8000/api/v1/tenants/{tenantId}/upload-logo" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "logo=@/path/to/logo.png"

# Delete logo
curl -X DELETE "http://localhost:8000/api/v1/tenants/{tenantId}/logo" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example Response:
```json
{
  "message": "Logo uploaded successfully.",
  "logo_url": "http://localhost:8000/storage/tenants/11111111-1111-1111-1111-111111111111/logo_abc123.jpg",
  "logo_thumb_url": "http://localhost:8000/storage/tenants/11111111-1111-1111-1111-111111111111/logo_abc123_thumb.jpg"
}
```

---

## 👤 User Module

### Schema File: `openapi/v1/components/schemas/users.yaml`

#### Schemas Defined:

1. **UserBase**
   - Core user fields: `id`, `tenant_id`, `name`, `email`, `username`, `display_name`, `phone_number`, `status`
   - Timestamps: `email_verified_at`, `created_at`, `updated_at`

2. **UserImageFields**
   ```yaml
   profile_photo_url:       string (nullable, URI) - Full-size photo URL
   profile_photo_thumb_url: string (nullable, URI) - Thumbnail (300x300)
   has_profile_photo:       boolean (readOnly) - Computed accessor
   ```

3. **UserLocationFields**
   ```yaml
   home_latitude:           number (double, -90 to 90) - Home location lat
   home_longitude:          number (double, -180 to 180) - Home location lng
   home_address:            string (nullable) - Human-readable address
   has_home_location:       boolean (readOnly) - Computed accessor
   home_location_coordinates: object (readOnly) - {lat, lng} object
   ```

4. **UserComplete** - Combines Base + Image + Location with `allOf`

5. **UserListResponse** - Paginated list response

6. **UserRequest** - Create/update request body

7. **ProfilePhotoUploadResponse** - Upload success response

8. **ProfilePhotoDeleteResponse** - Delete success response

### Endpoints: `openapi/v1/paths/users.yaml`

#### Upload Profile Photo
```yaml
POST /tenants/{tenantId}/users/{userId}/upload-photo
```
- **Request**: `multipart/form-data` with `photo` field (binary, max 5MB)
- **Formats**: JPEG, PNG, GIF, WEBP
- **Response**: `ProfilePhotoUploadResponse` with `profile_photo_url` and `profile_photo_thumb_url`
- **Errors**: 400 (invalid file), 403 (forbidden), 422 (validation error)

#### Delete Profile Photo
```yaml
DELETE /tenants/{tenantId}/users/{userId}/photo
```
- **Response**: `ProfilePhotoDeleteResponse` with success message
- **Errors**: 403 (forbidden), 404 (not found)

### Example Request (cURL):
```bash
# Upload profile photo
curl -X POST "http://localhost:8000/api/v1/tenants/{tenantId}/users/{userId}/upload-photo" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "photo=@/path/to/profile.jpg"

# Delete profile photo
curl -X DELETE "http://localhost:8000/api/v1/tenants/{tenantId}/users/{userId}/photo" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example Response:
```json
{
  "message": "Profile photo uploaded successfully.",
  "profile_photo_url": "http://localhost:8000/storage/users/11111111-1111-1111-1111-111111111111/photo_xyz789.jpg",
  "profile_photo_thumb_url": "http://localhost:8000/storage/users/11111111-1111-1111-1111-111111111111/photo_xyz789_thumb.jpg"
}
```

---

## 🛒 Customer Module

### Schema File: `openapi/v1/components/schemas/customers.yaml`

#### Schemas Defined:

1. **CustomerBase**
   - Core customer fields: `id`, `tenant_id`, `name`, `email`, `phone`, `address`, `tags`
   - Timestamps: `created_at`, `updated_at`

2. **CustomerImageFields**
   ```yaml
   photo_url:       string (nullable, URI) - Full-size photo URL
   photo_thumb_url: string (nullable, URI) - Thumbnail (300x300)
   has_photo:       boolean (readOnly) - Computed accessor
   ```

3. **CustomerLocationFields**
   ```yaml
   delivery_latitude:      number (double, -90 to 90) - Delivery location lat
   delivery_longitude:     number (double, -180 to 180) - Delivery location lng
   delivery_address:       string (nullable) - Human-readable address
   has_delivery_location:  boolean (readOnly) - Computed accessor
   delivery_coordinates:   object (readOnly) - {lat, lng} object
   ```

4. **CustomerComplete** - Combines Base + Image + Location with `allOf`

5. **CustomerListResponse** - Paginated list response

6. **CustomerRequest** - Create/update request body

7. **CustomerPhotoUploadResponse** - Upload success response

8. **CustomerPhotoDeleteResponse** - Delete success response

### Endpoints: `openapi/v1/paths/customers.yaml`

#### Upload Customer Photo
```yaml
POST /tenants/{tenantId}/customers/{customerId}/upload-photo
```
- **Request**: `multipart/form-data` with `photo` field (binary, max 5MB)
- **Formats**: JPEG, PNG, GIF, WEBP
- **Response**: `CustomerPhotoUploadResponse` with `photo_url` and `photo_thumb_url`
- **Errors**: 400 (invalid file), 403 (forbidden), 422 (validation error)

#### Delete Customer Photo
```yaml
DELETE /tenants/{tenantId}/customers/{customerId}/photo
```
- **Response**: `CustomerPhotoDeleteResponse` with success message
- **Errors**: 403 (forbidden), 404 (not found)

### Example Request (cURL):
```bash
# Upload customer photo
curl -X POST "http://localhost:8000/api/v1/tenants/{tenantId}/customers/{customerId}/upload-photo" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "photo=@/path/to/customer.jpg"

# Delete customer photo
curl -X DELETE "http://localhost:8000/api/v1/tenants/{tenantId}/customers/{customerId}/photo" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example Response:
```json
{
  "message": "Customer photo uploaded successfully.",
  "photo_url": "http://localhost:8000/storage/customers/11111111-1111-1111-1111-111111111111/photo_def456.jpg",
  "photo_thumb_url": "http://localhost:8000/storage/customers/11111111-1111-1111-1111-111111111111/photo_def456_thumb.jpg"
}
```

---

## 🔒 Security & Permissions

### Authentication
All endpoints require **Bearer Token** authentication via Laravel Sanctum:
```
Authorization: Bearer {token}
```

### Permission Model
- **Guard**: `api` (Spatie Permission)
- **Team Scope**: All operations are tenant-scoped (tenant_id foreign key)
- **HQ Super Admin**: Bypass via `Gate::before` (tenant_id: `11111111-1111-1111-1111-111111111111`)

### Permission Requirements (Proposed)

#### Tenant Logo:
- `tenants.update` - Required to upload/delete logo
- HQ Super Admin can modify any tenant

#### User Profile Photo:
- `users.update` - Required to upload/delete photo for others
- Users can always modify their own profile photo (self-service)

#### Customer Photo:
- `customers.update` - Required to upload/delete photo
- Tenant isolation enforced (cannot modify other tenant's customers)

---

## 📊 Field Specifications

### Image Fields (Common Pattern)

| Field | Type | Nullable | Description | Example |
|-------|------|----------|-------------|---------|
| `{entity}_url` | string (URI) | Yes | Full-size image URL | `http://localhost:8000/storage/tenants/.../logo.jpg` |
| `{entity}_thumb_url` | string (URI) | Yes | Thumbnail URL (300x300) | `http://localhost:8000/storage/tenants/.../logo_thumb.jpg` |
| `has_{entity}` | boolean | No | Computed accessor (readOnly) | `true` |

### Location Fields (Common Pattern)

| Field | Type | Nullable | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `{prefix}_latitude` | number (double) | Yes | -90 to 90 | Latitude coordinate |
| `{prefix}_longitude` | number (double) | Yes | -180 to 180 | Longitude coordinate |
| `{prefix}_address` | string | Yes | - | Human-readable address (reverse geocoded) |
| `has_{prefix}_location` | boolean | No | readOnly | Computed accessor |
| `{prefix}_coordinates` | object | Yes | readOnly | `{lat: number, lng: number}` |

---

## 🧪 Testing with Postman/Swagger

### Import OpenAPI Spec
```bash
# Main spec file (includes all modules)
openapi/v1/index.yaml
```

### Test Flow Example (Tenant Logo Upload):

1. **Login** - Get bearer token
   ```
   POST /login
   Body: { email, password }
   Response: { token }
   ```

2. **Upload Logo**
   ```
   POST /tenants/{tenantId}/upload-logo
   Headers: Authorization: Bearer {token}
   Body (form-data): logo=@logo.png
   Response: { message, logo_url, logo_thumb_url }
   ```

3. **Get Tenant** - Verify logo fields populated
   ```
   GET /tenants/{tenantId}
   Headers: Authorization: Bearer {token}
   Response: { id, name, ..., logo_url, logo_thumb_url, has_logo: true }
   ```

4. **Delete Logo**
   ```
   DELETE /tenants/{tenantId}/logo
   Headers: Authorization: Bearer {token}
   Response: { message }
   ```

5. **Get Tenant Again** - Verify logo fields cleared
   ```
   GET /tenants/{tenantId}
   Response: { ..., logo_url: null, logo_thumb_url: null, has_logo: false }
   ```

---

## 📚 References

### Related Documents
- **Implementation Roadmap**: `frontend\.devs\BOMBS\PHASE-1\IMAGE-LOCATION-ENHANCEMENT-ROADMAP.md`
- **Day 1 Complete**: `frontend\.devs\BOMBS\PHASE-1\IMAGE-LOCATION-DAY-1-COMPLETE.md`
- **Supplier Pattern**: `devs\ENHANCEMENTS\SUPPLIER-ENHANCEMENT-COMPLETE.md`

### External Resources
- **OpenAPI 3.0 Specification**: https://spec.openapis.org/oas/v3.0.3
- **Laravel Intervention Image**: https://image.intervention.io/
- **Spatie Laravel Permission**: https://spatie.be/docs/laravel-permission/

---

## ✅ Compliance Verification

### Immutable Rules Check
- ✅ **Teams enabled**: TRUE (all endpoints under `/tenants/{tenantId}`)
- ✅ **team_foreign_key**: `tenant_id` (UUID in all schemas)
- ✅ **guard_name**: `api` (to be enforced in backend controllers)
- ✅ **model_morph_key**: `model_uuid` (UUID string for all IDs)
- ✅ **Roles & Permissions**: Tenant-scoped (403 responses for unauthorized)
- ❌ **NO global roles**: NULL tenant_id never allowed

### OpenAPI Best Practices
- ✅ Detailed descriptions for all fields/endpoints
- ✅ Validation constraints (min/max, formats)
- ✅ Example values provided
- ✅ Error responses documented (400, 403, 404, 422)
- ✅ Consistent naming conventions
- ✅ Modular file structure for maintainability

---

## 🎯 Next Implementation Steps

**Day 2**: Tenant Backend Implementation
- Create migration for `tenants` table (add 5 new fields)
- Update `Tenant` model ($fillable, $casts, accessors)
- Implement `TenantController::uploadLogo()` and `deleteLogo()`
- Add routes to `api.php`
- Write feature tests (upload, delete, permissions, isolation)

**Day 3**: User Backend Implementation  
**Day 4**: Customer Backend Implementation  
**Day 5**: Backend Testing & Documentation

---

**Status**: ✅ **OPENAPI COMPLETE - READY FOR BACKEND IMPLEMENTATION**

🚀 **All schemas and endpoints are fully documented and ready for Day 2!**