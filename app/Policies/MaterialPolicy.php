<?php

namespace App\Policies;

use Src\Pms\Infrastructure\Models\User;
use Src\Pms\Infrastructure\Models\Material;
use Illuminate\Auth\Access\HandlesAuthorization;

class MaterialPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any materials.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('materials.view');
    }

    /**
     * Determine whether the user can view the material.
     */
    public function view(User $user, ?Material $material = null): bool
    {
        return $user->can('materials.view');
    }

    /**
     * Determine whether the user can create materials.
     */
    public function create(User $user): bool
    {
        return $user->can('materials.create');
    }

    /**
     * Determine whether the user can update the material.
     */
    public function update(User $user, Material $material): bool
    {
        // User must have update permission and material must belong to user's tenant
        return $user->can('materials.update') && $user->tenant_id === $material->tenant_id;
    }

    /**
     * Determine whether the user can delete the material.
     */
    public function delete(User $user, ?Material $material = null): bool
    {
        if ($material) {
            return $user->can('materials.delete') && $user->tenant_id === $material->tenant_id;
        }
        
        return $user->can('materials.delete');
    }

    /**
     * Determine whether the user can adjust stock.
     */
    public function adjustStock(User $user, Material $material): bool
    {
        return $user->can('materials.adjust_stock') && $user->tenant_id === $material->tenant_id;
    }

    /**
     * Determine whether the user can export materials.
     */
    public function export(User $user): bool
    {
        return $user->can('materials.export');
    }

    /**
     * Determine whether the user can import materials.
     */
    public function import(User $user): bool
    {
        return $user->can('materials.import');
    }
}