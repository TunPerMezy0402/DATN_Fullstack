<?php

namespace App\Http\Controllers\Api\Client;
use App\Models\Banner;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class HomeBannerController extends Controller
{
	public function active()
	{
		$banner = Banner::active()
			->with(['images' => function ($q) {
				$q->where('is_active', true);
			}])
			->first();

		return $banner ?: response()->json(null, 204);
	}
}
