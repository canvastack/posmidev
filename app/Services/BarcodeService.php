<?php

namespace App\Services;

use Picqer\Barcode\BarcodeGeneratorPNG;
use Picqer\Barcode\BarcodeGeneratorSVG;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;
use Endroid\QrCode\ErrorCorrectionLevel;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Collection;
use Src\Pms\Infrastructure\Models\Product;

class BarcodeService
{
    /**
     * Generate barcode image
     *
     * @param string $code The code to encode (usually SKU)
     * @param string $type Barcode type: code128, ean13, qr
     * @param string $format Output format: png, svg
     * @param string $size Size: small, medium, large
     * @return string Binary image data
     */
    public function generateBarcode(
        string $code,
        string $type = 'code128',
        string $format = 'png',
        string $size = 'medium'
    ): string {
        \Illuminate\Support\Facades\Log::info('BarcodeService: Starting barcode generation', [
            'code' => $code,
            'type' => $type,
            'format' => $format,
            'size' => $size,
        ]);

        try {
            if ($type === 'qr') {
                \Illuminate\Support\Facades\Log::info('BarcodeService: Generating QR code');
                return $this->generateQRCode($code, $size);
            }

            $widthFactor = $this->getWidthFactor($size);
            $height = $this->getHeight($size);

            \Illuminate\Support\Facades\Log::info('BarcodeService: Barcode parameters', [
                'widthFactor' => $widthFactor,
                'height' => $height,
            ]);

            if ($format === 'svg') {
                $generator = new BarcodeGeneratorSVG();
            } else {
                $generator = new BarcodeGeneratorPNG();
            }

            $barcodeType = $this->getBarcodeType($type);

            \Illuminate\Support\Facades\Log::info('BarcodeService: Generating barcode', [
                'barcodeType' => $barcodeType,
                'generator_class' => get_class($generator),
            ]);

            $result = $generator->getBarcode($code, $barcodeType, $widthFactor, $height);

            \Illuminate\Support\Facades\Log::info('BarcodeService: Barcode generated successfully', [
                'result_length' => strlen($result),
                'result_type' => gettype($result),
            ]);

            return $result;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('BarcodeService: Failed to generate barcode', [
                'code' => $code,
                'type' => $type,
                'format' => $format,
                'size' => $size,
                'error_message' => $e->getMessage(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
            ]);
            throw $e;
        }
    }

    /**
     * Generate QR code
     *
     * @param string $data Data to encode
     * @param string $size Size preset
     * @return string Binary PNG data
     */
    private function generateQRCode(string $data, string $size): string
    {
        \Illuminate\Support\Facades\Log::info('BarcodeService: Generating QR code', [
            'data' => $data,
            'size' => $size,
        ]);

        try {
            $qrSize = match ($size) {
                'small' => 200,
                'large' => 600,
                default => 400,
            };

            \Illuminate\Support\Facades\Log::info('BarcodeService: QR code parameters', [
                'qrSize' => $qrSize,
            ]);

            $qrCode = QrCode::create($data)
                ->setSize($qrSize)
                ->setMargin(10)
                ->setErrorCorrectionLevel(ErrorCorrectionLevel::High);

            $writer = new PngWriter();
            $result = $writer->write($qrCode);

            \Illuminate\Support\Facades\Log::info('BarcodeService: QR code generated successfully', [
                'result_size' => strlen($result->getString()),
            ]);

            return $result->getString();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('BarcodeService: Failed to generate QR code', [
                'data' => $data,
                'size' => $size,
                'error_message' => $e->getMessage(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
            ]);
            throw $e;
        }
    }

    /**
     * Generate bulk barcode labels as PDF
     *
     * @param Collection $products Collection of Product models
     * @param string $barcodeType Barcode type
     * @param string $layout Layout: 4x6, 2x7, 1x10
     * @param array $options Display options (include_name, include_price, include_sku)
     * @return \Illuminate\Http\Response PDF response
     */
    public function generateBulkPDF(
        Collection $products,
        string $barcodeType = 'code128',
        string $layout = '4x6',
        array $options = []
    ) {
        // Default options
        $options = array_merge([
            'include_name' => true,
            'include_price' => true,
            'include_sku' => true,
        ], $options);

        // Generate barcodes for all products
        $barcodeData = $products->map(function (Product $product) use ($barcodeType) {
            $barcodeImage = $this->generateBarcode(
                $product->sku,
                $barcodeType,
                'png',
                'medium'
            );

            return [
                'product' => $product,
                'barcode_base64' => base64_encode($barcodeImage),
            ];
        });

        // Get layout configuration
        $layoutConfig = $this->getLayoutConfig($layout);

        // Generate PDF
        $pdf = Pdf::loadView('pdf.barcode-labels', [
            'data' => $barcodeData,
            'layout' => $layoutConfig,
            'options' => $options,
        ]);

        // Set paper size and orientation
        $pdf->setPaper($layoutConfig['paper'], $layoutConfig['orientation']);

        return $pdf;
    }

    /**
     * Get barcode type constant
     *
     * @param string $type
     * @return string
     */
    private function getBarcodeType(string $type): string
    {
        return match ($type) {
            'ean13' => BarcodeGeneratorPNG::TYPE_EAN_13,
            'code39' => BarcodeGeneratorPNG::TYPE_CODE_39,
            'code93' => BarcodeGeneratorPNG::TYPE_CODE_93,
            default => BarcodeGeneratorPNG::TYPE_CODE_128,
        };
    }

    /**
     * Get width factor based on size
     *
     * @param string $size
     * @return int
     */
    private function getWidthFactor(string $size): int
    {
        return match ($size) {
            'small' => 1,
            'large' => 3,
            default => 2,
        };
    }

    /**
     * Get height based on size
     *
     * @param string $size
     * @return int
     */
    private function getHeight(string $size): int
    {
        return match ($size) {
            'small' => 50,
            'large' => 150,
            default => 100,
        };
    }

    /**
     * Get layout configuration
     *
     * @param string $layout
     * @return array
     */
    private function getLayoutConfig(string $layout): array
    {
        return match ($layout) {
            '2x7' => [
                'columns' => 2,
                'rows' => 7,
                'paper' => 'a4',
                'orientation' => 'portrait',
                'label_width' => '95mm',
                'label_height' => '40mm',
                'gap' => '2mm',
            ],
            '1x10' => [
                'columns' => 1,
                'rows' => 10,
                'paper' => 'a4',
                'orientation' => 'portrait',
                'label_width' => '100mm',
                'label_height' => '28mm',
                'gap' => '1mm',
            ],
            default => [ // 4x6
                'columns' => 4,
                'rows' => 6,
                'paper' => 'a4',
                'orientation' => 'portrait',
                'label_width' => '48mm',
                'label_height' => '48mm',
                'gap' => '2mm',
            ],
        };
    }
}