<?php

namespace Src\Pms\Core\Application\Services;

use Src\Pms\Core\Domain\Entities\Category;
use Src\Pms\Core\Domain\Repositories\CategoryRepositoryInterface;

class CategoryService
{
    public function __construct(
        private CategoryRepositoryInterface $categoryRepository
    ) {}

    public function createCategory(
        string $tenantId,
        string $name,
        ?string $description = null
    ): Category {
        $category = new Category(
            id: \Ramsey\Uuid\Uuid::uuid4()->toString(),
            tenantId: $tenantId,
            name: $name,
            description: $description,
            createdAt: new \DateTime()
        );

        $this->categoryRepository->save($category);
        return $category;
    }

    public function updateCategory(
        string $categoryId,
        string $name,
        ?string $description = null
    ): Category {
        $category = $this->categoryRepository->findById($categoryId);
        if (!$category) {
            throw new \InvalidArgumentException('Category not found');
        }

        $category->updateDetails($name, $description);
        $this->categoryRepository->save($category);
        
        return $category;
    }

    public function getCategoriesByTenant(string $tenantId): array
    {
        return $this->categoryRepository->findByTenant($tenantId);
    }

    public function getCategory(string $categoryId): ?Category
    {
        return $this->categoryRepository->findById($categoryId);
    }

    public function deleteCategory(string $categoryId): void
    {
        $this->categoryRepository->delete($categoryId);
    }
}