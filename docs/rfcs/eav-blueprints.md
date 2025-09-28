# RFC: Dynamic EAV Engine with Business Blueprints (Phase 1)

## Goals
- Enable tenant-scoped dynamic attributes using blueprint-driven definitions.
- Start with Customers as the first target entity for POC.
- Preserve authorization model: Spatie Teams, guard_name=api, tenant_id scoping.

## Non-Goals (Phase 1)
- UI builder for blueprints (manual JSON payloads acceptable initially).
- Cross-tenant/global blueprints.
- Complex computed fields or cross-entity references.

## Terminology
- **Blueprint**: A tenant-defined schema for a target entity (e.g., customer).
- **Field**: A typed attribute definition within a blueprint.
- **Attribute Values**: Per-entity values keyed by field.
- **Target Entity**: Domain entity receiving attributes; POC: `customer`.

## Field Types (initial)
- `string`, `text`, `number`, `boolean`, `date`, `enum`, `json`.

## Validation Rules
- `required`, `min/max` (number/length), `pattern` (string), `enum` options, `uniquePerTenant` (optional, future).

## Data Model (PostgreSQL)

### Tables
- eav_blueprints
  - id uuid (pk)
  - tenant_id uuid (indexed)
  - target_entity text (e.g., 'customer')
  - name text
  - status text default 'active'
  - created_at, updated_at

- eav_fields
  - id uuid (pk)
  - tenant_id uuid (indexed)
  - blueprint_id uuid (fk -> eav_blueprints.id on delete cascade)
  - key text
  - label text
  - type text check in ('string','text','number','boolean','date','enum','json')
  - required boolean default false
  - options jsonb null -- for enum list or extra constraints
  - sort_order int default 0
  - created_at, updated_at
  - unique (tenant_id, blueprint_id, key)

- eav_values
  - tenant_id uuid not null
  - blueprint_id uuid not null
  - entity_type text not null -- 'customer'
  - entity_id uuid not null
  - field_id uuid not null
  - value_text text null
  - value_number numeric null
  - value_boolean boolean null
  - value_date date null
  - value_jsonb jsonb null
  - created_at, updated_at
  - primary key (tenant_id, entity_type, entity_id, field_id)
  - index (tenant_id, entity_type, entity_id)
  - index (tenant_id, field_id)

### Notes
- Single table for values with typed columns for indexability.
- entity_type kept to allow reuse for other entities later.

## API (Draft)
All endpoints are under `/api/v1/tenants/{tenantId}` with `auth:api` and team-context middleware.

### Blueprints
- GET `/blueprints?target=customer`
  - Returns list of blueprints for target.
- POST `/blueprints`
  - { target: 'customer', name, fields: Field[] }
- GET `/blueprints/{id}`
- PATCH `/blueprints/{id}`
- POST `/blueprints/{id}/fields`
  - Add/update/delete fields by array diff; or minimal: add one field at a time.

### Customer Attributes
- GET `/customers/{customerId}/attributes`
  - Returns: { attributes: { [fieldKey]: value }, blueprintId }
- PUT `/customers/{customerId}/attributes`
  - Body: { attributes: { [fieldKey]: value } }

### Schemas (conceptual)
- Field: { id, key, label, type, required, options?, sort_order }
- Blueprint: { id, target, name, status, fields: Field[] }
- AttributesMap: { [key: string]: string|number|boolean|string[]|object|null }

## Permissions
- blueprints.view, blueprints.create, blueprints.update
- customers.attributes.view, customers.attributes.update
- Enforced via policies; HQ bypass via Gate::before as per repo rules.

## Services (Core)
- BlueprintService
  - listByTarget(tenantId, target)
  - create(tenantId, dto)
  - update(tenantId, id, dto)
  - upsertFields(tenantId, blueprintId, fields[])
- AttributeService
  - getForEntity(tenantId, entityType, entityId) -> {blueprintId, attributes}
  - putForEntity(tenantId, entityType, entityId, attributes)

## Controllers (API)
- BlueprintsController
  - index, store, show, update
  - addField (POST /blueprints/{id}/fields)
- CustomerAttributesController
  - show (GET), put (PUT)

## Routing
- In `routes/api.php` under tenants/{tenantId} group.

## Open Questions
- Enforce one active blueprint per target per tenant? (Y for Phase 1)
- Do we need versioning of blueprints? (Not in Phase 1)

## POC Scope
- Seed one blueprint for `customer` with 2-3 fields (phone:string, birthday:date, vip:boolean).
- Implement GET/PUT attributes for customers.
- Minimal validation/coercion per type.

## Testing
- Unit: type coercion and upsert behavior.
- Feature: permissions and team context enforcement.
