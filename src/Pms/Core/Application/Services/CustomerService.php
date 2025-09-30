<?php

namespace Src\Pms\Core\Application\Services;

use Src\Pms\Core\Domain\Contracts\TransactionManagerInterface;
use Src\Pms\Core\Domain\Entities\Customer;
use Src\Pms\Core\Domain\Repositories\CustomerRepositoryInterface;

class CustomerService
{
    public function __construct(
        private CustomerRepositoryInterface $customerRepository,
        private TransactionManagerInterface $tx
    ) {}

    public function createCustomer(
        string $tenantId,
        string $name,
        ?string $email = null,
        ?string $phone = null,
        ?string $address = null,
        array $tags = []
    ): Customer {
        return $this->tx->run(function () use ($tenantId, $name, $email, $phone, $address, $tags) {
            // Check if email already exists for this tenant (if provided)
            if ($email) {
                $existingCustomer = $this->customerRepository->findByEmail($email, $tenantId);
                if ($existingCustomer) {
                    throw new \InvalidArgumentException('Email already exists for this tenant');
                }
            }

            // Check if phone already exists for this tenant (if provided)
            if ($phone) {
                $existingCustomer = $this->customerRepository->findByPhone($phone, $tenantId);
                if ($existingCustomer) {
                    throw new \InvalidArgumentException('Phone already exists for this tenant');
                }
            }

            $customer = new Customer(
                id: \Ramsey\Uuid\Uuid::uuid4()->toString(),
                tenantId: $tenantId,
                name: $name,
                email: $email,
                phone: $phone,
                address: $address,
                createdAt: new \DateTime()
            );

            if (!empty($tags)) {
                $customer->setTags($tags);
            }

            $this->customerRepository->save($customer);
            return $customer;
        });
    }

    public function updateCustomer(
        string $customerId,
        string $name,
        ?string $email = null,
        ?string $phone = null,
        ?string $address = null,
        array $tags = []
    ): Customer {
        return $this->tx->run(function () use ($customerId, $name, $email, $phone, $address, $tags) {
            $customer = $this->customerRepository->findById($customerId);
            if (!$customer) {
                throw new \InvalidArgumentException('Customer not found');
            }

            // Check if email already exists for this tenant (if provided and different from current)
            if ($email && $email !== $customer->getEmail()) {
                $existingCustomer = $this->customerRepository->findByEmail($email, $customer->getTenantId());
                if ($existingCustomer) {
                    throw new \InvalidArgumentException('Email already exists for this tenant');
                }
            }

            // Check if phone already exists for this tenant (if provided and different from current)
            if ($phone && $phone !== $customer->getPhone()) {
                $existingCustomer = $this->customerRepository->findByPhone($phone, $customer->getTenantId());
                if ($existingCustomer) {
                    throw new \InvalidArgumentException('Phone already exists for this tenant');
                }
            }

            $customer->setName($name);
            $customer->setEmail($email);
            $customer->setPhone($phone);
            $customer->setAddress($address);
            $customer->setTags($tags);
            $customer->setUpdatedAt(new \DateTime());

            $this->customerRepository->save($customer);
            return $customer;
        });
    }

    public function getCustomersByTenant(string $tenantId): array
    {
        return $this->customerRepository->findByTenant($tenantId);
    }

    public function getCustomersByTenantPaginated(string $tenantId, int $perPage = 15)
    {
        return $this->customerRepository->findByTenantPaginated($tenantId, $perPage);
    }

    public function getCustomer(string $customerId): ?Customer
    {
        return $this->customerRepository->findById($customerId);
    }

    public function searchCustomersByName(string $name, string $tenantId): array
    {
        return $this->customerRepository->searchByName($name, $tenantId);
    }

    public function searchCustomersByNamePaginated(string $name, string $tenantId, int $perPage = 15)
    {
        return $this->customerRepository->searchByNamePaginated($name, $tenantId, $perPage);
    }

    public function deleteCustomer(string $customerId): void
    {
        $this->tx->run(function () use ($customerId) {
            $customer = $this->customerRepository->findById($customerId);
            if (!$customer) {
                throw new \InvalidArgumentException('Customer not found');
            }

            $this->customerRepository->delete($customerId);
        });
    }
}