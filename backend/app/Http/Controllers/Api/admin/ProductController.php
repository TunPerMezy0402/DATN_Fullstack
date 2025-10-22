<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\{Product, ProductVariant, Attribute};
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
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
            'category' => fn($q) => $q->withTrashed()->select('id','name'), // 👈
            'variants' => fn($v) => $v->orderBy('id','asc'),
            'variants.size:id,value',
            'variants.color:id,value',
        ])
        ->findOrFail($id);

    return response()->json($product);
}


    /* ====================== STORE ====================== */

    public function store(Request $req)
    {
        $data = $this->validateProduct($req, true);

        return DB::transaction(function () use ($req, $data) {
            // Product image (1 ảnh => cột image)
            $productImage = $this->gatherProductImage($req, Arr::get($data, 'image'));

            $product = Product::create([
                'name' => $data['name'],
                'sku' => $data['sku'] ?? null,
                'category_id' => $data['category_id'] ?? null,
                'description' => $data['description'] ?? null,
                'origin' => $data['origin'] ?? null,
                'brand' => $data['brand'] ?? null,
                'image' => $productImage, // 'storage/img/product/xxx.jpg' | null
                'variation_status' => !empty($data['variation_status']) ? 1 : 0,
            ]);

            // Variants
            if (!empty($data['variants']) && is_array($data['variants'])) {
                foreach ($data['variants'] as $i => $v) {
                    $norm = $this->normalizeVariantInput($req, $v, $i, false, null);
                    $this->assertAttributeType($norm['size_id'] ?? null, 'size');
                    $this->assertAttributeType($norm['color_id'] ?? null, 'color');
                    $this->assertDiscountNotGreater($norm['price'] ?? null, $norm['discount_price'] ?? null);

                    $product->variants()->create($norm);
                }
            }

            $product->load([
                'category:id,name',
                'variants.size:id,value',
                'variants.color:id,value',
            ]);

            return response()->json($product, 201);
        });
    }

    /* ====================== UPDATE (UPSERT VARIANTS) ====================== */

    public function update(Request $req, $id)
    {   
        
        $product = Product::withTrashed()->findOrFail($id);
        $data = $this->validateProduct($req, false);

        return DB::transaction(function () use ($req, $product, $data) {
            // Product image (1 ảnh)
            $imageToSave = $product->image;
            if ($req->hasFile('image')) {
                $imageToSave = $this->storeImage($req->file('image'));
            } elseif (array_key_exists('image', $data)) {
                $imageToSave = $this->stringOrNull($data['image']);
            }

            $categoryIdToSave = $product->category_id;

            // Nếu có cờ clear_category = true => cho phép xoá danh mục
            if ($req->boolean('clear_category')) {
                $categoryIdToSave = null;
            } elseif (array_key_exists('category_id', $data)) {
                $raw = $data['category_id'];
                // Nếu FE gửi null/"" thì coi như KHÔNG thay đổi (tránh làm mất)
                if ($raw !== null && $raw !== '') {
                    $categoryIdToSave = $raw; // đã có Rule::exists đảm bảo hợp lệ
                }
                // còn lại: giữ nguyên $categoryIdToSave
            }

            $product->update([
                'name' => $data['name'] ?? $product->name,
                'sku' => array_key_exists('sku', $data) ? $data['sku'] : $product->sku,
                'category_id' => $categoryIdToSave,
                'description' => array_key_exists('description', $data) ? $data['description'] : $product->description,
                'origin' => array_key_exists('origin', $data) ? $data['origin'] : $product->origin,
                'brand' => array_key_exists('brand', $data) ? $data['brand'] : $product->brand,
                'image' => $imageToSave,
                'variation_status' => array_key_exists('variation_status', $data)
                    ? (!empty($data['variation_status']) ? 1 : 0)
                    : $product->variation_status,
            ]);

            // Upsert variants (GIỮ ảnh album chưa xoá + THÊM ảnh mới)
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

                    // Chuẩn hoá input + merge album
                    $norm = $this->normalizeVariantInput($req, $v, $i, true, $pv);

                    // Kiểm tra rules
                    $this->assertAttributeType($norm['size_id'] ?? null, 'size');
                    $this->assertAttributeType($norm['color_id'] ?? null, 'color');
                    $this->assertDiscountNotGreater($norm['price'] ?? null, $norm['discount_price'] ?? null);

                    if ($pv) {
                        // Xoá file ảnh bị loại khỏi album (nếu là ảnh local của hệ thống)
                        if (array_key_exists('images', $norm)) {
                            $oldAlbum = $this->toArrayImages($pv->images);
                            $removed = array_values(array_diff($oldAlbum, $norm['images']));
                            foreach ($removed as $rm) {
                                $this->deletePublicImageIfLocal($rm);
                            }
                        }
                        // Xoá file ảnh chính cũ nếu cập nhật/clear ảnh chính
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

                $toDelete = array_diff($existingIds, $keepIds);
                if (!empty($toDelete)) {
                    // Optionally: xoá luôn file ảnh của các biến thể bị xoá
                    $variantsDel = ProductVariant::where('product_id', $product->id)
                        ->whereIn('id', $toDelete)->get();
                    foreach ($variantsDel as $del) {
                        $this->deletePublicImageIfLocal($del->image);
                        foreach ($this->toArrayImages($del->images) as $im) {
                            $this->deletePublicImageIfLocal($im);
                        }
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

        // Xoá file ảnh liên quan trước khi force delete
        foreach ($product->variants as $pv) {
            $this->deletePublicImageIfLocal($pv->image);
            foreach ($this->toArrayImages($pv->images) as $im) {
                $this->deletePublicImageIfLocal($im);
            }
        }
        ProductVariant::withTrashed()->where('product_id', $product->id)->forceDelete();

        $this->deletePublicImageIfLocal($product->image);
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

            // Product: chỉ 1 ảnh
            'image' => ['sometimes', 'nullable'],

            'variation_status' => ['sometimes', 'boolean'],

            'variants' => ['sometimes', 'array'],
            'variants.*.id' => ['sometimes', 'integer', Rule::exists('product_variants', 'id')],
            'variants.*.size_id' => ['sometimes', 'nullable', Rule::exists('attributes', 'id')],
            'variants.*.color_id' => ['sometimes', 'nullable', Rule::exists('attributes', 'id')],
            'variants.*.image' => ['sometimes', 'nullable'], // file hoặc URL
            'variants.*.images' => ['sometimes', 'nullable'], // mảng file hoặc URL
            'variants.*.images_keep' => ['sometimes', 'array'],    // mảng URL cần giữ
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
            if ($file instanceof UploadedFile) {
                $this->validateUploadImage($file);
                return $this->storeImage($file);
            }
        }
        return $this->stringOrNull($imageField);
    }

    /**
     * Chuẩn hoá biến thể + xử lý album:
     * - Update: giữ ảnh cũ nếu không gửi 'image'; album = (images_keep || images strings || album cũ) + ảnh file mới
     * - Create: ảnh chính/album lấy trực tiếp từ input
     */
    protected function normalizeVariantInput(Request $req, array $v, ?int $index = null, bool $isUpdate = false, ?ProductVariant $pv = null): array
    {
        $norm = [];

        /* ===== Ảnh chính (1 ảnh) ===== */
        $hasImageFile = $index !== null && $req->hasFile("variants.$index.image");
        $hasImageField = array_key_exists('image', $v);

        if ($hasImageFile) {
            $file = $req->file("variants.$index.image");
            $this->validateUploadImage($file);
            $norm['image'] = $this->storeImage($file);
        } elseif ($hasImageField) {
            $norm['image'] = $this->stringOrNull(Arr::get($v, 'image')); // cho phép clear = null
        } else {
            if (!$isUpdate) {
                $norm['image'] = null; // create: set null nếu không có
            }
            // update: không đụng tới ảnh chính nếu không gửi trường 'image'
        }

        /* ===== Album (nhiều ảnh) ===== */
        $current = $pv ? $this->toArrayImages($pv->images) : [];

        // Ưu tiên images_keep nếu có
        if (array_key_exists('images_keep', $v)) {
            $keep = $this->filterImageStrings($v['images_keep']);
            $final = $keep; // coi như danh sách giữ
        }
        // Nếu không có images_keep, nhưng có 'images' (dưới dạng string[]) và KHÔNG upload file
        elseif ($index !== null && !$req->hasFile("variants.$index.images") && array_key_exists('images', $v)) {
            $fromStrings = $this->filterImageStrings($v['images']);
            // hiểu như danh sách sau khi user đã xoá bớt trên FE
            $final = $fromStrings;
        }
        // Nếu không gửi gì liên quan album: Update -> giữ nguyên, Create -> rỗng
        else {
            $final = $isUpdate ? $current : [];
        }

        // Thêm các ảnh file mới upload
        if ($index !== null && $req->hasFile("variants.$index.images")) {
            $files = $req->file("variants.$index.images");
            $files = is_array($files) ? $files : [$files];
            foreach ($files as $f) {
                if ($f instanceof UploadedFile) {
                    $this->validateUploadImage($f);
                    $final[] = $this->storeImage($f);
                }
            }
        }

        $final = array_values(array_unique(array_filter($final, fn($u) => is_string($u) && trim($u) !== '')));

        if ($isUpdate) {
            $touched = array_key_exists('images_keep', $v)
                || array_key_exists('images', $v)
                || ($index !== null && $req->hasFile("variants.$index.images"));
            if ($touched) {
                $norm['images'] = $final;
            }
        } else {
            $norm['images'] = $final;
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
        abort_if(!$file->isValid(), 422, 'Tệp ảnh không hợp lệ.');
        $mime = (string) $file->getMimeType();
        abort_unless(str_starts_with($mime, 'image/'), 422, 'Chỉ chấp nhận tệp ảnh.');
    }

    /**
     * Lưu file trực tiếp vào public/storage/img/product và
     * trả về đường dẫn public: 'storage/img/product/<filename>'
     */
    protected function storeImage(UploadedFile $file): string
    {
        $publicDir = public_path(self::PUBLIC_DIR);
        // Tạo thư mục nếu chưa có
        if (!File::isDirectory($publicDir)) {
            File::makeDirectory($publicDir, 0755, true, true);
        }

        $ext = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $name = Str::uuid()->toString() . '.' . $ext;

        // Lưu file vào thư mục public/storage/img/product
        $file->move($publicDir, $name);

        // Trả về path để FE dùng luôn
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

    /** Lọc mảng URL hợp lệ cho album biến thể */
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
        if (is_array($images))
            return $images;
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
        if (!$this->isLocalProductImagePath($path))
            return;
        $full = public_path($path);
        if (is_file($full)) {
            @unlink($full);
        }
    }

    /* ------------------------ Business rules ------------------------ */

    protected function assertAttributeType($id, $type): void
    {
        if (empty($id))
            return;
        $ok = Attribute::where('id', $id)->where('type', $type)->exists();
        abort_unless($ok, 422, "Attribute {$id} is not of type {$type}");
    }

    protected function assertDiscountNotGreater($price, $discount): void
    {
        if ($price === null || $discount === null)
            return;
        if ((float) $discount > ((float) $price)) {
            abort(422, 'Giá khuyến mãi không được cao hơn giá gốc');
        }
    }
}
