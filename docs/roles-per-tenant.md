# Roles and Permissions — Tenant-Scoped with Teams (Updated)

This document aligns with the core rule: Spatie Permission with Teams enabled. All roles and permissions are tenant-scoped by team = `tenant_id`. Any prior guidance about disabling Teams or using global roles is deprecated.

## Summary
- Teams enabled; `team_foreign_key = tenant_id`; guard `api`; `model_morph_key = model_uuid`.
- Roles and permissions are tenant-scoped only; do not use `NULL tenant_id` roles.
- Use `App\Models\Role` extending Spatie Role; ensure uniqueness includes `tenant_id, name, guard_name`.
- Listing and CRUD operations are scoped to the current tenant via team context.
- HQ bypass is via `Gate::before` for `Super Admin` within the HQ tenant; it does not introduce global roles.

## Backend Details
- Guard: `api` across controllers/policies.
- Policies enforce tenant checks and permission gates; team context is set by middleware.
- Migrations (see 2025-09-23..25): add `tenant_id` to roles and pivots; convert morph key to UUID; enforce composite keys where applicable.
- Seeders use `App\Models\Role` and grant permissions per team. Super Admin exists in HQ team.

## Usage Notes
- Listing: returns roles for the current team context only.
- Creation/Update: binds new roles to the current team (`tenant_id`) implicitly via team context.
- Avoid creating roles without a team; do not use global roles.

## Testing Checklist
- Verify role creation in tenant A is not visible in tenant B.
- Verify permission checks honor team context.
- Verify HQ Super Admin in HQ tenant can access across tenants (via `Gate::before`).