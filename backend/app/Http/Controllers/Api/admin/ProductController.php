<?php
namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\{Product, ProductVariant, Attribute};
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    /**
     * Lưu TRỰC TIẾP vào public/storage/img/product
     * URL public: /storage/img/product/...
     */
    private const PUBLIC_DIR = 'storage/img/product';

    /* ====================== INDEX / TRASH / SHOW ====================== */

    public function index(Request $req)
    {
        $q = Product::query()
            ->with([
                'category:id,name',
                'variants.size:id,value',
                'variants.color:id,value',
            ])
            ->orderByDesc('updated_at');

        if ($s = trim((string) $req->query('search', ''))) {
            $q->where(function ($w) use ($s) {
                $w->where('name', 'like', "%{$s}%")
                    ->orWhere('sku', 'like', "%{$s}%")
                    ->orWhereHas('variants', function ($v) use ($s) {
                        $v->where('sku', 'like', "%{$s}%");
                    });
            });
        }

        if ($cid = $req->query('category_id')) {
            $q->where('category_id', $cid);
        }

        return response()->json(
            $q->paginate($req->integer('per_page', 10))
        );
    }

    public function trash(Request $req)
    {
        $q = Product::onlyTrashed()
            ->with(['category:id,name'])
            ->orderByDesc('deleted_at');

        if ($s = trim((string) $req->query('search', ''))) {
            $q->where(function ($w) use ($s) {
                $w->where('name', 'like', "%{$s}%")
                    ->orWhere('sku', 'like', "%{$s}%");
            });
        }

        if ($cid = $req->query('category_id')) {
            $q->where('category_id', $cid);
        }

        return response()->json(
            $q->paginate($req->integer('per_page', 10))
        );
    }

    public function show($id)
    {
        $product = Product::withTrashed()
            ->with([
                'category' => fn($q) => $q->withTrashed()->select('id', 'name'),
                'variants' => fn($v) => $v->orderBy('id', 'asc'),
                'variants.size:id,value',
                'variants.color:id,value',
            ])
            ->findOrFail($id);

        return response()->json($product);
    }

    /* ====================== STORE ====================== */

    public function store(Request $req)
    {
        try {
            $data = $this->validateProduct($req, true);

            return DB::transaction(function () use ($req, $data) {
                // ====== Product image (ảnh chính - 1 ảnh) ======
                $productImage = $this->gatherProductImage($req, Arr::get($data, 'image'));

                // ====== Product images (album nhiều ảnh) ======
                $productImages = [];
                if ($req->hasFile('images')) {
                    $files = $req->file('images');
                    $files = is_array($files) ? $files : [$files];
                    
                    foreach ($files as $file) {
                        if ($file instanceof UploadedFile && $file->isValid()) {
                            $productImages[] = $this->storeImage($file);
                        }
                    }
                }

                // Nếu có images_keep thì merge với ảnh mới upload
                if (array_key_exists('images_keep', $data)) {
                    $keepImages = $this->filterImageStrings($data['images_keep']);
                    $productImages = array_merge($keepImages, $productImages);
                }

                $product = Product::create([
                    'name' => $data['name'],
                    'sku' => $data['sku'] ?? null,
                    'category_id' => $data['category_id'] ?? null,
                    'description' => $data['description'] ?? null,
                    'origin' => $data['origin'] ?? null,
                    'brand' => $data['brand'] ?? null,
                    'image' => $productImage,
                    'images' => !empty($productImages) ? json_encode($productImages) : null,
                    'variation_status' => !empty($data['variation_status']) ? 1 : 0,
                ]);

                // ====== Variants (không còn images) ======
                if (!empty($data['variants']) && is_array($data['variants'])) {
                    foreach ($data['variants'] as $i => $v) {
                        $norm = $this->normalizeVariantInput($req, $v, $i, false, null);
                        $this->assertAttributeType($norm['size_id'] ?? null, 'size');
                        $this->assertAttributeType($norm['color_id'] ?? null, 'color');
                        $this->assertDiscountNotGreater($norm['price'] ?? null, $norm['discount_price'] ?? null);

                        $product->variants()->create($norm);
                    }
                }

                // Load quan hệ
                $product->load([
                    'category:id,name',
                    'variants' => fn($q) => $q->orderBy('id', 'asc'),
                    'variants.size:id,value',
                    'variants.color:id,value',
                ]);

                return response()->json($product, 201);
            });
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Product store error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Lỗi khi tạo sản phẩm: ' . $e->getMessage()
            ], 500);
        }
    }

    /* ====================== UPDATE (UPSERT VARIANTS) ====================== */

    public function update(Request $req, $id)
    {
        try {
            $product = Product::withTrashed()->findOrFail($id);
            $data = $this->validateProduct($req, false);

            return DB::transaction(function () use ($req, $product, $data) {
                // ====== Product image (1 ảnh chính) ======
                $imageToSave = $product->image;
                if ($req->hasFile('image')) {
                    $newImage = $this->storeImage($req->file('image'));
                    // Xóa ảnh cũ nếu khác ảnh mới
                    if (!empty($product->image) && $product->image !== $newImage) {
                        $this->deletePublicImageIfLocal($product->image);
                    }
                    $imageToSave = $newImage;
                } elseif (array_key_exists('image', $data)) {
                    $imageToSave = $this->stringOrNull($data['image']);
                }

                // ====== Product images (album) ======
                $currentAlbum = $this->toArrayImages($product->images);
                $finalAlbum = $currentAlbum;

                // Nếu có images_keep, sử dụng danh sách keep
                if (array_key_exists('images_keep', $data)) {
                    $keepImages = $this->filterImageStrings($data['images_keep']);
                    $finalAlbum = $keepImages;
                    
                    // Xóa các ảnh bị loại khỏi album
                    $removed = array_values(array_diff($currentAlbum, $keepImages));
                    foreach ($removed as $rm) {
                        $this->deletePublicImageIfLocal($rm);
                    }
                }

                // Thêm ảnh mới upload vào album
                if ($req->hasFile('images')) {
                    $files = $req->file('images');
                    $files = is_array($files) ? $files : [$files];
                    
                    foreach ($files as $file) {
                        if ($file instanceof UploadedFile && $file->isValid()) {
                            $finalAlbum[] = $this->storeImage($file);
                        }
                    }
                }

                // Loại bỏ trùng lặp và giá trị rỗng
                $finalAlbum = array_values(array_unique(array_filter($finalAlbum, fn($u) => is_string($u) && trim($u) !== '')));

                // ====== Category ======
                $categoryIdToSave = $product->category_id;
                if ($req->boolean('clear_category')) {
                    $categoryIdToSave = null;
                } elseif (array_key_exists('category_id', $data)) {
                    $raw = $data['category_id'];
                    if ($raw !== null && $raw !== '') {
                        $categoryIdToSave = $raw;
                    }
                }

                // Update product
                $product->update([
                    'name' => $data['name'] ?? $product->name,
                    'sku' => array_key_exists('sku', $data) ? $data['sku'] : $product->sku,
                    'category_id' => $categoryIdToSave,
                    'description' => array_key_exists('description', $data) ? $data['description'] : $product->description,
                    'origin' => array_key_exists('origin', $data) ? $data['origin'] : $product->origin,
                    'brand' => array_key_exists('brand', $data) ? $data['brand'] : $product->brand,
                    'image' => $imageToSave,
                    'images' => !empty($finalAlbum) ? json_encode($finalAlbum) : null,
                    'variation_status' => array_key_exists('variation_status', $data)
                        ? (!empty($data['variation_status']) ? 1 : 0)
                        : $product->variation_status,
                ]);

                // ====== Upsert variants (không còn xử lý images) ======
                if (array_key_exists('variants', $data) && is_array($data['variants'])) {
                    $incoming = $data['variants'];
                    $existingIds = ProductVariant::where('product_id', $product->id)->pluck('id')->all();
                    $keepIds = [];

                    foreach ($incoming as $i => $v) {
                        $variantId = Arr::get($v, 'id');
                        $pv = null;
                        if ($variantId) {
                            $pv = ProductVariant::where('product_id', $product->id)->where('id', $variantId)->first();
                        }

                        $norm = $this->normalizeVariantInput($req, $v, $i, true, $pv);

                        $this->assertAttributeType($norm['size_id'] ?? null, 'size');
                        $this->assertAttributeType($norm['color_id'] ?? null, 'color');
                        $this->assertDiscountNotGreater($norm['price'] ?? null, $norm['discount_price'] ?? null);

                        if ($pv) {
                            // Xóa ảnh chính cũ nếu cập nhật/clear ảnh chính
                            if (array_key_exists('image', $norm)) {
                                if (!empty($pv->image) && $pv->image !== $norm['image']) {
                                    $this->deletePublicImageIfLocal($pv->image);
                                }
                            }

                            $pv->update($norm);
                            $keepIds[] = $pv->id;
                        } else {
                            $created = $product->variants()->create($norm);
                            $keepIds[] = $created->id;
                        }
                    }

                    // Xóa variants không còn trong danh sách
                    $toDelete = array_diff($existingIds, $keepIds);
                    if (!empty($toDelete)) {
                        $variantsDel = ProductVariant::where('product_id', $product->id)
                            ->whereIn('id', $toDelete)->get();
                        foreach ($variantsDel as $del) {
                            $this->deletePublicImageIfLocal($del->image);
                        }
                        ProductVariant::where('product_id', $product->id)
                            ->whereIn('id', $toDelete)
                            ->delete();
                    }
                }

                $product->load([
                    'category:id,name',
                    'variants' => fn($q) => $q->orderBy('id', 'asc'),
                    'variants.size:id,value',
                    'variants.color:id,value',
                ]);

                return response()->json($product);
            });
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Product update error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Lỗi khi cập nhật sản phẩm: ' . $e->getMessage()
            ], 500);
        }
    }

    /* ====================== DELETE / RESTORE / FORCE DELETE ====================== */

    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();
        return response()->json(['message' => 'deleted']);
    }

    public function restore($id)
    {
        $product = Product::withTrashed()->findOrFail($id);
        $product->restore();
        return response()->json(['message' => 'restored']);
    }

    public function forceDelete($id)
    {
        $product = Product::withTrashed()->findOrFail($id);

        // Xóa file ảnh của variants
        foreach ($product->variants as $pv) {
            $this->deletePublicImageIfLocal($pv->image);
        }
        ProductVariant::withTrashed()->where('product_id', $product->id)->forceDelete();

        // Xóa ảnh chính và album của product
        $this->deletePublicImageIfLocal($product->image);
        foreach ($this->toArrayImages($product->images) as $im) {
            $this->deletePublicImageIfLocal($im);
        }
        
        $product->forceDelete();

        return response()->json(['message' => 'force-deleted']);
    }

    /* ====================== VALIDATION & HELPERS ====================== */

    protected function validateProduct(Request $req, bool $isCreate): array
    {
        $baseRules = [
            'name' => [$isCreate ? 'required' : 'sometimes', 'string', 'max:255'],
            'sku' => ['sometimes', 'nullable', 'string', 'max:100'],
            'category_id' => ['sometimes', 'nullable', Rule::exists('categories', 'id')],
            'description' => ['sometimes', 'nullable', 'string'],
            'origin' => ['sometimes', 'nullable', 'string', 'max:100'],
            'brand' => ['sometimes', 'nullable', 'string', 'max:100'],
            'image' => ['sometimes', 'nullable'],
            'images' => ['sometimes', 'nullable'], // Album ảnh của Product
            'images_keep' => ['sometimes', 'array'], // Giữ lại các ảnh cũ
            'variation_status' => ['sometimes', 'boolean'],
            'variants' => ['sometimes', 'array'],
            'variants.*.id' => ['sometimes', 'integer', Rule::exists('product_variants', 'id')],
            'variants.*.size_id' => ['sometimes', 'nullable', Rule::exists('attributes', 'id')],
            'variants.*.color_id' => ['sometimes', 'nullable', Rule::exists('attributes', 'id')],
            'variants.*.image' => ['sometimes', 'nullable'], // Chỉ còn ảnh chính
            'variants.*.sku' => ['sometimes', 'nullable', 'string', 'max:100'],
            'variants.*.price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'variants.*.discount_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'variants.*.stock_quantity' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'variants.*.is_available' => ['sometimes', 'boolean'],
        ];

        return $req->validate($baseRules);
    }

    /** Product: nhận 1 file hoặc string URL */
    protected function gatherProductImage(Request $req, $imageField): ?string
    {
        if ($req->hasFile('image')) {
            $file = $req->file('image');
            if ($file instanceof UploadedFile && $file->isValid()) {
                return $this->storeImage($file);
            }
        }
        return $this->stringOrNull($imageField);
    }

    /**
     * Chuẩn hoá biến thể (không còn xử lý album images)
     */
    protected function normalizeVariantInput(Request $req, array $v, ?int $index = null, bool $isUpdate = false, ?ProductVariant $pv = null): array
    {
        $norm = [];

        /* ===== Ảnh chính variant (1 ảnh) ===== */
        $hasImageFile = $index !== null && $req->hasFile("variants.$index.image");
        $hasImageField = array_key_exists('image', $v);

        if ($hasImageFile) {
            $file = $req->file("variants.$index.image");
            if ($file instanceof UploadedFile && $file->isValid()) {
                $norm['image'] = $this->storeImage($file);
            }
        } elseif ($hasImageField) {
            $norm['image'] = $this->stringOrNull(Arr::get($v, 'image'));
        } else {
            if (!$isUpdate) {
                $norm['image'] = null;
            }
        }

        /* ===== Các trường khác ===== */
        $price = Arr::get($v, 'price');
        $discountPrice = Arr::get($v, 'discount_price');

        $norm += [
            'size_id' => Arr::get($v, 'size_id'),
            'color_id' => Arr::get($v, 'color_id'),
            'sku' => Arr::get($v, 'sku'),
            'price' => $price !== null ? (string) +$price : null,
            'discount_price' => $discountPrice !== null ? (string) +$discountPrice : null,
            'stock_quantity' => (int) Arr::get($v, 'stock_quantity', 0),
            'is_available' => (bool) Arr::get($v, 'is_available', true),
        ];

        return $norm;
    }

    /* ------------------------ File helpers ------------------------ */

    /** Validate file ảnh */
    protected function validateUploadImage(UploadedFile $file): void
    {
        if (!$file->isValid()) {
            abort(422, 'Tệp ảnh không hợp lệ: ' . $file->getErrorMessage());
        }

        if (!$file->getRealPath() || !is_readable($file->getRealPath())) {
            abort(422, 'Không thể đọc file tải lên. Vui lòng thử lại.');
        }

        $mime = $file->getMimeType();
        if (!$mime || !str_starts_with($mime, 'image/')) {
            abort(422, 'Chỉ chấp nhận tệp ảnh (JPG, PNG, GIF, WebP).');
        }

        if ($file->getSize() > 8 * 1024 * 1024) {
            abort(422, 'Ảnh phải nhỏ hơn 8MB.');
        }
    }

    /**
     * Lưu file trực tiếp vào public/storage/img/product
     */
    protected function storeImage(UploadedFile $file): string
    {
        $this->validateUploadImage($file);

        $publicDir = public_path(self::PUBLIC_DIR);

        if (!File::isDirectory($publicDir)) {
            File::makeDirectory($publicDir, 0755, true, true);
        }

        $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $name = Str::uuid()->toString() . '.' . $ext;

        try {
            $file->move($publicDir, $name);
        } catch (\Exception $e) {
            Log::error('File upload error: ' . $e->getMessage());
            abort(422, 'Không thể lưu file. Vui lòng thử lại.');
        }

        return self::PUBLIC_DIR . '/' . $name;
    }

    /** string|array -> string|null (trim) */
    protected function stringOrNull($value): ?string
    {
        if (is_string($value) && trim($value) !== '') {
            return trim($value);
        }
        return null;
    }

    /** Lọc mảng URL hợp lệ cho album */
    protected function filterImageStrings($value): array
    {
        if (is_string($value) && trim($value) !== '') {
            return [trim($value)];
        }
        if (is_array($value)) {
            return array_values(array_filter($value, fn($u) => is_string($u) && trim($u) !== ''));
        }
        return [];
    }

    /** ép về array từ JSON/array/null */
    protected function toArrayImages($images): array
    {
        if (is_array($images)) {
            return $images;
        }
        if (is_string($images) && $images !== '') {
            $decoded = json_decode($images, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }

    protected function isLocalProductImagePath(?string $path): bool
    {
        return is_string($path) && str_starts_with($path, self::PUBLIC_DIR);
    }

    protected function deletePublicImageIfLocal(?string $path): void
    {
        if (!$this->isLocalProductImagePath($path)) {
            return;
        }
        $full = public_path($path);
        if (is_file($full)) {
            @unlink($full);
        }
    }

    /* ------------------------ Business rules ------------------------ */

    protected function assertAttributeType($id, $type): void
    {
        if (empty($id)) {
            return;
        }
        $ok = Attribute::where('id', $id)->where('type', $type)->exists();
        abort_unless($ok, 422, "Attribute {$id} is not of type {$type}");
    }

    protected function assertDiscountNotGreater($price, $discount): void
    {
        if ($price === null || $discount === null) {
            return;
        }
        if ((float) $discount > ((float) $price)) {
            abort(422, 'Giá khuyến mãi không được cao hơn giá gốc');
        }
    }
}