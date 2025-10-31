<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class CategoryController extends Controller
{
    /** GET /api/admin/categories */
    public function index(Request $r)
    {
        $per = $r->integer('per_page', 20);
        $q   = Category::query()->latest('updated_at');

        if ($s = $r->query('search')) {
            $q->where('name', 'like', "%{$s}%");
        }

        $page = $q->paginate($per);
        $page->getCollection()->transform(function ($c) {
            $c->image_url = $c->image ? asset($c->image) : null;
            return $c;
        });

        return response()->json(['data' => $page]);
    }

    /** GET /api/admin/categories/trash */
    public function trash(Request $r)
    {
        $per = $r->integer('per_page', 20);
        $q   = Category::onlyTrashed()->latest('deleted_at');

        if ($s = $r->query('search')) {
            $q->where('name', 'like', "%{$s}%");
        }

        $page = $q->paginate($per);
        $page->getCollection()->transform(function ($c) {
            $c->image_url = $c->image ? asset($c->image) : null;
            return $c;
        });

        return response()->json(['data' => $page]);
    }

    /** GET /api/admin/categories/{id} */
    public function show($id)
    {
        $c = Category::withTrashed()->findOrFail($id);
        $c->image_url = $c->image ? asset($c->image) : null;
        return response()->json($c);
    }

    /** POST /api/admin/categories */
    public function store(Request $r)
    {
        $data = $r->validate([
            'name'  => 'required|string|max:255',
            'image' => 'nullable|image|max:4096',
        ]);

        $pathForDb = null;
        if ($r->hasFile('image')) {
            $dest = public_path('storage/img/category');
            if (!File::exists($dest)) File::makeDirectory($dest, 0775, true);

            $f = $r->file('image');
            $filename = time().'_'.uniqid().'.'.$f->getClientOriginalExtension();
            $f->move($dest, $filename);
            $pathForDb = 'storage/img/category/'.$filename;
        }

        $cat = Category::create([
            'name'  => $data['name'],
            'image' => $pathForDb,
        ]);

        $cat->image_url = $cat->image ? asset($cat->image) : null;
        return response()->json(['data' => $cat], 201);
    }

    /** PUT /api/admin/categories/{id} */
    public function update(Request $r, $id)
    {
        $cat  = Category::withTrashed()->findOrFail($id);
        $data = $r->validate([
            'name'  => 'sometimes|required|string|max:255',
            'image' => 'sometimes|nullable|image|max:4096',
        ]);

        if (array_key_exists('name', $data)) $cat->name = $data['name'];

        if ($r->has('image')) {
            if ($r->hasFile('image')) {
                if ($cat->image && File::exists(public_path($cat->image))) {
                    File::delete(public_path($cat->image));
                }

                $dest = public_path('storage/img/category');
                if (!File::exists($dest)) File::makeDirectory($dest, 0775, true);

                $f = $r->file('image');
                $filename = time().'_'.uniqid().'.'.$f->getClientOriginalExtension();
                $f->move($dest, $filename);
                $cat->image = 'storage/img/category/'.$filename;
            } else {
                // client gửi image=null => xoá ảnh hiện tại
                if ($cat->image && File::exists(public_path($cat->image))) {
                    File::delete(public_path($cat->image));
                }
                $cat->image = null;
            }
        }

        $cat->save();
        $cat->image_url = $cat->image ? asset($cat->image) : null;
        return response()->json(['data' => $cat]);
    }

    /** DELETE /api/admin/categories/{id} — xóa mềm */
    public function destroy($id)
    {
        $cat = Category::findOrFail($id);

        // Kiểm tra nếu category có sản phẩm
        if ($cat->products()->count() > 0) {
            return response()->json([
                'error' => 'Không thể xóa. Category đang có sản phẩm liên kết.'
            ], 400);
        }

        $cat->delete();
        return response()->json(['message' => 'deleted']);
    }

    /** POST /api/admin/categories/{id}/restore */
    public function restore($id)
    {
        $cat = Category::withTrashed()->findOrFail($id);
        $cat->restore();
        return response()->json(['message' => 'restored']);
    }

    /** DELETE /api/admin/categories/{id}/force-delete */
    public function forceDelete($id)
    {
        $cat = Category::withTrashed()->findOrFail($id);

        if ($cat->image && File::exists(public_path($cat->image))) {
            File::delete(public_path($cat->image));
        }

        $cat->forceDelete();
        return response()->json(['message' => 'force-deleted']);
    }
}
    