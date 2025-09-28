# API Reference

POSMID provides a comprehensive REST API built with Laravel, following OpenAPI 3.0 specifications. The API is designed for multi-tenant POS operations, including products, orders, customers, and user management.

## Overview

- **Base URL**: `http://localhost:9000/api/v1`
- **Authentication**: Bearer Token (Laravel Sanctum)
- **Format**: JSON
- **OpenAPI Spec**: Available at `/api/documentation`
- **Rate Limiting**: 60 requests per minute for authenticated users

## Authentication

All API requests require authentication except for authentication endpoints.

### Headers Required
```
Authorization: Bearer {token}
Content-Type: application/json
Accept: application/json
```

### Authentication Endpoints

#### Register User
```http
POST /api/v1/register
```

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "password_confirmation": "string"
}
```

**Response (201):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "token": "1|abc123..."
}
```

#### Login
```http
POST /api/v1/login
```

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "roles": ["admin"],
    "permissions": ["products.view", "products.create"]
  },
  "token": "1|abc123..."
}
```

#### Get Current User
```http
GET /api/v1/user
```

**Response (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "tenant_id": 1,
  "roles": ["admin"],
  "permissions": ["products.view", "products.create", "products.update"]
}
```

#### Logout
```http
POST /api/v1/logout
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

## Products API

### List Products
```http
GET /api/v1/tenants/{tenantId}/products
```

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `per_page` (integer): Items per page (default: 15)
- `search` (string): Search term
- `category_id` (integer): Filter by category
- `min_price` (number): Minimum price filter
- `max_price` (number): Maximum price filter
- `sort_by` (string): Sort field (name, price, created_at)
- `sort_direction` (string): Sort direction (asc, desc)

**Permissions Required:** `products.view`

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Coffee",
      "description": "Fresh brewed coffee",
      "price": 3.50,
      "cost_price": 1.50,
      "sku": "COF001",
      "category": {
        "id": 1,
        "name": "Beverages"
      },
      "stock_quantity": 100,
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 50,
    "last_page": 4
  }
}
```

### Create Product
```http
POST /api/v1/tenants/{tenantId}/products
```

**Permissions Required:** `products.create`

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string",
  "price": "number (required)",
  "cost_price": "number",
  "sku": "string",
  "category_id": "integer",
  "stock_quantity": "integer (default: 0)",
  "is_active": "boolean (default: true)"
}
```

**Response (201):**
```json
{
  "id": 1,
  "name": "New Product",
  "price": 10.00,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Get Product
```http
GET /api/v1/tenants/{tenantId}/products/{id}
```

**Permissions Required:** `products.view`

**Response (200):**
```json
{
  "id": 1,
  "name": "Coffee",
  "description": "Fresh brewed coffee",
  "price": 3.50,
  "cost_price": 1.50,
  "sku": "COF001",
  "category": {
    "id": 1,
    "name": "Beverages"
  },
  "stock_quantity": 100,
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Update Product
```http
PUT /api/v1/tenants/{tenantId}/products/{id}
PATCH /api/v1/tenants/{tenantId}/products/{id}
```

**Permissions Required:** `products.update`

**Request Body:** (same as create, all fields optional)

**Response (200):** Updated product object

### Delete Product
```http
DELETE /api/v1/tenants/{tenantId}/products/{id}
```

**Permissions Required:** `products.delete`

**Response (204):** No content

## Categories API

### List Categories
```http
GET /api/v1/tenants/{tenantId}/categories
```

**Permissions Required:** `products.view`

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Beverages",
      "description": "Drinks and beverages",
      "is_active": true,
      "products_count": 25
    }
  ]
}
```

### Create Category
```http
POST /api/v1/tenants/{tenantId}/categories
```

**Permissions Required:** `products.create`

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string",
  "is_active": "boolean (default: true)"
}
```

### Update Category
```http
PUT /api/v1/tenants/{tenantId}/categories/{id}
```

**Permissions Required:** `products.update`

### Delete Category
```http
DELETE /api/v1/tenants/{tenantId}/categories/{id}
```

**Permissions Required:** `products.delete`

## Orders API

### List Orders
```http
GET /api/v1/tenants/{tenantId}/orders
```

**Query Parameters:**
- `page`, `per_page`
- `status` (pending, completed, cancelled)
- `customer_id`
- `date_from`, `date_to`
- `min_total`, `max_total`

**Permissions Required:** `orders.view`

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "order_number": "ORD-001",
      "customer": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "status": "completed",
      "total": 15.50,
      "subtotal": 14.00,
      "tax": 1.50,
      "items": [
        {
          "id": 1,
          "product": {
            "id": 1,
            "name": "Coffee"
          },
          "quantity": 2,
          "price": 3.50,
          "total": 7.00
        }
      ],
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### Create Order
```http
POST /api/v1/tenants/{tenantId}/orders
```

**Permissions Required:** `orders.create`

**Request Body:**
```json
{
  "customer_id": "integer",
  "items": [
    {
      "product_id": "integer (required)",
      "quantity": "integer (required)",
      "price": "number (optional, uses product price if not provided)"
    }
  ],
  "notes": "string"
}
```

**Response (201):**
```json
{
  "id": 1,
  "order_number": "ORD-001",
  "total": 15.50,
  "status": "pending"
}
```

### Update Order
```http
PUT /api/v1/tenants/{tenantId}/orders/{id}
```

**Permissions Required:** `orders.update`

**Request Body:**
```json
{
  "status": "string (pending, completed, cancelled)",
  "notes": "string"
}
```

### Delete Order
```http
DELETE /api/v1/tenants/{tenantId}/orders/{id}
```

**Permissions Required:** `orders.delete`

## Customers API

### List Customers
```http
GET /api/v1/tenants/{tenantId}/customers
```

**Permissions Required:** `customers.view`

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "address": "123 Main St",
      "total_orders": 5,
      "total_spent": 150.00,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create Customer
```http
POST /api/v1/tenants/{tenantId}/customers
```

**Permissions Required:** `customers.create`

**Request Body:**
```json
{
  "name": "string (required)",
  "email": "string (required, unique)",
  "phone": "string",
  "address": "string"
}
```

### Update Customer
```http
PUT /api/v1/tenants/{tenantId}/customers/{id}
```

**Permissions Required:** `customers.update`

### Delete Customer
```http
DELETE /api/v1/tenants/{tenantId}/customers/{id}
```

**Permissions Required:** `customers.delete`

## Stock Adjustments API

### List Stock Adjustments
```http
GET /api/v1/tenants/{tenantId}/stock-adjustments
```

**Permissions Required:** `products.update`

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "product": {
        "id": 1,
        "name": "Coffee"
      },
      "type": "addition",
      "quantity": 50,
      "reason": "New stock received",
      "previous_stock": 100,
      "new_stock": 150,
      "user": {
        "id": 1,
        "name": "Admin User"
      },
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create Stock Adjustment
```http
POST /api/v1/tenants/{tenantId}/stock-adjustments
```

**Permissions Required:** `products.update`

**Request Body:**
```json
{
  "product_id": "integer (required)",
  "type": "string (required: addition, subtraction)",
  "quantity": "integer (required)",
  "reason": "string (required)"
}
```

## Reports API

### Sales Report
```http
GET /api/v1/tenants/{tenantId}/reports/sales
```

**Query Parameters:**
- `date_from` (YYYY-MM-DD)
- `date_to` (YYYY-MM-DD)
- `group_by` (day, week, month)

**Permissions Required:** `system.reports`

**Response (200):**
```json
{
  "summary": {
    "total_sales": 1500.00,
    "total_orders": 150,
    "average_order_value": 10.00
  },
  "data": [
    {
      "date": "2024-01-01",
      "sales": 250.00,
      "orders": 25
    }
  ]
}
```

### Inventory Report
```http
GET /api/v1/tenants/{tenantId}/reports/inventory
```

**Permissions Required:** `system.reports`

**Response (200):**
```json
{
  "summary": {
    "total_products": 100,
    "low_stock_products": 5,
    "out_of_stock_products": 2,
    "total_value": 5000.00
  },
  "data": [
    {
      "product_id": 1,
      "name": "Coffee",
      "current_stock": 50,
      "min_stock": 10,
      "status": "good"
    }
  ]
}
```

## User Management API (Admin Only)

### List Users
```http
GET /api/users
```

**Permissions Required:** `users.view`

### Create User
```http
POST /api/users
```

**Permissions Required:** `users.create`

**Request Body:**
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "password": "string (required)",
  "roles": ["array of role names"]
}
```

### Update User
```http
PUT /api/users/{id}
```

**Permissions Required:** `users.update`

### Assign Roles
```http
POST /api/users/{id}/roles
```

**Permissions Required:** `users.update`

**Request Body:**
```json
{
  "roles": ["admin", "manager"]
}
```

## OpenAPI Specification

POSMID uses OpenAPI 3.0 for API documentation and validation.

### Accessing OpenAPI Documentation

- **JSON Spec**: `GET /api/openapi.json`
- **YAML Spec**: `GET /api/openapi.yaml`
- **Interactive Docs**: `GET /api/documentation` (Swagger UI)

### OpenAPI Validation

The API validates both incoming requests and outgoing responses against the OpenAPI specification.

#### Request Validation
```php
// Automatically validates request body and parameters
// Throws exception if validation fails
```

#### Response Validation
```php
// Automatically validates response format
// Useful for development and testing
```

### Configuration

OpenAPI validation can be configured in `.env`:

```env
OPENAPI_SPEC_PATH=openapi.yaml
OPENAPI_VALIDATE_REQUEST=true
OPENAPI_VALIDATE_RESPONSE=true
```

### Customizing OpenAPI Spec

The OpenAPI specification is defined in `openapi.yaml`. Key sections:

- **Info**: API title, version, description
- **Servers**: Base URLs for different environments
- **Security**: Authentication schemes
- **Paths**: All API endpoints with parameters and responses
- **Components**: Reusable schemas, parameters, responses

### Example OpenAPI Path Definition

```yaml
paths:
  /api/products:
    get:
      summary: List products
      security:
        - bearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
          description: Page number
        - name: search
          in: query
          schema:
            type: string
          description: Search term
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProductList'
        '401':
          $ref: '#/components/responses/Unauthorized'
```

## Error Handling

All API errors follow a consistent format:

```json
{
  "message": "Validation failed",
  "errors": {
    "email": ["The email field is required."],
    "password": ["The password must be at least 8 characters."]
  }
}
```

### Common HTTP Status Codes

- **200**: Success
- **201**: Created
- **204**: No Content
- **400**: Bad Request (validation errors)
- **401**: Unauthorized
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **422**: Unprocessable Entity (validation errors)
- **429**: Too Many Requests (rate limited)
- **500**: Internal Server Error

### Rate Limiting

API endpoints are rate limited:

- **Authenticated Users**: 60 requests per minute
- **Unauthenticated Users**: 30 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1640995200
```

## SDKs and Client Libraries

### JavaScript/TypeScript Client

POSMID provides a TypeScript client for frontend integration:

```typescript
import { PosmidApi } from '@posmid/api-client';

const api = new PosmidApi({
  baseURL: '/api',
  token: 'your-bearer-token'
});

// Usage
const products = await api.products.list({ page: 1 });
const newProduct = await api.products.create({
  name: 'New Product',
  price: 10.00
});
```

### PHP SDK

For server-side integration:

```php
use Posmid\Sdk\ApiClient;

$client = new ApiClient([
    'base_url' => 'https://your-posmid-instance.com/api',
    'token' => 'your-bearer-token'
]);

$products = $client->products()->list(['page' => 1]);
```

## Webhooks

POSMID supports webhooks for real-time notifications:

### Configuring Webhooks

```php
// Register webhook URLs
Webhook::create([
    'url' => 'https://your-app.com/webhooks/posmid',
    'events' => ['order.created', 'product.updated'],
    'secret' => 'webhook-secret'
]);
```

### Supported Events

- `order.created`
- `order.updated`
- `order.completed`
- `product.created`
- `product.updated`
- `product.deleted`
- `customer.created`
- `customer.updated`
- `stock.adjusted`

### Webhook Payload

```json
{
  "event": "order.created",
  "data": {
    "id": 1,
    "order_number": "ORD-001",
    "total": 15.50
  },
  "timestamp": "2024-01-01T10:00:00Z",
  "signature": "sha256=..."
}
```

## API Versioning

POSMID uses URL-based versioning:

- **Current Version**: `v1` (`/api/v1/`)
- **Future Versions**: Will be added as `/api/v2/`, etc.

### Version Compatibility

- Breaking changes will result in new major versions
- New features are added to existing versions when possible
- Deprecation warnings are provided before removing features

## Testing the API

### Using cURL

```bash
# Login
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get products (replace TOKEN with actual token)
curl -X GET http://localhost:8000/api/products \
  -H "Authorization: Bearer TOKEN"
```

### Using Postman

Import the OpenAPI specification into Postman for easy testing:

1. Go to `http://localhost:8000/api/openapi.yaml`
2. Copy the YAML content
3. In Postman, click "Import" > "Paste Raw Text"
4. Set authentication to "Bearer Token" in Authorization tab

### Using Laravel Test Suite

```php
<?php

namespace Tests\Feature\Api;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_products()
    {
        $user = User::factory()->create();
        $token = $user->createToken('Test');

        Product::factory()->count(3)->create();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
        ])->get('/api/products');

        $response->assertOk()
                ->assertJsonCount(3, 'data');
    }
}
```

## Next Steps

- [Commands](commands.md) - Custom Artisan commands
- [Testing](testing.md) - API testing guidelines
- [Deployment](deployment.md) - API deployment considerations

---

[← Authorization](authorization.md) | [Commands →](commands.md)