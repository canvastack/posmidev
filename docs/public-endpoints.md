# Public Endpoints

These endpoints expose a tenant's public content without authentication. They only return published products and the public slice of tenant settings.

- Base URL: `http://localhost:9000/api/v1`
- Tenant context: path parameter `{tenantId}` (UUID)

## GET /tenants/{tenantId}/public/settings
- Returns `tenant.settings.public` as-is
- Response:
```json
{
  "tenantId": "<uuid>",
  "public": { "brandName": "...", "theme": {"primary":"#..."} }
}
```

## GET /tenants/{tenantId}/public/products
- Lists published products only
- Default filter: `minStock=1` (hide out-of-stock)
- Query params:
  - `q`: search by name/description
  - `minStock`: integer, default 1
  - `limit`: 1..100, default 12
  - `page`: pagination page
- Response (paginated):
```json
{
  "data": [
    {"id":"<uuid>","name":"...","description":"...","price":12.5,"stock":10,"category_id":"<uuid>"}
  ],
  "current_page":1,
  "last_page":3,
  "per_page":12,
  "total":34
}
```

## GET /tenants/{tenantId}/public/products/{productId}
- Returns a single published product by ID
- 404 if product not found or not published

## Product Publishing Rules
- `products.status` is a string enum: `draft | published | archived` (default `draft`)
- Public endpoints only return `status = "published"`
- Optionally filter out products with `stock < minStock` (defaults to 1)

## Implementation Notes
- Controller: `App\Http\Controllers\Api\PublicContentController`
- Service (business logic): `Src\Pms\Core\Application\Services\PublicContentService`
- Model: `Src\Pms\Infrastructure\Models\Product` includes `status`
- Seeder: `Database\Seeders\DummyDataSeeder` sets ~60–70% products to `published`
