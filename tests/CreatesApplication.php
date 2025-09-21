<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

trait CreatesApplication
{
    public function createApplication()
    {
        $app = require __DIR__.'/../bootstrap/app.php';

        $app->make(Kernel::class)->bootstrap();

        // Ensure sqlite in-memory for tests
        config([
            'database.default' => env('DB_CONNECTION', 'sqlite'),
            'database.connections.sqlite.database' => ':memory:',
        ]);

        return $app;
    }
}