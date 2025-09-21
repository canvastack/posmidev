<?php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustHosts as Middleware;

class TrustHosts extends Middleware
{
    /**
     * Get the host patterns that should be trusted.
     *
     * @return array<int, string|null>
     */
    public function hosts()
    {
        return [
            // Add your trusted hosts patterns if needed, e.g.:
            // '^(.*\.)?your-domain\.com$',
            $this->allSubdomainsOfApplicationUrl(),
        ];
    }
}