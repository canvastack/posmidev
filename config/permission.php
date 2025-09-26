<?php

return [

    'models' => [
        'permission' => Spatie\Permission\Models\Permission::class,
        // Use our extended Role model that supports tenant_id
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
        // Use UUID for morph key to match User's UUID id
        'model_morph_key' => 'model_uuid',
        // Map Spatie team key to our tenant_id
        'team_foreign_key' => 'tenant_id',
    ],

    // Enable Spatie Teams and scope by tenant_id
    'teams' => true,

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