<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Banner;
use App\Models\BannerImage;

class BannerImageController extends Controller
{
	public function store(Request $request, Banner $banner)
	{
		$data = $request->validate([
			'image' => ['required','image','mimes:jpg,jpeg,png,webp','max:3072'],
			'is_active' => ['boolean'],
		]);

		$path = $request->file('image')->store('banners', 'public');

		$image = $banner->images()->create([
			'image' => $path,
			'is_active' => $request->boolean('is_active', true),
		]);

		return response()->json($image, 201);
	}

	public function update(Request $request, BannerImage $image)
	{
		$data = $request->validate([
			'image' => ['sometimes','image','mimes:jpg,jpeg,png,webp','max:3072'],
			'is_active' => ['sometimes','boolean'],
		]);

		if ($request->hasFile('image')) {
			$data['image'] = $request->file('image')->store('banners', 'public');
		}

		$image->update($data);
		return $image->fresh();
	}

	public function destroy(BannerImage $image)
	{
		$image->delete();
		return response()->noContent();
	}

	public function trash()
	{
		return BannerImage::onlyTrashed()->paginate(10);
	}

	public function restore($id)
	{
		$image = BannerImage::onlyTrashed()->findOrFail($id);
		$image->restore();
		return $image;
	}

	public function forceDelete($id)
	{
		$image = BannerImage::onlyTrashed()->findOrFail($id);
		$image->forceDelete();
		return response()->noContent();
	}
}