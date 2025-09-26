# Roles and Permissions — Teams (Tenant) Scoped

This document aligns with the core rule: Spatie Permission with Teams enabled. All roles and permissions are tenant-scoped by team = `tenant_id`. Any prior guidance about disabling Teams or using global roles is legacy and deprecated.

## Summary
- Teams enabled; `team_foreign_key = tenant_id`; guard `api`; `model_morph_key = model_uuid`.
- Roles and permissions are tenant-scoped only; do not use `NULL tenant_id` roles.
- Use `App\Models\Role` extending Spatie Role; ensure uniqueness includes `tenant_id, name, guard_name`.
- Listing returns roles for the current tenant context; creation binds to current tenant via team context.
- HQ bypass is via `Gate::before` and does not introduce global roles.

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