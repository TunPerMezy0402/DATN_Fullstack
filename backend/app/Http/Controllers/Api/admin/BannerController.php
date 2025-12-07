<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Banner;
use Illuminate\Support\Facades\DB;

class BannerController extends Controller
{
	public function index(Request $request)
	{
		$query = Banner::query()->withCount('images');
		
		// Filter by active status if provided
		if ($request->has('is_active')) {
			$query->where('is_active', $request->boolean('is_active'));
		}
		
		// Include trashed records if requested
		if ($request->boolean('with_trashed')) {
			$query->withTrashed();
		}
		
		// Search by title if provided
		if ($request->filled('search')) {
			$query->where('title', 'like', '%' . $request->search . '%');
		}
		
		return $query->latest()->paginate($request->get('per_page', 10));
	}

	public function show(Banner $banner)
	{
		return $banner->load('images');
	}

	public function store(Request $request)
	{
		$data = $request->validate([
			'title' => ['required', 'string', 'max:255'],
			'is_active' => ['sometimes', 'boolean'],
		]);

		$banner = null;
		DB::transaction(function () use (&$banner, $data) {
			$banner = Banner::create($data);
			
			// If this banner is set to active, deactivate all others
			if (isset($data['is_active']) && $data['is_active']) {
				Banner::where('id', '<>', $banner->id)
					->update(['is_active' => false]);
			}
		});

		return response()->json($banner->load('images'), 201);
	}

	public function update(Request $request, Banner $banner)
	{
		$data = $request->validate([
			'title' => ['sometimes', 'string', 'max:255'],
			'is_active' => ['sometimes', 'boolean'],
		]);

		DB::transaction(function () use ($banner, $data) {
			$banner->update($data);
			
			// If this banner is set to active, deactivate all others
			if (array_key_exists('is_active', $data) && $data['is_active']) {
				Banner::where('id', '<>', $banner->id)
					->update(['is_active' => false]);
			}
		});

		return $banner->fresh()->load('images');
	}

	public function destroy(Banner $banner)
	{
		$banner->delete();
		return response()->noContent();
	}

	public function trash(Request $request)
	{
		$query = Banner::onlyTrashed();
		
		// Search by title if provided
		if ($request->filled('search')) {
			$query->where('title', 'like', '%' . $request->search . '%');
		}
		
		return $query->latest('deleted_at')->paginate($request->get('per_page', 10));
	}

	public function restore($id)
	{
		$banner = Banner::onlyTrashed()->findOrFail($id);
		$banner->restore();
		return $banner;
	}
	// public function delete()
	public function forceDelete($id)
	{
		$banner = Banner::onlyTrashed()->findOrFail($id);
		$banner->forceDelete();
		return response()->noContent();
	}
}
	