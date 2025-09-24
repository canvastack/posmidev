# Per-Tenant Roles (Global + Tenant-Specific)

This document explains the new role catalog architecture that supports both global and tenant-specific roles without enabling Spatie "teams".

## Summary
- A nullable `tenant_id` column is added to the `roles` table.
  - `tenant_id = null` → Global role (visible/usable in all tenants)
  - `tenant_id = <tenant UUID>` → Role scoped to that tenant
- A local `App\Models\Role` model extends `Spatie\Permission\Models\Role` and carries `tenant_id`.
- `config/permission.php` is updated to use `App\Models\Role`.
- Role listing returns global + tenant-scoped roles for the current tenant.
- Create/Update supports a `global: boolean` flag to toggle role scope.

## Backend Details
- Guard remains `api` throughout.
- Policies enforce same-tenant checks and permission gates.
- Migrations: `roles.tenant_id` (UUID, nullable, indexed) added via `2025_09_23_001000_alter_roles_add_tenant_id.php`.
- Seeders:
  - `RoleTenantBootstrapper` ensures baseline global roles: Super Admin, admin, manager, cashier.
  - Existing seeders migrated to use `App\Models\Role` where necessary.

## Rationale
- Avoids enabling Spatie teams (and cross-table changes) while still providing per-tenant catalogs.
- Keeps pivot tables unchanged and compatible with UUID users.

## Usage Notes
- Listing: returns global + tenant-specific roles.
- Creation/Update: include `{"global": true}` in the payload to create global roles; omit or `false` for tenant-specific roles.

## Testing Checklist
- List roles returns superset of global + tenant roles.
- Create tenant role and verify it’s not visible in another tenant.
- Create global role and verify it’s visible everywhere.
- Policy: only authorized users in the same tenant can manage roles.