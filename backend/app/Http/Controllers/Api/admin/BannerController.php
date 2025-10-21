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
		if ($request->boolean('with_trashed')) {
			$query->withTrashed();
		}
		return $query->latest()->paginate(10);
	}

	public function show(Banner $banner)
	{
		return $banner->load('images');
	}

	public function store(Request $request)
	{
		$data = $request->validate([
			'title' => ['required','string','max:255'],
			'is_active' => ['boolean'],
		]);

		$banner = null;
		DB::transaction(function () use (&$banner, $data) {
			$banner = Banner::create($data);
			if (!empty($data['is_active'])) {
				Banner::where('id', '<>', $banner->id)->update(['is_active' => false]);
			}
		});

		return response()->json($banner, 201);
	}

	public function update(Request $request, Banner $banner)
	{
		$data = $request->validate([
			'title' => ['sometimes','string','max:255'],
			'is_active' => ['sometimes','boolean'],
		]);

		DB::transaction(function () use ($banner, $data) {
			$banner->update($data);
			if (array_key_exists('is_active', $data) && $data['is_active']) {
				Banner::where('id', '<>', $banner->id)->update(['is_active' => false]);
			}
		});

		return $banner->fresh();
	}

	public function destroy(Banner $banner)
	{
		$banner->delete();
		return response()->noContent();
	}

	public function trash()
	{
		return Banner::onlyTrashed()->latest('deleted_at')->paginate(10);
	}

	public function restore($id)
	{
		$banner = Banner::onlyTrashed()->findOrFail($id);
		$banner->restore();
		return $banner;
	}

	public function forceDelete($id)
	{
		$banner = Banner::onlyTrashed()->findOrFail($id);
		$banner->forceDelete();
		return response()->noContent();
	}
}
