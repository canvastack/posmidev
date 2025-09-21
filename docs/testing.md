# Testing

POSMID includes comprehensive testing suites covering unit tests, feature tests, and API tests. The testing framework is built on PHPUnit with Laravel's testing helpers, ensuring reliable and maintainable test suites.

## Overview

POSMID testing covers:

- **Unit Tests**: Individual components and classes
- **Feature Tests**: End-to-end functionality including HTTP requests
- **API Tests**: REST API endpoints with authentication
- **Database Tests**: Model relationships and database operations
- **Authorization Tests**: Permission and role-based access control

## Test Structure

### Directory Structure
```
tests/
├── CreatesApplication.php          # Base test setup
├── TestCase.php                    # Custom test case class
├── Unit/                          # Unit tests
│   ├── ProductEntityTest.php      # Entity unit tests
│   └── ...
├── Feature/                       # Feature tests
│   ├── AuthTest.php               # Authentication tests
│   ├── ProductTest.php            # Product feature tests
│   └── ...
└── Api/                           # API-specific tests (recommended)
    ├── ProductsTest.php
    ├── OrdersTest.php
    └── ...
```

### Test Configuration

**phpunit.xml.dist:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="./vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true">
    <testsuites>
        <testsuite name="Unit">
            <directory suffix="Test.php">./tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory suffix="Test.php">./tests/Feature</directory>
        </testsuite>
    </testsuites>
    <coverage processUncoveredFiles="true">
        <include>
            <directory suffix=".php">./app</directory>
        </include>
    </coverage>
    <php>
        <env name="APP_ENV" value="testing"/>
        <env name="BCRYPT_ROUNDS" value="4"/>
        <env name="CACHE_STORE" value="array"/>
        <env name="DB_CONNECTION" value="sqlite"/>
        <env name="DB_DATABASE" value=":memory:"/>
        <env name="MAIL_MAILER" value="array"/>
        <env name="QUEUE_CONNECTION" value="sync"/>
        <env name="SESSION_DRIVER" value="array"/>
    </php>
</phpunit>
```

## Running Tests

### Basic Commands

```bash
# Run all tests
php artisan test

# Run specific test suite
php artisan test --testsuite=Unit
php artisan test --testsuite=Feature

# Run specific test file
php artisan test tests/Unit/ProductEntityTest.php

# Run specific test method
php artisan test --filter=test_user_can_create_product

# Run with coverage
php artisan test --coverage

# Run with verbose output
php artisan test -v
```

### Parallel Testing

```bash
# Install parallel testing
composer require brianium/paratest

# Run tests in parallel
php artisan test --parallel

# Specify number of processes
php artisan test --parallel=4
```

### Test Results

Example output:
```
PASS  Tests\Unit\ProductEntityTest::test_product_has_required_attributes
PASS  Tests\Feature\AuthTest::test_user_can_login
PASS  Tests\Feature\ProductTest::test_user_can_create_product
PASS  Tests\Feature\ProductTest::test_user_can_list_products

Tests: 4 passed, 0 failed
Time: 1.23s
```

## Unit Testing

### Model Testing

**tests/Unit/ProductTest.php:**
```php
<?php

namespace Tests\Unit;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_has_required_attributes()
    {
        $product = Product::factory()->create([
            'name' => 'Test Product',
            'price' => 10.00,
        ]);

        $this->assertEquals('Test Product', $product->name);
        $this->assertEquals(10.00, $product->price);
        $this->assertTrue($product->is_active);
    }

    public function test_product_belongs_to_category()
    {
        $product = Product::factory()->create();

        $this->assertInstanceOf(\App\Models\Category::class, $product->category);
    }

    public function test_product_has_fillable_attributes()
    {
        $product = new Product();
        $fillable = ['name', 'description', 'price', 'sku', 'category_id'];

        foreach ($fillable as $attribute) {
            $this->assertContains($attribute, $product->getFillable());
        }
    }

    public function test_product_price_is_cast_to_float()
    {
        $product = Product::factory()->create(['price' => '15.50']);

        $this->assertIsFloat($product->price);
        $this->assertEquals(15.50, $product->price);
    }
}
```

### Service Layer Testing

**tests/Unit/ProductServiceTest.php:**
```php
<?php

namespace Tests\Unit;

use App\Services\ProductService;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductServiceTest extends TestCase
{
    use RefreshDatabase;

    protected ProductService $productService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->productService = app(ProductService::class);
    }

    public function test_can_create_product()
    {
        $data = [
            'name' => 'New Product',
            'price' => 25.00,
            'category_id' => 1,
        ];

        $product = $this->productService->create($data);

        $this->assertInstanceOf(Product::class, $product);
        $this->assertEquals('New Product', $product->name);
        $this->assertEquals(25.00, $product->price);
    }

    public function test_can_update_product_stock()
    {
        $product = Product::factory()->create(['stock_quantity' => 10]);

        $this->productService->adjustStock($product, 5, 'addition');

        $this->assertEquals(15, $product->fresh()->stock_quantity);
    }
}
```

### Entity Testing

**tests/Unit/ProductEntityTest.php:**
```php
<?php

namespace Tests\Unit;

use App\Entities\ProductEntity;
use Tests\TestCase;

class ProductEntityTest extends TestCase
{
    public function test_product_entity_creation()
    {
        $data = [
            'name' => 'Test Product',
            'price' => 10.00,
            'sku' => 'TEST001',
        ];

        $entity = new ProductEntity($data);

        $this->assertEquals('Test Product', $entity->getName());
        $this->assertEquals(10.00, $entity->getPrice());
        $this->assertEquals('TEST001', $entity->getSku());
    }

    public function test_product_entity_validation()
    {
        $this->expectException(\InvalidArgumentException::class);

        // Should fail with empty name
        new ProductEntity([
            'name' => '',
            'price' => 10.00,
        ]);
    }

    public function test_product_entity_to_array()
    {
        $data = [
            'name' => 'Test Product',
            'price' => 10.00,
        ];

        $entity = new ProductEntity($data);
        $array = $entity->toArray();

        $this->assertIsArray($array);
        $this->assertEquals('Test Product', $array['name']);
        $this->assertEquals(10.00, $array['price']);
    }
}
```

## Feature Testing

### Authentication Testing

**tests/Feature/AuthTest.php:**
```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register()
    {
        $userData = [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ];

        $response = $this->post('/api/register', $userData);

        $response->assertCreated()
                ->assertJsonStructure([
                    'user' => ['id', 'name', 'email'],
                    'token'
                ]);

        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
            'name' => 'Test User',
        ]);
    }

    public function test_user_can_login_with_valid_credentials()
    {
        $user = User::factory()->create([
            'email' => 'user@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->post('/api/login', [
            'email' => 'user@example.com',
            'password' => 'password123',
        ]);

        $response->assertOk()
                ->assertJsonStructure([
                    'user' => ['id', 'name', 'email', 'roles', 'permissions'],
                    'token'
                ]);
    }

    public function test_user_cannot_login_with_invalid_credentials()
    {
        $user = User::factory()->create();

        $response = $this->post('/api/login', [
            'email' => $user->email,
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['email']);
    }

    public function test_authenticated_user_can_get_profile()
    {
        $user = User::factory()->create();
        $token = $user->createToken('Test Token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
        ])->get('/api/user');

        $response->assertOk()
                ->assertJson([
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ]);
    }

    public function test_unauthenticated_user_cannot_access_protected_route()
    {
        $response = $this->get('/api/user');

        $response->assertUnauthorized();
    }
}
```

### Product API Testing

**tests/Feature/ProductTest.php:**
```php
<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->user->givePermissionTo('products.view', 'products.create');
        $this->token = $this->user->createToken('Test Token')->plainTextToken;
    }

    public function test_user_can_list_products()
    {
        Product::factory()->count(3)->create();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->get('/api/products');

        $response->assertOk()
                ->assertJsonCount(3, 'data')
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id', 'name', 'price', 'category', 'is_active'
                        ]
                    ],
                    'meta' => ['current_page', 'per_page', 'total']
                ]);
    }

    public function test_user_can_create_product()
    {
        $productData = [
            'name' => 'New Product',
            'description' => 'Product description',
            'price' => 25.50,
            'sku' => 'NEW001',
            'category_id' => 1,
            'stock_quantity' => 100,
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->post('/api/products', $productData);

        $response->assertCreated()
                ->assertJson([
                    'name' => 'New Product',
                    'price' => 25.50,
                    'sku' => 'NEW001',
                ]);

        $this->assertDatabaseHas('products', [
            'name' => 'New Product',
            'sku' => 'NEW001',
        ]);
    }

    public function test_user_can_update_product()
    {
        $product = Product::factory()->create([
            'name' => 'Original Name',
            'price' => 10.00,
        ]);

        $updateData = [
            'name' => 'Updated Name',
            'price' => 15.00,
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->put("/api/products/{$product->id}", $updateData);

        $response->assertOk()
                ->assertJson([
                    'name' => 'Updated Name',
                    'price' => 15.00,
                ]);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'name' => 'Updated Name',
        ]);
    }

    public function test_user_can_delete_product()
    {
        $product = Product::factory()->create();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->delete("/api/products/{$product->id}");

        $response->assertNoContent();

        $this->assertSoftDeleted($product);
    }

    public function test_user_cannot_create_product_without_permission()
    {
        $userWithoutPermission = User::factory()->create();
        $token = $userWithoutPermission->createToken('Test Token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->post('/api/products', [
            'name' => 'Test Product',
            'price' => 10.00,
        ]);

        $response->assertForbidden();
    }

    public function test_product_creation_validation()
    {
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->post('/api/products', [
            'name' => '', // Invalid: empty name
            'price' => 'not-a-number', // Invalid: not numeric
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['name', 'price']);
    }
}
```

## Authorization Testing

### Permission Testing

**tests/Feature/AuthorizationTest.php:**
```php
<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_access_all_endpoints()
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $token = $admin->createToken('Test Token');

        // Test various endpoints
        $endpoints = [
            '/api/products',
            '/api/users',
            '/api/roles',
        ];

        foreach ($endpoints as $endpoint) {
            $response = $this->withHeaders([
                'Authorization' => 'Bearer ' . $token->plainTextToken,
            ])->get($endpoint);

            // Should not be forbidden
            $this->assertNotEquals(403, $response->getStatusCode());
        }
    }

    public function test_cashier_has_limited_access()
    {
        $cashier = User::factory()->create();
        $cashier->assignRole('cashier');
        $token = $cashier->createToken('Test Token');

        // Can access products
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
        ])->get('/api/products');

        $response->assertOk();

        // Cannot access users
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
        ])->get('/api/users');

        $response->assertForbidden();
    }

    public function test_user_cannot_update_product_without_permission()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('products.view'); // Only view permission
        $token = $user->createToken('Test Token');

        $product = Product::factory()->create();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
        ])->put("/api/products/{$product->id}", [
            'name' => 'Updated Name',
        ]);

        $response->assertForbidden();
    }
}
```

## API Testing with OpenAPI

### OpenAPI Validation Testing

**tests/Feature/OpenApiValidationTest.php:**
```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OpenApiValidationTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_responses_match_openapi_spec()
    {
        $user = User::factory()->create();
        $token = $user->createToken('Test Token');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
        ])->get('/api/products');

        // Check response structure matches OpenAPI spec
        $response->assertOk()
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'name',
                            'price',
                            'category' => [
                                'id',
                                'name'
                            ],
                            'is_active',
                            'created_at'
                        ]
                    ],
                    'meta' => [
                        'current_page',
                        'per_page',
                        'total',
                        'last_page'
                    ]
                ]);
    }

    public function test_create_product_request_matches_openapi_spec()
    {
        $user = User::factory()->create();
        $user->givePermissionTo('products.create');
        $token = $user->createToken('Test Token');

        $productData = [
            'name' => 'Test Product',
            'price' => 10.00,
            'description' => 'Test description',
            'category_id' => 1,
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token->plainTextToken,
        ])->post('/api/products', $productData);

        $response->assertCreated()
                ->assertJsonStructure([
                    'id',
                    'name',
                    'price',
                    'description',
                    'category_id',
                    'created_at',
                    'updated_at'
                ]);
    }
}
```

## Database Testing

### Model Factory Testing

**database/factories/ProductFactory.php:**
```php
<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition()
    {
        return [
            'name' => $this->faker->words(3, true),
            'description' => $this->faker->paragraph(),
            'price' => $this->faker->randomFloat(2, 1, 1000),
            'cost_price' => $this->faker->randomFloat(2, 0.5, 500),
            'sku' => $this->faker->unique()->regexify('[A-Z]{3}[0-9]{3}'),
            'category_id' => Category::factory(),
            'stock_quantity' => $this->faker->numberBetween(0, 1000),
            'is_active' => $this->faker->boolean(90), // 90% chance of being active
            'created_at' => $this->faker->dateTimeBetween('-1 year'),
            'updated_at' => $this->faker->faker->dateTimeBetween('-1 month'),
        ];
    }

    public function inactive()
    {
        return $this->state(function (array $attributes) {
            return [
                'is_active' => false,
            ];
        });
    }

    public function lowStock()
    {
        return $this->state(function (array $attributes) {
            return [
                'stock_quantity' => $this->faker->numberBetween(1, 10),
            ];
        });
    }
}
```

### Migration Testing

**tests/Feature/MigrationTest.php:**
```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class MigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_products_table_has_expected_columns()
    {
        $this->assertTrue(Schema::hasTable('products'));

        $columns = Schema::getColumnListing('products');

        $expectedColumns = [
            'id', 'name', 'description', 'price', 'cost_price',
            'sku', 'category_id', 'stock_quantity', 'is_active',
            'created_at', 'updated_at'
        ];

        foreach ($expectedColumns as $column) {
            $this->assertContains($column, $columns);
        }
    }

    public function test_users_table_has_tenant_relationship()
    {
        $this->assertTrue(Schema::hasTable('users'));
        $this->assertTrue(Schema::hasColumn('users', 'tenant_id'));
    }

    public function test_permission_tables_exist()
    {
        $tables = [
            'permissions',
            'roles',
            'model_has_permissions',
            'model_has_roles',
            'role_has_permissions'
        ];

        foreach ($tables as $table) {
            $this->assertTrue(Schema::hasTable($table));
        }
    }
}
```

## Test Utilities

### Custom Test Case

**tests/TestCase.php:**
```php
<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use App\Models\User;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function createUserWithPermissions(array $permissions = []): User
    {
        $user = User::factory()->create();

        if (!empty($permissions)) {
            $user->givePermissionTo($permissions);
        }

        return $user;
    }

    protected function createAuthenticatedUser(array $permissions = []): array
    {
        $user = $this->createUserWithPermissions($permissions);
        $token = $user->createToken('Test Token')->plainTextToken;

        return [$user, $token];
    }

    protected function apiHeaders(string $token): array
    {
        return [
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ];
    }

    protected function assertJsonApiResponse($response, int $status = 200)
    {
        $response->assertStatus($status)
                ->assertHeader('Content-Type', 'application/json');
    }
}
```

### Test Traits

**tests/Traits/ApiTestTrait.php:**
```php
<?php

namespace Tests\Traits;

use App\Models\User;

trait ApiTestTrait
{
    protected function authenticateUser(User $user = null): string
    {
        $user = $user ?? User::factory()->create();
        return $user->createToken('Test Token')->plainTextToken;
    }

    protected function apiGet(string $endpoint, string $token = null, array $headers = [])
    {
        $token = $token ?? $this->authenticateUser();
        return $this->withHeaders(array_merge([
            'Authorization' => 'Bearer ' . $token,
        ], $headers))->get($endpoint);
    }

    protected function apiPost(string $endpoint, array $data = [], string $token = null)
    {
        $token = $token ?? $this->authenticateUser();
        return $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->post($endpoint, $data);
    }

    protected function apiPut(string $endpoint, array $data = [], string $token = null)
    {
        $token = $token ?? $this->authenticateUser();
        return $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->put($endpoint, $data);
    }

    protected function apiDelete(string $endpoint, string $token = null)
    {
        $token = $token ?? $this->authenticateUser();
        return $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->delete($endpoint);
    }
}
```

## Continuous Integration

### GitHub Actions Example

**.github/workflows/tests.yml:**
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          extensions: pdo, pdo_pgsql

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install PHP dependencies
        run: composer install --no-progress --prefer-dist --optimize-autoloader

      - name: Install Node.js dependencies
        run: npm ci

      - name: Build frontend
        run: npm run build

      - name: Copy environment file
        run: cp .env.ci .env

      - name: Generate application key
        run: php artisan key:generate

      - name: Run migrations
        run: php artisan migrate --force

      - name: Run tests
        run: php artisan test --coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
```

## Performance Testing

### Load Testing with Artillery

**tests/performance/products.yml:**
```yaml
config:
  target: 'http://localhost:8000'
  phases:
    - duration: 60
      arrivalRate: 10
  defaults:
    headers:
      Authorization: 'Bearer {{token}}'

scenarios:
  - name: 'List products'
    weight: 70
    requests:
      - get:
          url: '/api/products'

  - name: 'Create product'
    weight: 20
    requests:
      - post:
          url: '/api/products'
          json:
            name: 'Load Test Product {{ $randomInt }}'
            price: '{{ $randomInt }}'
            category_id: 1

  - name: 'Update product'
    weight: 10
    requests:
      - put:
          url: '/api/products/1'
          json:
            name: 'Updated Product {{ $randomInt }}'
```

### Database Performance Testing

**tests/Performance/DatabasePerformanceTest.php:**
```php
<?php

namespace Tests\Performance;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DatabasePerformanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_listing_performance()
    {
        // Create test data
        Product::factory()->count(1000)->create();

        $startTime = microtime(true);

        $response = $this->get('/api/products?per_page=100');

        $endTime = microtime(true);
        $executionTime = $endTime - $startTime;

        $response->assertOk();

        // Should complete within 500ms
        $this->assertLessThan(0.5, $executionTime,
            "Product listing took {$executionTime}s, expected less than 0.5s");
    }

    public function test_database_query_optimization()
    {
        Product::factory()->count(100)->create();

        // Test N+1 query problem
        $startTime = microtime(true);

        $products = Product::with('category')->get();

        // Access category relationship for each product
        foreach ($products as $product) {
            $categoryName = $product->category->name;
        }

        $endTime = microtime(true);
        $executionTime = $endTime - $startTime;

        // Should be fast with eager loading
        $this->assertLessThan(0.1, $executionTime);
    }
}
```

## Next Steps

- [Deployment](deployment.md) - Deploying tested code
- [Troubleshooting](troubleshooting.md) - Fixing test issues
- [Contributing](contributing.md) - Contributing with tests

---

[← Commands](commands.md) | [Deployment →](deployment.md)