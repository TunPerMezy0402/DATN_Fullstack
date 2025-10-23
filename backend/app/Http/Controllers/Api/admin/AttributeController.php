<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attribute;
use Illuminate\Http\Request;

class AttributeController extends Controller
{
    // GET /admin/attributes
    public function index(Request $req)
    {
        $q = Attribute::query();

        if ($type = $req->query('type')) {
            $q->where('type', $type); // size | color
        }

        return response()->json(
            $q->orderBy('value')->paginate($req->integer('per_page', 20))
        );
    }

    // GET /admin/attributes/trash
    public function trash(Request $req)
    {
        $q = Attribute::onlyTrashed();

        if ($type = $req->query('type')) {
            $q->where('type', $type);
        }

        return response()->json(
            $q->orderBy('deleted_at', 'desc')->paginate($req->integer('per_page', 20))
        );
    }

    // GET /admin/attributes/{id}
    public function show($id)
    {
        $attr = Attribute::withTrashed()->findOrFail($id);
        return response()->json($attr);
    }

    // POST /admin/attributes
    public function store(Request $req)
    {
        $data = $req->validate([
            'type'  => 'required|string|in:size,color',
            'value' => 'required|string|max:100',
        ]);

        $attr = Attribute::create($data);
        return response()->json($attr, 201);
    }

    // PUT /admin/attributes/{id}
    public function update(Request $req, $id)
    {
        $attr = Attribute::withTrashed()->findOrFail($id);

        $data = $req->validate([
            'type'  => 'sometimes|string|in:size,color',
            'value' => 'sometimes|string|max:100',
        ]);

        $attr->update($data);
        return response()->json($attr);
    }

    // DELETE /admin/attributes/{id}
    public function destroy($id)
    {
        $attr = Attribute::findOrFail($id);
        $attr->delete();
        return response()->json(['message' => 'deleted']);
    }

    // POST /admin/attributes/{id}/restore
    public function restore($id)
    {
        $attr = Attribute::withTrashed()->findOrFail($id);
        $attr->restore();
        return response()->json(['message' => 'restored']);
    }

    // DELETE /admin/attributes/{id}/force-delete
    public function forceDelete($id)
    {
        $attr = Attribute::withTrashed()->findOrFail($id);
        $attr->forceDelete();
        return response()->json(['message' => 'force-deleted']);
    }
}
