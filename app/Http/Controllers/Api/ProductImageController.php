<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\ProductImage;
use Intervention\Image\ImageManager;

/**
 * ProductImageController
 * 
 * Phase 7: Multi-Image Gallery
 * Manages multiple images per product
 * 
 * Endpoints:
 * - POST   /api/v1/tenants/{tenantId}/products/{productId}/images (upload)
 * - DELETE /api/v1/tenants/{tenantId}/products/{productId}/images/{imageId} (delete)
 * - PATCH  /api/v1/tenants/{tenantId}/products/{productId}/images/{imageId}/primary (set primary)
 * - PATCH  /api/v1/tenants/{tenantId}/products/{productId}/images/reorder (reorder)
 */
class ProductImageController extends Controller
{
    /**
     * Maximum images per product
     */
    const MAX_IMAGES = 10;

    /**
     * Maximum file size (in KB)
     */
    const MAX_FILE_SIZE = 2048; // 2MB

    /**
     * Thumbnail dimensions
     */
    const THUMBNAIL_WIDTH = 200;
    const THUMBNAIL_HEIGHT = 200;

    /**
     * Upload multiple images for a product
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $productId
     * @return JsonResponse
     */
    public function upload(Request $request, string $tenantId, string $productId): JsonResponse
    {
        // Find product with tenant check
        $product = Product::where('id', $productId)
            ->where('tenant_id', $tenantId)
            ->firstOrFail();

        // Check permission
        $this->authorize('update', [Product::class, $tenantId]);

        // Check current image count
        $currentCount = ProductImage::where('product_id', $productId)->count();
        
        if ($currentCount >= self::MAX_IMAGES) {
            return response()->json([
                'message' => 'Maximum image limit reached',
                'max_images' => self::MAX_IMAGES
            ], 422);
        }

        // Validate request
        $request->validate([
            'images' => 'required|array|min:1|max:' . (self::MAX_IMAGES - $currentCount),
            'images.*' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:' . self::MAX_FILE_SIZE,
        ]);

        $uploadedImages = [];
        $errors = [];

        DB::beginTransaction();
        try {
            $images = $request->file('images');
            $nextSortOrder = ProductImage::where('product_id', $productId)->max('sort_order') + 1;

            foreach ($images as $index => $image) {
                try {
                    // Generate unique filename
                    $filename = time() . '_' . $productId . '_' . uniqid() . '.' . $image->getClientOriginalExtension();

                    // Store original image
                    $imagePath = $image->storeAs('products/images', $filename, 'public');

                    // Create thumbnail (200x200)
                    $thumbnailFilename = 'thumb_' . $filename;
                    $thumbnailPath = 'products/images/' . $thumbnailFilename;

                    $imageManager = new ImageManager(['driver' => 'gd']);
                    $thumbnail = $imageManager->make($image->getRealPath());
                    $thumbnail->fit(self::THUMBNAIL_WIDTH, self::THUMBNAIL_HEIGHT);
                    $thumbnail->save(storage_path('app/public/' . $thumbnailPath));

                    // Determine if this should be the primary image (first image and no primary exists)
                    $isPrimary = false;
                    if ($currentCount === 0 && $index === 0) {
                        $isPrimary = true;
                    }

                    // Create ProductImage record
                    $productImage = ProductImage::create([
                        'id' => \Illuminate\Support\Str::uuid()->toString(),
                        'tenant_id' => $tenantId,
                        'product_id' => $productId,
                        'image_url' => $imagePath,
                        'thumbnail_url' => $thumbnailPath,
                        'is_primary' => $isPrimary,
                        'sort_order' => $nextSortOrder + $index,
                    ]);

                    $uploadedImages[] = [
                        'id' => $productImage->id,
                        'image_url' => asset('storage/' . $imagePath),
                        'thumbnail_url' => asset('storage/' . $thumbnailPath),
                        'is_primary' => $isPrimary,
                        'sort_order' => $productImage->sort_order,
                    ];

                    $currentCount++;

                } catch (\Exception $e) {
                    $errors[] = [
                        'file' => $image->getClientOriginalName(),
                        'error' => $e->getMessage()
                    ];
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Images uploaded successfully',
                'data' => $uploadedImages,
                'errors' => $errors,
                'total_images' => $currentCount,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to upload images',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete an image
     * 
     * @param string $tenantId
     * @param string $productId
     * @param string $imageId
     * @return JsonResponse
     */
    public function delete(string $tenantId, string $productId, string $imageId): JsonResponse
    {
        // Find product with tenant check
        $product = Product::where('id', $productId)
            ->where('tenant_id', $tenantId)
            ->firstOrFail();

        // Check permission
        $this->authorize('update', [Product::class, $tenantId]);

        // Find image
        $image = ProductImage::where('id', $imageId)
            ->where('product_id', $productId)
            ->where('tenant_id', $tenantId)
            ->firstOrFail();

        DB::beginTransaction();
        try {
            // Delete files from storage
            if ($image->image_url) {
                Storage::disk('public')->delete($image->image_url);
            }
            if ($image->thumbnail_url) {
                Storage::disk('public')->delete($image->thumbnail_url);
            }

            $wasPrimary = $image->is_primary;

            // Delete record
            $image->delete();

            // If deleted image was primary, set first remaining image as primary
            if ($wasPrimary) {
                $firstImage = ProductImage::where('product_id', $productId)
                    ->orderBy('sort_order', 'asc')
                    ->first();

                if ($firstImage) {
                    $firstImage->update(['is_primary' => true]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Image deleted successfully'
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to delete image',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Set an image as primary
     * 
     * @param string $tenantId
     * @param string $productId
     * @param string $imageId
     * @return JsonResponse
     */
    public function setPrimary(string $tenantId, string $productId, string $imageId): JsonResponse
    {
        // Find product with tenant check
        $product = Product::where('id', $productId)
            ->where('tenant_id', $tenantId)
            ->firstOrFail();

        // Check permission
        $this->authorize('update', [Product::class, $tenantId]);

        // Find image
        $image = ProductImage::where('id', $imageId)
            ->where('product_id', $productId)
            ->where('tenant_id', $tenantId)
            ->firstOrFail();

        DB::beginTransaction();
        try {
            // Unset all primary flags for this product
            ProductImage::where('product_id', $productId)
                ->update(['is_primary' => false]);

            // Set this image as primary
            $image->update(['is_primary' => true]);

            DB::commit();

            return response()->json([
                'message' => 'Primary image updated successfully',
                'data' => [
                    'id' => $image->id,
                    'image_url' => asset('storage/' . $image->image_url),
                    'thumbnail_url' => asset('storage/' . $image->thumbnail_url),
                    'is_primary' => true,
                ]
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to set primary image',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reorder images
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $productId
     * @return JsonResponse
     */
    public function reorder(Request $request, string $tenantId, string $productId): JsonResponse
    {
        // Find product with tenant check
        $product = Product::where('id', $productId)
            ->where('tenant_id', $tenantId)
            ->firstOrFail();

        // Check permission
        $this->authorize('update', [Product::class, $tenantId]);

        // Validate request
        $request->validate([
            'order' => 'required|array|min:1',
            'order.*' => 'required|string|uuid',
        ]);

        DB::beginTransaction();
        try {
            $order = $request->input('order');

            foreach ($order as $index => $imageId) {
                ProductImage::where('id', $imageId)
                    ->where('product_id', $productId)
                    ->where('tenant_id', $tenantId)
                    ->update(['sort_order' => $index]);
            }

            DB::commit();

            // Get updated images
            $images = ProductImage::where('product_id', $productId)
                ->orderBy('sort_order', 'asc')
                ->get()
                ->map(function ($img) {
                    return [
                        'id' => $img->id,
                        'image_url' => asset('storage/' . $img->image_url),
                        'thumbnail_url' => asset('storage/' . $img->thumbnail_url),
                        'is_primary' => $img->is_primary,
                        'sort_order' => $img->sort_order,
                    ];
                });

            return response()->json([
                'message' => 'Images reordered successfully',
                'data' => $images
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to reorder images',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all images for a product
     * 
     * @param string $tenantId
     * @param string $productId
     * @return JsonResponse
     */
    public function index(string $tenantId, string $productId): JsonResponse
    {
        // Find product with tenant check
        $product = Product::where('id', $productId)
            ->where('tenant_id', $tenantId)
            ->firstOrFail();

        // Check permission
        $this->authorize('view', [Product::class, $tenantId]);

        // Get images
        $images = ProductImage::where('product_id', $productId)
            ->orderBy('sort_order', 'asc')
            ->get()
            ->map(function ($img) {
                return [
                    'id' => $img->id,
                    'image_url' => asset('storage/' . $img->image_url),
                    'thumbnail_url' => asset('storage/' . $img->thumbnail_url),
                    'is_primary' => $img->is_primary,
                    'sort_order' => $img->sort_order,
                ];
            });

        return response()->json([
            'data' => $images,
            'total' => $images->count(),
            'max_images' => self::MAX_IMAGES,
        ], 200);
    }
}