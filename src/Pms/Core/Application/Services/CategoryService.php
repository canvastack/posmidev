<?php

namespace Src\Pms\Core\Application\Services;

use Src\Pms\Core\Domain\Contracts\TransactionManagerInterface;
use Src\Pms\Core\Domain\Entities\Category;
use Src\Pms\Core\Domain\Repositories\CategoryRepositoryInterface;

class CategoryService
{
    public function __construct(
        private CategoryRepositoryInterface $categoryRepository,
        private TransactionManagerInterface $tx
    ) {}

    public function createCategory(
        string $tenantId,
        string $name,
        ?string $description = null
    ): Category {
        return $this->tx->run(function () use ($tenantId, $name, $description) {
            $category = new Category(
                id: \Ramsey\Uuid\Uuid::uuid4()->toString(),
                tenantId: $tenantId,
                name: $name,
                description: $description,
                createdAt: new \DateTime()
            );

            $this->categoryRepository->save($category);
            return $category;
        });
    }

    public function updateCategory(
        string $categoryId,
        string $name,
        ?string $description = null
    ): Category {
        return $this->tx->run(function () use ($categoryId, $name, $description) {
            $category = $this->categoryRepository->findById($categoryId);
            if (!$category) {
                throw new \InvalidArgumentException('Category not found');
            }

            $category->updateDetails($name, $description);
            $this->categoryRepository->save($category);

            return $category;
        });
    }

    public function getCategoriesByTenant(string $tenantId): array
    {
        return $this->categoryRepository->findByTenant($tenantId);
    }

    public function getCategoriesByTenantPaginated(string $tenantId, int $perPage = 15)
    {
        return $this->categoryRepository->findByTenantPaginated($tenantId, $perPage);
    }

    public function getCategory(string $categoryId): ?Category
    {
        return $this->categoryRepository->findById($categoryId);
    }

    public function deleteCategory(string $categoryId): void
    {
        $this->tx->run(function () use ($categoryId) {
            $this->categoryRepository->delete($categoryId);
        });
    }
}