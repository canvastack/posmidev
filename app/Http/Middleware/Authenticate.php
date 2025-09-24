<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo($request): ?string
    {
        // For API routes, do not attempt redirect; let it return 401 JSON
        if ($request->is('api/*')) {
            return null;
        }

        if (! $request->expectsJson()) {
            // Avoid referencing a non-existent 'login' route in APIs
            return null;
        }
        return null;
    }
}