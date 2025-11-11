<?php

namespace App\Http\Controllers\Api\Client;
use App\Models\Banner;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class HomeBannerController extends Controller
{
	/**
	 * Get active banner for home page
	 */
	public function active()
	{
		$banner = Banner::active()
			->with(['images' => function ($q) {
				$q->where('is_active', true)
				  ->orderBy('id', 'asc');
			}])
			->first();

		if (!$banner) {
			return response()->json([
				'message' => 'No active banner found'
			], 404);
		}

		return response()->json([
			'data' => $banner,
			'message' => 'Active banner retrieved successfully'
		]);
	}

	/**
	 * Get all banners (for client browsing)
	 */
	public function index(Request $request)
	{
		$query = Banner::query()->with(['images' => function ($q) {
			$q->where('is_active', true)
			  ->orderBy('id', 'asc');
		}]);

		// Filter by active status if provided
		if ($request->has('is_active')) {
			$query->where('is_active', $request->boolean('is_active'));
		}

		// Search by title if provided
		if ($request->filled('search')) {
			$query->where('title', 'like', '%' . $request->search . '%');
		}

		$banners = $query->latest()->paginate($request->get('per_page', 10));

		return response()->json([
			'data' => $banners,
			'message' => 'Banners retrieved successfully'
		]);
	}
}
