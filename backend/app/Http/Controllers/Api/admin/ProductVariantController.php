<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use App\Models\Attribute;
use Illuminate\Http\Request;

class ProductVariantController extends Controller
{
    // GET /admin/variants
    public function index(Request $req)
    {
        $q = ProductVariant::query()
            ->with(['product:id,name', 'size:id,value', 'color:id,value'])
            ->orderByDesc('updated_at');

        if ($pid = $req->query('product_id')) {
            $q->where('product_id', $pid);
        }
        if ($s = $req->query('search')) {
            $q->where('sku', 'like', "%{$s}%");
        }

        return response()->json(
            $q->paginate($req->integer('per_page', 20))
        );
    }

    // GET /admin/variants/trash
    public function trash(Request $req)
    {
        $q = ProductVariant::onlyTrashed()->with(['size:id,value', 'color:id,value']);

        if ($pid = $req->query('product_id')) {
            $q->where('product_id', $pid);
        }

        return response()->json(
            $q->orderByDesc('deleted_at')->paginate($req->integer('per_page', 20))
        );
    }

    // GET /admin/variants/{id}
    public function show($id)
    {
        $variant = ProductVariant::withTrashed()
            ->with(['product:id,name', 'size:id,value', 'color:id,value'])
            ->findOrFail($id);

        return response()->json($variant);
    }

    // POST /admin/variants
    public function store(Request $req)
    {
        $data = $req->validate([
            'product_id'      => 'required|exists:products,id',
            'size_id'         => 'nullable|exists:attributes,id',
            'color_id'        => 'nullable|exists:attributes,id',
            'image'           => 'nullable|string|max:255',
            'images'          => 'nullable|array',
            'images.*'        => 'string',
            'sku'             => 'nullable|string|max:100',
            'price'           => 'nullable|numeric|min:0',
            'discount_price'  => 'nullable|numeric|min:0',
            'quantity_sold'   => 'nullable|integer|min:0',
            'stock_quantity'  => 'nullable|integer|min:0',
            'is_available'    => 'nullable|boolean',
        ]);

        $this->assertAttributeType($data['size_id'] ?? null, 'size');
        $this->assertAttributeType($data['color_id'] ?? null, 'color');

        $variant = ProductVariant::create($data);
        $variant->load('size:id,value', 'color:id,value');
        return response()->json($variant, 201);
    }

    // PUT /admin/variants/{id}
    public function update(Request $req, $id)
    {
        $variant = ProductVariant::withTrashed()->findOrFail($id);

        $data = $req->validate([
            'size_id'         => 'sometimes|nullable|exists:attributes,id',
            'color_id'        => 'sometimes|nullable|exists:attributes,id',
            'image'           => 'sometimes|nullable|string|max:255',
            'images'          => 'sometimes|nullable|array',
            'images.*'        => 'string',
            'sku'             => 'sometimes|nullable|string|max:100',
            'price'           => 'sometimes|nullable|numeric|min:0',
            'discount_price'  => 'sometimes|nullable|numeric|min:0',
            'quantity_sold'   => 'sometimes|nullable|integer|min:0',
            'stock_quantity'  => 'sometimes|nullable|integer|min:0',
            'is_available'    => 'sometimes|boolean',
        ]);

        if (array_key_exists('size_id', $data))  $this->assertAttributeType($data['size_id'] ?? null, 'size');
        if (array_key_exists('color_id', $data)) $this->assertAttributeType($data['color_id'] ?? null, 'color');

        $variant->update($data);
        $variant->load('size:id,value', 'color:id,value');
        return response()->json($variant);
    }

    // DELETE /admin/variants/{id}
    public function destroy($id)
    {
        $variant = ProductVariant::findOrFail($id);
        $variant->delete();
        return response()->json(['message' => 'deleted']);
    }

    // POST /admin/variants/{id}/restore
    public function restore($id)
    {
        $variant = ProductVariant::withTrashed()->findOrFail($id);
        $variant->restore();
        return response()->json(['message' => 'restored']);
    }

    // DELETE /admin/variants/{id}/force-delete
    public function forceDelete($id)
    {
        $variant = ProductVariant::withTrashed()->findOrFail($id);
        $variant->forceDelete();
        return response()->json(['message' => 'force-deleted']);
    }

    protected function assertAttributeType($id, $type)
    {
        if (empty($id)) return;
        abort_unless(Attribute::where('id', $id)->where('type', $type)->exists(), 422, "Attribute {$id} is not of type {$type}");
    }
}
