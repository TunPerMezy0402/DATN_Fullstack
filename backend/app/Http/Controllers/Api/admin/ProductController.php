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

    /* ====================== LIST / TRASH / SHOW ====================== */

    public function index(Request $req)
    {
        $q = Product::query()
            ->with([
                'category:id,name',
                'variants.size:id,value',
                'variants.color:id,value',
            ])
            ->orderByDesc('updated_at');

        if ($s = trim((string)$req->query('search', ''))) {
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

        if ($s = trim((string)$req->query('search', ''))) {
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
                'category:id,name',
                'variants' => fn ($v) => $v->orderBy('id', 'asc'),
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
                'name'             => $data['name'],
                'sku'              => $data['sku'] ?? null,
                'category_id'      => $data['category_id'] ?? null,
                'description'      => $data['description'] ?? null,
                'origin'           => $data['origin'] ?? null,
                'brand'            => $data['brand'] ?? null,
                'image'            => $productImage, // 'storage/img/product/xxx.jpg' | null
                'variation_status' => !empty($data['variation_status']) ? 1 : 0,
            ]);

            // Variants
            if (!empty($data['variants']) && is_array($data['variants'])) {
                foreach ($data['variants'] as $i => $v) {
                    $norm = $this->normalizeVariantInput($req, $v, $i);
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

            $product->update([
                'name'             => $data['name']             ?? $product->name,
                'sku'              => array_key_exists('sku', $data) ? $data['sku'] : $product->sku,
                'category_id'      => array_key_exists('category_id', $data) ? $data['category_id'] : $product->category_id,
                'description'      => array_key_exists('description', $data) ? $data['description'] : $product->description,
                'origin'           => array_key_exists('origin', $data) ? $data['origin'] : $product->origin,
                'brand'            => array_key_exists('brand', $data) ? $data['brand'] : $product->brand,
                'image'            => $imageToSave,
                'variation_status' => array_key_exists('variation_status', $data)
                    ? (!empty($data['variation_status']) ? 1 : 0)
                    : $product->variation_status,
            ]);

            // Upsert variants
            if (array_key_exists('variants', $data) && is_array($data['variants'])) {
                $incoming    = $data['variants'];
                $existingIds = ProductVariant::where('product_id', $product->id)->pluck('id')->all();
                $keepIds     = [];

                foreach ($incoming as $i => $v) {
                    $norm = $this->normalizeVariantInput($req, $v, $i);
                    $this->assertAttributeType($norm['size_id'] ?? null, 'size');
                    $this->assertAttributeType($norm['color_id'] ?? null, 'color');
                    $this->assertDiscountNotGreater($norm['price'] ?? null, $norm['discount_price'] ?? null);

                    $variantId = Arr::get($v, 'id');
                    if ($variantId) {
                        $pv = ProductVariant::where('product_id', $product->id)->where('id', $variantId)->first();
                        if ($pv) {
                            $pv->update($norm);
                            $keepIds[] = $pv->id;
                        } else {
                            $created = $product->variants()->create($norm);
                            $keepIds[] = $created->id;
                        }
                    } else {
                        $created = $product->variants()->create($norm);
                        $keepIds[] = $created->id;
                    }
                }

                $toDelete = array_diff($existingIds, $keepIds);
                if (!empty($toDelete)) {
                    ProductVariant::where('product_id', $product->id)
                        ->whereIn('id', $toDelete)
                        ->delete();
                }
            }

            $product->load([
                'category:id,name',
                'variants' => fn ($q) => $q->orderBy('id', 'asc'),
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
        ProductVariant::withTrashed()->where('product_id', $product->id)->forceDelete();
        $product->forceDelete();
        return response()->json(['message' => 'force-deleted']);
    }

    /* ====================== VALIDATION & HELPERS ====================== */

    protected function validateProduct(Request $req, bool $isCreate): array
    {
        $baseRules = [
            'name'             => [$isCreate ? 'required' : 'sometimes', 'string', 'max:255'],
            'sku'              => ['sometimes', 'nullable', 'string', 'max:100'],
            'category_id'      => ['sometimes', 'nullable', Rule::exists('categories', 'id')],
            'description'      => ['sometimes', 'nullable', 'string'],
            'origin'           => ['sometimes', 'nullable', 'string', 'max:100'],
            'brand'            => ['sometimes', 'nullable', 'string', 'max:100'],

            // Product: chỉ 1 ảnh
            'image'            => ['sometimes', 'nullable'],

            'variation_status' => ['sometimes', 'boolean'],

            'variants'                      => ['sometimes', 'array'],
            'variants.*.id'                 => ['sometimes', 'integer', Rule::exists('product_variants', 'id')],
            'variants.*.size_id'            => ['sometimes', 'nullable', Rule::exists('attributes', 'id')],
            'variants.*.color_id'           => ['sometimes', 'nullable', Rule::exists('attributes', 'id')],
            'variants.*.image'              => ['sometimes', 'nullable'], // file hoặc URL
            'variants.*.images'             => ['sometimes', 'nullable'], // mảng file hoặc URL
            'variants.*.sku'                => ['sometimes', 'nullable', 'string', 'max:100'],
            'variants.*.price'              => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'variants.*.discount_price'     => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'variants.*.stock_quantity'     => ['sometimes', 'nullable', 'integer', 'min:0'],
            'variants.*.is_available'       => ['sometimes', 'boolean'],
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

    /** Chuẩn hoá biến thể + upload ảnh chính/album vào public/storage/img/product */
    protected function normalizeVariantInput(Request $req, array $v, ?int $index = null): array
    {
        // Ảnh chính (1 ảnh)
        $singleImage = null;
        if ($index !== null && $req->hasFile("variants.$index.image")) {
            $file = $req->file("variants.$index.image");
            $this->validateUploadImage($file);
            $singleImage = $this->storeImage($file);
        } else {
            $singleImage = $this->stringOrNull(Arr::get($v, 'image'));
        }

        // Album (nhiều ảnh)
        $multiImages = [];
        if ($index !== null && $req->hasFile("variants.$index.images")) {
            $files = $req->file("variants.$index.images");
            $files = is_array($files) ? $files : [$files];
            foreach ($files as $f) {
                if ($f instanceof UploadedFile) {
                    $this->validateUploadImage($f);
                    $multiImages[] = $this->storeImage($f);
                }
            }
        } else {
            $multiImages = $this->filterImageStrings(Arr::get($v, 'images'));
        }

        $price         = Arr::get($v, 'price');
        $discountPrice = Arr::get($v, 'discount_price');

        return [
            'size_id'        => Arr::get($v, 'size_id'),
            'color_id'       => Arr::get($v, 'color_id'),
            'image'          => $singleImage,           // 'storage/img/product/..' | null
            'images'         => array_values($multiImages), // album URL
            'sku'            => Arr::get($v, 'sku'),
            'price'          => $price !== null ? (string) +$price : null,
            'discount_price' => $discountPrice !== null ? (string) +$discountPrice : null,
            'stock_quantity' => (int) Arr::get($v, 'stock_quantity', 0),
            'is_available'   => (bool) Arr::get($v, 'is_available', true),
        ];
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

        $ext  = strtolower($file->getClientOriginalExtension() ?: 'jpg');
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

    /* ------------------------ Business rules ------------------------ */

    protected function assertAttributeType($id, $type): void
    {
        if (empty($id)) return;
        $ok = Attribute::where('id', $id)->where('type', $type)->exists();
        abort_unless($ok, 422, "Attribute {$id} is not of type {$type}");
    }

    protected function assertDiscountNotGreater($price, $discount): void
    {
        if ($price === null || $discount === null) return;
        if ((float)$discount > ((float)$price)) {
            abort(422, 'Giá khuyến mãi không được cao hơn giá gốc');
        }
    }
}
