# Debug: Error 422 pada Customer Creation

## Temuan Awal
Test diagnostik dependency injection **BERHASIL** ✅
Namun test asli mengalami error **422 Unprocessable Entity**

## Test Diagnostik untuk Melihat Error Detail

Tambahkan test method berikut ke `tests/Feature/CustomersApiTest.php`:

```php
/** @test */
public function test_customer_creation_error_details(): void
{
    $customerData = [
        'name' => 'Test Customer',
        'email' => 'customer@test.com',
        'phone' => '08123456789',
        'address' => 'Test Address',
        'tags' => ['VIP', 'Regular']
    ];

    $response = $this->postJson(
        "/api/v1/tenants/{$this->tenant->id}/customers",
        $customerData,
        $this->authenticatedRequest()['headers']
    );

    // Lihat response body untuk error detail
    dump('Status Code:', $response->getStatusCode());
    dump('Response Body:', $response->json());
    dump('Response Headers:', $response->headers->all());

    // Jangan assert, biarkan error terjadi untuk melihat detail
    // $response->assertCreated();
}
```

## Jalankan Test dan Analisis Output

```bash
php artisan test --filter=test_customer_creation_error_details
```

## Kemungkinan Penyebab Error 422

Berdasarkan response body, kemungkinan masalahnya adalah:

### 1. **Authorization Issues**
- User tidak memiliki permission `customers.create`
- CustomerPolicy menolak request
- Middleware authentication bermasalah

### 2. **Validation Issues**
- Field `name` kosong atau tidak valid
- Field `email` format salah
- Field `phone` tidak memenuhi format
- Custom validation rules tidak terpenuhi

### 3. **Request Format Issues**
- Headers tidak lengkap
- Content-Type salah
- JSON format bermasalah

### 4. **Middleware Issues**
- CSRF token missing
- Rate limiting aktif
- Request size terlalu besar

## Perbaikan Berdasarkan Error

Setelah melihat response body, kita bisa memberikan solusi spesifik:

### Jika Authorization Error:
```php
// Pastikan permission di TenantTestTrait lengkap
$this->user->givePermissionTo([
    'customers.view', 'customers.create', 'customers.update', 'customers.delete'
]);
```

### Jika Validation Error:
```php
// Perbaiki data yang dikirim
$customerData = [
    'name' => 'Test Customer', // required, min 1 karakter
    'email' => 'customer@test.com', // valid email format
    'phone' => '08123456789', // valid phone format
    // address dan tags optional
];
```

### Jika Middleware Error:
```php
// Pastikan headers lengkap
$headers = [
    'Authorization' => 'Bearer ' . $this->token,
    'Accept' => 'application/json',
    'Content-Type' => 'application/json',
    'X-Requested-With' => 'XMLHttpRequest', // jika perlu
];