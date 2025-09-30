# Product Status and Publishing

## Status Field
- Column: `products.status` (string)
- Default: `draft`
- Enum values: `draft`, `published`, `archived`
- Migration: `2025_09_28_000100_add_status_to_products_table.php`

## Behavior
- Admin endpoints: can manage all statuses (subject to permissions)
- Public endpoints: only return `status = published`
- Public list also defaults to `minStock = 1` (configurable via query)

## Seeding
- `Database\Seeders\DummyDataSeeder`
  - Randomizes product status with ~65% `published`, ~20% `draft`, ~15% `archived`

## OpenAPI
- `components.schemas.PublicProduct.status` is present with enum and default
- Public paths documented under `/tenants/{tenantId}/public/*`
