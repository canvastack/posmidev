# Sanctum Auth Crash Playbook

## Ringkasan
- Gejala: Panggilan ke endpoint yang dilindungi `auth:sanctum` menyebabkan koneksi terputus/HTML error. Endpoint publik berfungsi normal.
- Status sekarang: 
  - Unauth request → 401 JSON (OK)
  - Auth request → 200 JSON (OK)
- Akar masalah yang teridentifikasi:
  - Redirect ke route `login` pada unauthenticated API → HTML error + logger gagal.
  - Guard Sanctum dapat memicu resolusi berulang (recursive) jika tidak dikonfigurasi hati-hati.
  - Trait pada model `User` (BelongsToTenant/HasRoles) berpotensi memicu crash saat boot model.

## Tanda & Bukti
- `/api/v1/ping` (tanpa auth) → 200 JSON.
- `/api/v1/ping-auth` (dengan `auth:api`) → sebelumnya memutus koneksi/HTML error; kini:
  - Unauthenticated: 401 JSON `{"message":"Unauthenticated."}`
  - Authenticated: 200 JSON `{"ok":true,"userId":"..."}`
- Log sebelumnya:
  - `Route [login] not defined` (dipicu oleh handler default untuk unauthenticated)
  - `Log [file] is not defined` (konfigurasi logger invalid)
- Saat mengaktifkan `BelongsToTenant`:
  - `Trait "Src\Pms\Core\Domain\Traits\BelongsToTenant" not found` (fatal)

## Perubahan yang Diterapkan
1) Handler unauthenticated API → JSON 401
- File: `app/Exceptions/Handler.php`
- Tambahan override:
```php
protected function unauthenticated($request, AuthenticationException $exception)
{
    if ($request->is('api/*') || $request->expectsJson() || $request->wantsJson()) {
        return response()->json(['message' => 'Unauthenticated.'], 401);
    }
    return response('Unauthenticated.', 401);
}
```

2) Logger valid
- `.env`: `LOG_CHANNEL=single` (mengganti `file`)

3) Hindari resolusi guard berulang oleh Sanctum
- `config/sanctum.php`:
```php
'guard' => [], // biarkan kosong untuk API bearer token
```

4) Rate limiter tidak menyentuh `$request->user()`
- Pastikan rate limiter `api` key menggunakan IP saja (sudah diterapkan di `RouteServiceProvider` pada iterasi sebelumnya).

5) Rute diagnostik
- `routes/api.php` menambahkan:
  - `/v1/ping` (publik)
  - `/v1/guard-check` (cek guard terkendali)
  - `/v1/ping-auth` (dalam group `auth:api`) menampilkan `userId`

## Prosedur Validasi
1) Clear cache & restart server
```powershell
php artisan optimize:clear
php artisan serve --host=127.0.0.1 --port=9000
```
2) Uji unauthenticated
```powershell
curl.exe -i http://127.0.0.1:9000/api/v1/ping-auth
# Harus: HTTP/1.1 401 dan {"message":"Unauthenticated."}
```
3) Uji authenticated
```powershell
# Login dapatkan token, lalu:
curl.exe -i -H "Authorization: Bearer <TOKEN>" http://127.0.0.1:9000/api/v1/ping-auth
# Harus: HTTP/1.1 200 dan {"ok":true,"userId":"..."}
```

## Prosedur Isolasi Trait pada Model User
Tujuan: menemukan trait yang memicu crash saat auth middleware mem-boot model `User`.

Urutan rekomendasi:
1) Minimal (aktif): `use Notifiable, HasApiTokens`
2) Tambahkan `HasUuids` → uji.
3) Tambahkan `BelongsToTenant` → uji.
4) Tambahkan `HasRoles` (Spatie) → uji.

Jika crash muncul pada langkah tertentu → pelakunya trait tersebut. Lanjutkan ke bagian “Remediasi Per Trait”.

## Remediasi Per Trait
### BelongsToTenant
- Error saat ini: `Trait not found` → file/namespace trait tidak ditemukan.
- Perbaikan cepat:
  - Pastikan file trait tersedia pada jalur sesuai namespace: `Src\Pms\Core\Domain\Traits\BelongsToTenant`.
  - Jika trait belum dibuat, gunakan template minimal pada dokumen `docs/belongs-to-tenant-troubleshooting.md`.
  - Jika trait ada tetapi namespace berbeda, sesuaikan `use` di `User.php` atau perbaiki namespace class.

### HasRoles (Spatie)
- Risiko: boot method/guard mismatch dapat memicu error fatal.
- Checklist:
  - `composer.json` sudah memasang `spatie/laravel-permission` dan telah migrasi tabel roles/permissions.
  - `config/permission.php` guard default sesuai penggunaan API (umumnya `web` untuk role assign, tetapi auth API via Sanctum diperbolehkan).
  - Tidak ada akses method roles di `Resource`/`Presenter` tanpa pengecekan ketersediaan method (gunakan guard `method_exists($user, 'getRoleNames')`).

## Pencegahan Jangka Panjang
- Untuk API bearer-only, biarkan `sanctum.guard` kosong agar Sanctum langsung memakai Bearer token tanpa recursive guard.
- Jangan gunakan `$request->user()` sebagai key rate limiter.
- Pastikan handler unauthenticated API selalu mengembalikan 401 JSON, bukan redirect.
- Konsisten menjaga `morphMap` untuk `tokenable_type` user (lihat `AppServiceProvider` setup) saat mengubah namespace model.
- Tambahkan uji fitur:
  - Unauthenticated API returns JSON 401 (tanpa redirect/login route lookup).
  - Valid bearer token mengembalikan user.
  - Token `tokenable_type` berfungsi pada namespace model saat ini.

## Rujukan File (Saat Dokumen Ini Dibuat)
- `app/Exceptions/Handler.php` (override unauthenticated)
- `.env` (`LOG_CHANNEL=single`)
- `config/sanctum.php` (`'guard' => []`)
- `routes/api.php` (diagnostik routes)
- `src/Pms/Infrastructure/Models/User.php` (aktif/disable traits bertahap)
- `app/Providers/AppServiceProvider.php` (morphMap untuk User)

## Troubleshooting Cepat
- Mendapat HTML lagi? Cek ulang `Handler::unauthenticated` dan APP_DEBUG.
- Log tidak muncul? Pastikan `LOG_CHANNEL=single` dan `php artisan config:clear`.
- Token valid tapi `userId` null? Cek `personal_access_tokens.tokenable_type` cocok dengan morphMap dan model saat ini.