<?php

namespace App\Policies;

use App\Models\User;
use Src\Pms\Infrastructure\Models\ProductTag;

class ProductTagPolicy
{
    /**
     * Determine if the user can view any tags
     */
    public function viewAny(User $user, string $tenantId): bool
    {
        return $user->can('products.view');
    }

    /**
     * Determine if the user can view the tag
     */
    public function view(User $user, ProductTag $tag, string $tenantId): bool
    {
        // Ensure tag belongs to the tenant
        if ($tag->tenant_id !== $tenantId) {
            return false;
        }

        return $user->can('products.view');
    }

    /**
     * Determine if the user can create tags
     */
    public function create(User $user, string $tenantId): bool
    {
        return $user->can('products.update');
    }

    /**
     * Determine if the user can update the tag
     */
    public function update(User $user, ProductTag $tag, string $tenantId): bool
    {
        // Ensure tag belongs to the tenant
        if ($tag->tenant_id !== $tenantId) {
            return false;
        }

        return $user->can('products.update');
    }

    /**
     * Determine if the user can delete the tag
     */
    public function delete(User $user, ProductTag $tag, string $tenantId): bool
    {
        // Ensure tag belongs to the tenant
        if ($tag->tenant_id !== $tenantId) {
            return false;
        }

        return $user->can('products.update');
    }
}