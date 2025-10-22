<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Http\UploadedFile;

class UploadController extends Controller
{
    /**
     * Upload a single file
     */
    public function upload(Request $request): JsonResponse
    {
        try {
            // Validate request
            $request->validate([
                'file' => 'required|file|image|max:8192', // Max 8MB
                'old_url' => 'nullable|string', // URL của ảnh cũ cần xóa
            ]);

            $file = $request->file('file');
            $oldUrl = $request->input('old_url');
            
            if (!$file->isValid()) {
                return response()->json([
                    'success' => false,
                    'message' => 'File không hợp lệ'
                ], 422);
            }

            // Xóa ảnh cũ nếu có
            if ($oldUrl) {
                $this->deleteOldImage($oldUrl);
            }

            // Generate unique filename
            $extension = $file->getClientOriginalExtension();
            $filename = Str::uuid() . '.' . $extension;
            
            // Store file in public storage
            $path = $file->storeAs('public/img/product', $filename);
            
            // Get public URL
            $url = Storage::url($path);
            
            return response()->json([
                'success' => true,
                'message' => 'Upload thành công',
                'url' => $url,
                'data' => [
                    'url' => $url,
                    'filename' => $filename,
                    'original_name' => $file->getClientOriginalName(),
                    'size' => $file->getSize(),
                    'mime_type' => $file->getMimeType()
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi upload: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload multiple files
     */
    public function uploadMultiple(Request $request): JsonResponse
    {
        try {
            // Validate request
            $request->validate([
                'files' => 'required|array|max:10',
                'files.*' => 'file|image|max:8192', // Max 8MB per file
            ]);

            $files = $request->file('files');
            $uploadedFiles = [];

            foreach ($files as $file) {
                if ($file->isValid()) {
                    // Generate unique filename
                    $extension = $file->getClientOriginalExtension();
                    $filename = Str::uuid() . '.' . $extension;
                    
                    // Store file in public storage
                    $path = $file->storeAs('public/img/product', $filename);
                    
                    // Get public URL
                    $url = Storage::url($path);
                    
                    $uploadedFiles[] = [
                        'url' => $url,
                        'filename' => $filename,
                        'original_name' => $file->getClientOriginalName(),
                        'size' => $file->getSize(),
                        'mime_type' => $file->getMimeType()
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Upload thành công ' . count($uploadedFiles) . ' file(s)',
                'data' => $uploadedFiles
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi upload: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete uploaded file
     */
    public function delete(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'url' => 'required|string'
            ]);

            $url = $request->input('url');
            
            // Extract path from URL
            $path = str_replace('/storage/', 'public/', $url);
            
            if (Storage::exists($path)) {
                Storage::delete($path);
                
                return response()->json([
                    'success' => true,
                    'message' => 'Xóa file thành công'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'File không tồn tại'
                ], 404);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi xóa file: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete old image when uploading new one
     */
    private function deleteOldImage(string $oldUrl): void
    {
        try {
            // Extract path from URL
            $path = str_replace('/storage/', 'public/', $oldUrl);
            
            // Only delete if it's in our product directory
            if (str_contains($path, 'public/img/product/') && Storage::exists($path)) {
                Storage::delete($path);
            }
        } catch (\Exception $e) {
            // Log error but don't throw exception to avoid breaking upload
            \Log::warning('Failed to delete old image: ' . $e->getMessage());
        }
    }
}
