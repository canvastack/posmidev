<?php

namespace Src\Pms\Infrastructure\Support;

use Illuminate\Support\Facades\DB;
use Src\Pms\Core\Domain\Contracts\TransactionManagerInterface;

class EloquentTransactionManager implements TransactionManagerInterface
{
    public function run(callable $callback)
    {
        return DB::transaction(function () use ($callback) {
            return $callback();
        });
    }
}