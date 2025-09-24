# BelongsToTenant Troubleshooting

Dokumen ini khusus untuk menangani error saat mengaktifkan trait `BelongsToTenant` pada model `User` atau model lain.

## Gejala yang Terdokumentasi
- Fatal error:
```
Trait "Src\Pms\Core\Domain\Traits\BelongsToTenant" not found
```
- Terjadi saat request ke endpoint yang mem-boot model `User` melalui middleware auth (`auth:api`/Sanctum), misal `/api/v1/ping-auth` dengan Bearer token.

## Penyebab Umum
1) File trait tidak ada di disk sesuai namespace.
2) Namespace/file path tidak sesuai PSR-4 autoload.
3) Trait ada tetapi `composer.json` autoload mapping tidak mencakup root namespace `Src\\` dengan benar.
4) Cache autoload lama (butuh `composer dump-autoload`).

## Checklist Perbaikan
1) Konfirmasi lokasi file
   - Harus ada file di jalur ini (menurut namespace):
     - `src/Pms/Core/Domain/Traits/BelongsToTenant.php`
   - Jika folder belum ada, buat folder secara berjenjang.

2) Isi minimum trait
```php
<?php

namespace Src\Pms\Core\Domain\Traits;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Minimal tenant binding trait. Expand sesuai kebutuhan nanti.
 */
trait BelongsToTenant
{
    // Pastikan kolom tenant_id tersedia di model terkait
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(\Src\Pms\Infrastructure\Models\Tenant::class, 'tenant_id');
    }
}
```

3) Pastikan autoload composer
- `composer.json` seharusnya memiliki map PSR-4 untuk `Src\\` ke `src/`.
- Jika diragukan, jalankan:
```powershell
composer dump-autoload
```

4) Clear cache aplikasi
```powershell
php artisan optimize:clear
```

5) Uji kembali
- Unauth:
```powershell
curl.exe -i http://127.0.0.1:9000/api/v1/ping-auth
# 401 JSON expected
```
- Auth:
```powershell
curl.exe -i -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:9000/api/v1/ping-auth
# 200 JSON expected
```

## Catatan Implementasi
- Trait ini aman secara runtime asalkan hanya mendeklarasikan relasi sederhana dan tidak mengakses service container pada boot awal model.
- Hindari logic berat pada boot/constructor trait yang dapat memicu side-effects saat model di-resolve oleh guard.

## Jika Masih Error
- Pastikan class `Tenant` ada di `Src\Pms\Infrastructure\Models\Tenant` atau sesuaikan FQCN di relasi.
- Laporkan stack trace terbaru; sertakan path file trait serta baris error.