# Debug: CustomerService Dependency Injection Issue

## Test Diagnostik untuk Service Container Resolution

Tambahkan test method berikut ke `tests/Feature/CustomersApiTest.php`:

```php
/** @test */
public function test_service_container_resolution_diagnostic(): void
{
    try {
        // Test 1: Coba resolve TransactionManagerInterface
        $transactionManager = app(\Src\Pms\Core\Domain\Contracts\TransactionManagerInterface::class);
        $this->assertInstanceOf(\Src\Pms\Infrastructure\Support\EloquentTransactionManager::class, $transactionManager);
        dump('✓ TransactionManagerInterface berhasil di-resolve');

        // Test 2: Coba resolve CustomerRepositoryInterface
        $customerRepository = app(\Src\Pms\Core\Domain\Repositories\CustomerRepositoryInterface::class);
        $this->assertInstanceOf(\Src\Pms\Infrastructure\Repositories\EloquentCustomerRepository::class, $customerRepository);
        dump('✓ CustomerRepositoryInterface berhasil di-resolve');

        // Test 3: Coba resolve CustomerService
        $customerService = app(\Src\Pms\Core\Application\Services\CustomerService::class);
        $this->assertInstanceOf(\Src\Pms\Core\Application\Services\CustomerService::class, $customerService);
        dump('✓ CustomerService berhasil di-resolve');

        // Test 4: Coba resolve CustomerController
        $customerController = app(\App\Http\Controllers\Api\CustomerController::class);
        $this->assertInstanceOf(\App\Http\Controllers\Api\CustomerController::class, $customerController);
        dump('✓ CustomerController berhasil di-resolve');

    } catch (\Throwable $e) {
        dump('✗ Error terjadi: ' . $e->getMessage());
        dump('Stack trace: ' . $e->getTraceAsString());
        throw $e;
    }
}
```

## Jalankan Test dan Perhatikan Output

Jalankan test ini dengan:
```bash
php artisan test --filter=test_service_container_resolution_diagnostic
```

## Kemungkinan Error yang Akan Terjadi

1. **Class not found**: Namespace atau autoloading bermasalah
2. **Binding not found**: Service provider tidak register binding dengan benar
3. **Dependency resolution failed**: Constructor dependency tidak bisa di-resolve

## Perbaikan Berdasarkan Error

### Jika TransactionManagerInterface tidak ditemukan:
Pastikan binding di `AppServiceProvider.php`:
```php
$this->app->bind(
    \Src\Pms\Core\Domain\Contracts\TransactionManagerInterface::class,
    \Src\Pms\Infrastructure\Support\EloquentTransactionManager::class
);
```

### Jika CustomerRepositoryInterface tidak ditemukan:
Pastikan binding di `AppServiceProvider.php`:
```php
$this->app->bind(
    \Src\Pms\Core\Domain\Repositories\CustomerRepositoryInterface::class,
    \Src\Pms\Infrastructure\Repositories\EloquentCustomerRepository::class
);
```

### Jika masih error setelah binding benar:
Coba clear cache dan regenerate autoloader:
```bash
composer dump-autoload
php artisan config:clear
php artisan cache:clear