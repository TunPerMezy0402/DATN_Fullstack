<?php

namespace App\Http\Controllers\Api\admin;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Models\BannerImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class BannerController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->input('per_page', 10);
        $keyword = $request->input('keyword'); // tìm theo title

        $banners = Banner::with('images')
            ->when($keyword, function ($q) use ($keyword) {
                $q->where('title', 'like', '%' . $keyword . '%');
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'data' => $banners->items(),
            'meta' => [
                'current_page' => $banners->currentPage(),
                'last_page' => $banners->lastPage(),
                'per_page' => $banners->perPage(),
                'total' => $banners->total(),
            ],
        ]);
    }

    public function show($id)
    {
        $banner = Banner::with('images')->find($id);
        if (!$banner) {
            return response()->json(['message' => 'Banner not found'], 404);
        }

        return response()->json(['data' => $banner]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'link' => ['nullable', 'string', 'max:500'],
            'images' => ['required', 'array', 'min:1'],
            'images.*.file' => ['nullable', 'image', 'max:5120'],
            'images.*.url' => ['nullable', 'url'],
            'images.*.is_active' => ['nullable', 'boolean'],
        ]);

        // Yêu cầu phải có ít nhất 1 file hoặc url
        $hasImageInput = collect($validated['images'])->some(function ($img) {
            return !empty($img['file']) || !empty($img['url']);
        });

        if (!$hasImageInput) {
            return response()->json(['message' => 'At least one image is required.'], 422);
        }

        return DB::transaction(function () use ($validated) {
            $banner = Banner::create([
                'title' => $validated['title'],
                'link' => $validated['link'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            foreach ($validated['images'] as $img) {
                $path = null;

                if (isset($img['file']) && $img['file']) {
                    $path = $img['file']->store('banner', 'public');
                } elseif (!empty($img['url'])) {
                    $path = $img['url'];
                }

                if ($path) {
                    BannerImage::create([
                        'banner_id' => $banner->id,
                        'image' => $path,
                        'is_active' => $img['is_active'] ?? true,
                    ]);
                }
            }

            $banner->load('images');

            return response()->json(['data' => $banner], 201);
        });
    }

    public function update(Request $request, $id)
    {
        $banner = Banner::with('images')->find($id);
        if (!$banner) {
            return response()->json(['message' => 'Banner not found'], 404);
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'link' => ['nullable', 'string', 'max:500'],
            'images' => ['sometimes', 'array'],
            'images.*.file' => ['nullable', 'image', 'max:5120'],
            'images.*.url' => ['nullable', 'url'],
            'images.*.is_active' => ['nullable', 'boolean'],
        ]);

        return DB::transaction(function () use ($banner, $validated) {
            $banner->fill([
                'title' => $validated['title'] ?? $banner->title,
                'link' => array_key_exists('link', $validated) ? $validated['link'] : $banner->link,
                'is_active' => array_key_exists('is_active', $validated) ? $validated['is_active'] : $banner->is_active,
            ]);
            $banner->save();

            if (isset($validated['images'])) {
                // Xóa ảnh cũ và file nếu cần
                foreach ($banner->images as $img) {
                    $this->deleteStoredFile($img->image);
                    $img->delete();
                }

                foreach ($validated['images'] as $img) {
                    $path = null;
                    if (isset($img['file']) && $img['file']) {
                        $path = $img['file']->store('banner', 'public');
                    } elseif (!empty($img['url'])) {
                        $path = $img['url'];
                    }

                    if ($path) {
                        BannerImage::create([
                            'banner_id' => $banner->id,
                            'image' => $path,
                            'is_active' => $img['is_active'] ?? true,
                        ]);
                    }
                }
            }

            $banner->load('images');

            return response()->json(['data' => $banner]);
        });
    }

    public function destroy($id)
    {
        $banner = Banner::find($id);
        if (!$banner) {
            return response()->json(['message' => 'Banner not found'], 404);
        }

        $banner->delete();
        return response()->json(['message' => 'Banner deleted']);
    }

    public function trash()
    {
        $banners = Banner::onlyTrashed()->with('images')->get();
        return response()->json(['data' => $banners]);
    }

    public function restore($id)
    {
        $banner = Banner::onlyTrashed()->find($id);
        if (!$banner) {
            return response()->json(['message' => 'Banner not found in trash'], 404);
        }
        $banner->restore();
        return response()->json(['message' => 'Banner restored']);
    }

    public function forceDelete($id)
    {
        $banner = Banner::withTrashed()->with('images')->find($id);
        if (!$banner) {
            return response()->json(['message' => 'Banner not found'], 404);
        }

        foreach ($banner->images as $img) {
            $this->deleteStoredFile($img->image);
            $img->delete();
        }

        $banner->forceDelete();
        return response()->json(['message' => 'Banner permanently deleted']);
    }

    private function deleteStoredFile(?string $path): void
    {
        if (!$path) {
            return;
        }

        // Chỉ xoá file nếu là đường dẫn nội bộ (không phải URL)
        if (!str_starts_with($path, 'http://') && !str_starts_with($path, 'https://')) {
            $cleanPath = str_starts_with($path, 'storage/') ? substr($path, 8) : $path;
            Storage::disk('public')->delete($cleanPath);
        }
    }
}
