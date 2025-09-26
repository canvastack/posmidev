<?php

namespace Src\Pms\Core\Domain\Contracts;

interface TransactionManagerInterface
{
    /**
     * Execute the given callback within a single atomic transaction.
     * Any exception should rollback the transaction and be rethrown.
     *
     * @template T
     * @param callable():T $callback
     * @return T
     */
    public function run(callable $callback);
}