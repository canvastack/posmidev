<?php

namespace App\Policies;

use Src\Pms\Infrastructure\Models\User;
use Src\Pms\Infrastructure\Models\Recipe;
use Illuminate\Auth\Access\HandlesAuthorization;

class RecipePolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any recipes.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('recipes.view');
    }

    /**
     * Determine whether the user can view the recipe.
     */
    public function view(User $user, ?Recipe $recipe = null): bool
    {
        return $user->can('recipes.view');
    }

    /**
     * Determine whether the user can create recipes.
     */
    public function create(User $user): bool
    {
        return $user->can('recipes.create');
    }

    /**
     * Determine whether the user can update the recipe.
     */
    public function update(User $user, Recipe $recipe): bool
    {
        return $user->can('recipes.update') && $user->tenant_id === $recipe->tenant_id;
    }

    /**
     * Determine whether the user can delete the recipe.
     */
    public function delete(User $user, ?Recipe $recipe = null): bool
    {
        if ($recipe) {
            return $user->can('recipes.delete') && $user->tenant_id === $recipe->tenant_id;
        }
        
        return $user->can('recipes.delete');
    }

    /**
     * Determine whether the user can activate the recipe.
     */
    public function activate(User $user, Recipe $recipe): bool
    {
        return $user->can('recipes.activate') && $user->tenant_id === $recipe->tenant_id;
    }

    /**
     * Determine whether the user can manage recipe components.
     */
    public function manageComponents(User $user, Recipe $recipe): bool
    {
        return $user->can('recipes.manage_components') && $user->tenant_id === $recipe->tenant_id;
    }
}