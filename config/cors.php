<?php

return [
    // Apply CORS to API routes
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    // Allow all HTTP methods
    'allowed_methods' => ['*'],

    // Explicitly allow your dev frontends
    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],

    // No origin regex patterns
    'allowed_origins_patterns' => [],

    // Allow common headers
    'allowed_headers' => ['*'],

    // Headers exposed to the browser
    'exposed_headers' => [],

    // Cache preflight response
    'max_age' => 0,

    // Not using cookies for API tokens; set to true only if you use session/cookies
    'supports_credentials' => false,
];