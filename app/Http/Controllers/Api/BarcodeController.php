<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BarcodeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Src\Pms\Infrastructure\Models\Product;

class BarcodeController extends Controller
{
    public function __construct(private BarcodeService $barcodeService)
    {
    }

    /**
     * Generate barcode for single product
     *
     * @OA\Get(
     *     path="/api/v1/tenants/{tenantId}/products/{productId}/barcode",
     *     summary="Generate barcode for product",
     *     tags={"Products", "Barcode"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="tenantId",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="string", format="uuid")
     *     ),
     *     @OA\Parameter(
     *         name="productId",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="string", format="uuid")
     *     ),
     *     @OA\Parameter(
     *         name="format",
     *         in="query",
     *         required=false,
     *         @OA\Schema(type="string", enum={"png", "svg"}, default="png")
     *     ),
     *     @OA\Parameter(
     *         name="type",
     *         in="query",
     *         required=false,
     *         @OA\Schema(type="string", enum={"code128", "ean13", "qr"}, default="code128")
     *     ),
     *     @OA\Parameter(
     *         name="size",
     *         in="query",
     *         required=false,
     *         @OA\Schema(type="string", enum={"small", "medium", "large"}, default="medium")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Barcode image",
     *         @OA\MediaType(
     *             mediaType="image/png",
     *             @OA\Schema(type="string", format="binary")
     *         )
     *     ),
     *     @OA\Response(response=403, description="Unauthorized"),
     *     @OA\Response(response=404, description="Product not found")
     * )
     */
    public function generate(Request $request, string $tenantId, string $productId)
    {
        // Authorization check
        if (Gate::denies('view', Product::class)) {
            abort(403, 'Unauthorized to view products');
        }

        // Validate request
        $validated = $request->validate([
            'format' => 'sometimes|in:png,svg',
            'type' => 'sometimes|in:code128,ean13,qr',
            'size' => 'sometimes|in:small,medium,large',
        ]);

        // Find product (tenant-scoped)
        $product = Product::where('tenant_id', $tenantId)
            ->where('id', $productId)
            ->firstOrFail();

        // Generate barcode from SKU
        $format = $validated['format'] ?? 'png';
        $type = $validated['type'] ?? 'code128';
        $size = $validated['size'] ?? 'medium';

        try {
            \Illuminate\Support\Facades\Log::info('Barcode generation started', [
                'product_id' => $product->id,
                'sku' => $product->sku,
                'type' => $type,
                'format' => $format,
                'size' => $size,
            ]);

            $barcodeData = $this->barcodeService->generateBarcode(
                $product->sku,
                $type,
                $format,
                $size
            );

            \Illuminate\Support\Facades\Log::info('Barcode generated successfully', [
                'product_id' => $product->id,
                'sku' => $product->sku,
                'data_length' => strlen($barcodeData),
                'data_type' => gettype($barcodeData),
            ]);

            // Return image
            $contentType = $format === 'svg' ? 'image/svg+xml' : 'image/png';

            return response($barcodeData)
                ->header('Content-Type', $contentType)
                ->header('Content-Disposition', 'inline; filename="' . $product->sku . '.' . $format . '"')
                ->header('Cache-Control', 'max-age=3600');
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Barcode generation failed', [
                'product_id' => $product->id,
                'sku' => $product->sku,
                'type' => $type,
                'format' => $format,
                'size' => $size,
                'error_message' => $e->getMessage(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'error_trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate barcode: ' . $e->getMessage(),
                'debug_info' => [
                    'product_id' => $product->id,
                    'sku' => $product->sku,
                    'type' => $type,
                    'format' => $format,
                    'size' => $size,
                ]
            ], 500);
        }
    }

    /**
     * Generate bulk barcodes as PDF
     *
     * @OA\Post(
     *     path="/api/v1/tenants/{tenantId}/products/barcode/bulk",
     *     summary="Generate bulk barcodes as PDF",
     *     tags={"Products", "Barcode"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="tenantId",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="string", format="uuid")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"product_ids"},
     *             @OA\Property(property="product_ids", type="array", @OA\Items(type="string", format="uuid")),
     *             @OA\Property(property="barcode_type", type="string", enum={"code128", "ean13", "qr"}, default="code128"),
     *             @OA\Property(property="layout", type="string", enum={"4x6", "2x7", "1x10"}, default="4x6"),
     *             @OA\Property(property="include_product_name", type="boolean", default=true),
     *             @OA\Property(property="include_price", type="boolean", default=true),
     *             @OA\Property(property="include_sku", type="boolean", default=true)
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="PDF file with barcodes",
     *         @OA\MediaType(
     *             mediaType="application/pdf",
     *             @OA\Schema(type="string", format="binary")
     *         )
     *     ),
     *     @OA\Response(response=403, description="Unauthorized"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function bulkGenerate(Request $request, string $tenantId)
    {
        // Authorization check
        if (Gate::denies('view', Product::class)) {
            abort(403, 'Unauthorized to view products');
        }

        // Validate request
        $validated = $request->validate([
            'product_ids' => 'required|array|min:1|max:100',
            'product_ids.*' => 'required|uuid|exists:products,id',
            'barcode_type' => 'sometimes|in:code128,ean13,qr',
            'layout' => 'sometimes|in:4x6,2x7,1x10',
            'include_product_name' => 'sometimes|boolean',
            'include_price' => 'sometimes|boolean',
            'include_sku' => 'sometimes|boolean',
        ]);

        // Get products (tenant-scoped)
        $products = Product::where('tenant_id', $tenantId)
            ->whereIn('id', $validated['product_ids'])
            ->get();

        // Verify all products belong to tenant
        if ($products->count() !== count($validated['product_ids'])) {
            return response()->json([
                'success' => false,
                'message' => 'Some products not found or do not belong to this tenant',
            ], 404);
        }

        try {
            // Generate PDF
            $pdf = $this->barcodeService->generateBulkPDF(
                $products,
                $validated['barcode_type'] ?? 'code128',
                $validated['layout'] ?? '4x6',
                [
                    'include_name' => $validated['include_product_name'] ?? true,
                    'include_price' => $validated['include_price'] ?? true,
                    'include_sku' => $validated['include_sku'] ?? true,
                ]
            );

            $filename = 'barcodes_' . now()->format('YmdHis') . '.pdf';

            return $pdf->download($filename);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate barcode PDF: ' . $e->getMessage(),
            ], 500);
        }
    }
}