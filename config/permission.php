<?php

return [

    'models' => [
        'permission' => Spatie\Permission\Models\Permission::class,
        // Swap to our extended Role model that supports tenant_id
        'role' => App\Models\Role::class,
    ],

    'table_names' => [
        'roles' => 'roles',
        'permissions' => 'permissions',
        'model_has_permissions' => 'model_has_permissions',
        'model_has_roles' => 'model_has_roles',
        'role_has_permissions' => 'role_has_permissions',
    ],

    'column_names' => [
        // Use UUID for morph key to match User's string id
        'model_morph_key' => 'model_uuid',
        'team_foreign_key' => 'team_id',
    ],

    'teams' => false,

    'display_permission_in_exception' => false,

    'enable_wildcard_permission' => false,

    'cache' => [
        'store' => 'default',
        'expiration_time' => \DateInterval::createFromDateString('24 hours'),
        'key' => 'spatie.permission.cache',
        'model_key' => 'name',
        'forget_cache_credentials' => false,
    ],

];