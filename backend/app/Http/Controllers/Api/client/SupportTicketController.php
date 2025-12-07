<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class SupportTicketController extends Controller
{
    /**
     * Lấy danh sách ticket của user hiện tại (có pagination)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $userId = Auth::id();
            
            $query = SupportTicket::where('user_id', $userId)
                ->orderBy('created_at', 'desc');

            // Filter theo status nếu có
            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            }

            $tickets = $query->paginate($request->get('per_page', 20));

            return response()->json($tickets);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Lỗi khi lấy danh sách ticket',
            ], 500);
        }
    }

    /**
     * Xem chi tiết ticket của user
     */
    public function show(Request $request, $id): JsonResponse
    {
        try {
            $userId = Auth::id();
            
            $ticket = SupportTicket::where('id', $id)
                ->where('user_id', $userId)
                ->with('user')
                ->firstOrFail();

            return response()->json($ticket);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Ticket không tìm thấy hoặc bạn không có quyền truy cập',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Lỗi khi lấy chi tiết ticket',
            ], 500);
        }
    }

    /**
     * Tạo ticket mới
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'subject' => 'required|string|max:255',
                'message' => 'required|string|max:5000',
            ], [
                'subject.required' => 'Tiêu đề không được để trống',
                'subject.max'      => 'Tiêu đề không được vượt quá 255 ký tự',
                'message.required' => 'Nội dung không được để trống',
                'message.max'      => 'Nội dung không được vượt quá 5000 ký tự',
            ]);

            $ticket = SupportTicket::create([
                'user_id' => Auth::id(),
                'subject' => $validated['subject'],
                'message' => $validated['message'],
                'status'  => 'open',
            ]);

            return response()->json([
                'message' => 'Ticket được tạo thành công',
                'data'    => $ticket,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ',
                'errors'  => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Lỗi khi tạo ticket',
            ], 500);
        }
    }

    /**
     * User hủy ticket của mình (chỉ ticket "open" mới có thể hủy)
     */
    public function cancel(Request $request, $id): JsonResponse
    {
        try {
            $userId = Auth::id();
            
            $ticket = SupportTicket::where('id', $id)
                ->where('user_id', $userId)
                ->firstOrFail();

            // Chỉ cho phép hủy ticket ở trạng thái "open"
            if ($ticket->status !== 'open') {
                return response()->json([
                    'message' => 'Chỉ có thể hủy ticket ở trạng thái mới',
                ], 422);
            }

            $ticket->status = 'closed';
            $ticket->save();

            return response()->json([
                'message' => 'Hủy ticket thành công',
                'data'    => $ticket,
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Ticket không tìm thấy',
            ], 404);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Lỗi khi hủy ticket',
            ], 500);
        }
    }
}