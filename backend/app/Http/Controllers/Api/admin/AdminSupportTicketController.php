<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminSupportTicketController extends Controller
{
    /**
     * Danh sách tất cả ticket (có filter theo status)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = SupportTicket::with('user')->orderBy('created_at', 'desc');

            // Filter theo status nếu có
            $status = $request->query('status'); // Lấy từ query string (?status=open)
            
            if ($status && $status !== 'all') {
                $query->where('status', $status);
            }

            $perPage = $request->query('per_page', 20);
            $tickets = $query->paginate($perPage);

            return response()->json($tickets);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Lỗi khi lấy danh sách ticket',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Chi tiết ticket cụ thể
     */
    public function show($id): JsonResponse
    {
        try {
            $ticket = SupportTicket::with('user')->findOrFail($id);
            return response()->json($ticket);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Ticket không tìm thấy',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Lỗi khi lấy chi tiết ticket',
            ], 500);
        }
    }

    /**
     * Cập nhật trạng thái ticket
     */
    public function updateStatus(Request $request, $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'status' => 'required|in:open,in_progress,closed',
            ], [
                'status.required' => 'Trạng thái không được để trống',
                'status.in'       => 'Trạng thái không hợp lệ',
            ]);

            $ticket = SupportTicket::findOrFail($id);
            $ticket->status = $validated['status'];
            $ticket->save();

            return response()->json([
                'message' => 'Cập nhật trạng thái thành công',
                'data'    => $ticket,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Ticket không tìm thấy',
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ',
                'errors'  => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Lỗi khi cập nhật trạng thái',
            ], 500);
        }
    }

    /**
     * Admin cập nhật nội dung ticket
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'subject' => 'nullable|string|max:255',
                'message' => 'nullable|string|max:5000',
            ], [
                'subject.max' => 'Tiêu đề không được vượt quá 255 ký tự',
                'message.max' => 'Nội dung không được vượt quá 5000 ký tự',
            ]);

            $ticket = SupportTicket::findOrFail($id);
            $ticket->update($validated);

            return response()->json([
                'message' => 'Cập nhật ticket thành công',
                'data'    => $ticket,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Ticket không tìm thấy',
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ',
                'errors'  => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Lỗi khi cập nhật ticket',
            ], 500);
        }
    }

    /**
     * Xóa ticket
     */
    public function destroy($id): JsonResponse
    {
        try {
            $ticket = SupportTicket::findOrFail($id);
            $ticket->delete();

            return response()->json([
                'message' => 'Xóa ticket thành công',
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Ticket không tìm thấy',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Lỗi khi xóa ticket',
            ], 500);
        }
    }
}