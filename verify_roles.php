<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "Checking roles with NULL tenant_id:\n";
$count = DB::table('roles')->whereNull('tenant_id')->count();
echo "Global roles (NULL tenant_id): {$count}\n";

echo "Total roles: " . DB::table('roles')->count() . "\n";
echo "Roles with tenant_id: " . DB::table('roles')->whereNotNull('tenant_id')->count() . "\n";

echo "\nSample roles with tenant_id:\n";
$roles = DB::table('roles')->whereNotNull('tenant_id')->limit(5)->get();
foreach ($roles as $role) {
    echo "Role: {$role->name}, Tenant ID: {$role->tenant_id}\n";
}

echo "\nGlobal roles (NULL tenant_id):\n";
$globalRoles = DB::table('roles')->whereNull('tenant_id')->get();
foreach ($globalRoles as $role) {
    echo "Role: {$role->name}, Guard: {$role->guard_name}, ID: {$role->id}\n";
}