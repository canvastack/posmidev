<?php
require_once 'vendor/autoload.php';

$ref = new ReflectionClass('Picqer\Barcode\BarcodeGeneratorPNG');
$constants = $ref->getConstants();

echo "Available constants in BarcodeGeneratorPNG:\n";
foreach ($constants as $name => $value) {
    echo "$name = $value\n";
}