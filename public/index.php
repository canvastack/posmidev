<?php

use Illuminate\Foundation\Application;

/*
|--------------------------------------------------------------------------
| Laravel - A PHP Framework For Web Artisans
|--------------------------------------------------------------------------
|
| This file is the entry point for all requests to your application.
| It bootstraps the framework and then runs the application so that
| it can send the responses back to the browser and delight our users.
|
*/

define('LARAVEL_START', microtime(true));

// Register the Composer autoloader
require __DIR__.'/../vendor/autoload.php';

// Bootstrap the Laravel application
$app = require_once __DIR__.'/../bootstrap/app.php';

// Handle the request
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture()
);

$response->send();

$kernel->terminate($request, $response);