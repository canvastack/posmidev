<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use Src\Pms\Core\Domain\Entities\Product;

class ProductEntityTest extends TestCase
{
    public function test_adjust_stock_and_is_low_stock(): void
    {
        $product = new Product(
            id: 'p1',
            tenantId: 't1',
            name: 'Item',
            sku: 'SKU-1',
            price: 100.0,
            stock: 5
        );

        $this->assertTrue($product->isLowStock(10));

        $product->adjustStock(10);
        $this->assertFalse($product->isLowStock(10));

        $this->expectException(\InvalidArgumentException::class);
        $product->adjustStock(-100);
    }
}