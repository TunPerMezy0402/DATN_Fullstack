<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\ChatRoom;
use App\Models\Message;
use App\Models\SupportAgent;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class ClientChatController extends Controller
{
    /**
     * Lấy danh sách phòng chat của user - ✅ ĐÃ TỐI ƯU
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $query = ChatRoom::where('user_id', $user->id)
            ->with([
                'agent.user:id,name,image',
                'messages' => function ($query) {
                    $query->latest()->limit(1);
                }
            ])
            // ✅ Tối ưu: Đếm unread_count bằng withCount thay vì query riêng
            ->withCount([
                'messages as unread_count' => function ($query) {
                    $query->where('sender_type', 'agent')
                        ->where('is_read', false);
                }
            ]);

        // Lọc theo trạng thái
        if ($request->has('status') && in_array($request->status, ['open', 'closed'])) {
            $query->where('status', $request->status);
        }

        $chatRooms = $query->orderBy('updated_at', 'desc')
            ->get()
            ->map(function ($room) {
                $lastMessage = $room->messages->first();

                return [
                    'id' => $room->id,
                    'subject' => $room->subject,
                    'status' => $room->status,
                    'created_at' => $room->created_at->format('d/m/Y H:i'),
                    'updated_at' => $room->updated_at->format('d/m/Y H:i'),
                    'closed_at' => $room->closed_at?->format('d/m/Y H:i'),
                    'agent' => $room->agent ? [
                        'id' => $room->agent->id,
                        'name' => $room->agent->user->name,
                        'image' => $room->agent->user->image,
                        'rating' => $room->agent->rating ?? 0,
                        'status' => $room->agent->status,
                    ] : null,
                    'last_message' => $lastMessage ? [
                        'content' => $lastMessage->content ?? '',
                        'has_attachment' => !empty($lastMessage->attachment),
                        'sender_type' => $lastMessage->sender_type,
                        'created_at' => $lastMessage->created_at->format('H:i d/m/Y'),
                    ] : null,
                    'unread_count' => $room->unread_count, // ✅ Từ withCount
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $chatRooms
        ]);
    }

    public function show($id)
    {
        $user = Auth::user();

        $chatRoom = ChatRoom::where('id', $id)
            ->where('user_id', $user->id)
            ->with(['agent.user:id,name,image,email'])
            ->first();

        if (!$chatRoom) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy phòng chat'
            ], 404);
        }

        // ✅ Đánh dấu tin nhắn của agent là đã đọc
        Message::where('chat_room_id', $chatRoom->id)
            ->where('sender_type', 'agent')
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $chatRoom->id,
                'subject' => $chatRoom->subject,
                'status' => $chatRoom->status,
                'created_at' => $chatRoom->created_at->format('d/m/Y H:i'),
                'updated_at' => $chatRoom->updated_at->format('d/m/Y H:i'),
                'closed_at' => $chatRoom->closed_at?->format('d/m/Y H:i'),
                'rating' => $chatRoom->rating,
                'feedback' => $chatRoom->feedback,
                'agent' => $chatRoom->agent ? [
                    'id' => $chatRoom->agent->id,
                    'name' => $chatRoom->agent->user->name,
                    'image' => $chatRoom->agent->user->image,
                    'email' => $chatRoom->agent->user->email,
                    'rating' => $chatRoom->agent->rating ?? 0,
                    'status' => $chatRoom->agent->status,
                ] : null,
            ]
        ]);
    }

    /**
     * Gửi tin nhắn - ✅ ĐÃ HOÀN THIỆN
     */
    public function sendMessage(Request $request, $id)
    {
        // ✅ Validation chặt chẽ hơn
        $validated = $request->validate([
            'content' => 'required_without:attachment|nullable|string|max:1000',
            'attachment' => 'required_without:content|nullable|file|max:10240|mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,txt,zip'
        ], [
            'content.required_without' => 'Vui lòng nhập nội dung hoặc đính kèm file',
            'attachment.required_without' => 'Vui lòng nhập nội dung hoặc đính kèm file'
        ]);

        $user = Auth::user();

        $chatRoom = ChatRoom::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$chatRoom) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy phòng chat'
            ], 404);
        }

        if ($chatRoom->status !== 'open') {
            return response()->json([
                'success' => false,
                'message' => 'Phòng chat đã đóng. Vui lòng tạo phòng chat mới.'
            ], 400);
        }

        DB::beginTransaction();
        try {
            $attachmentPath = null;
            $attachmentType = null;

            // ✅ Xử lý file upload
            if ($request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $attachmentPath = $this->handleFileUpload($file);
                $attachmentType = $this->getAttachmentType($file);
            }

            // ✅ Tạo tin nhắn với content an toàn
            $message = Message::create([
                'chat_room_id' => $chatRoom->id,
                'sender_id' => $user->id,
                'sender_type' => 'user',
                'content' => $validated['content'] ?? '', // ✅ Luôn có giá trị
                'attachment' => $attachmentPath,
                'is_read' => false
            ]);

            // ✅ Update timestamp phòng chat
            $chatRoom->touch();

            // Gửi thông báo cho agent
            if ($chatRoom->agent) {
                $notificationMessage = $attachmentPath
                    ? "Khách hàng {$user->name} đã gửi " . ($attachmentType === 'image' ? 'ảnh' : 'file')
                    : "Khách hàng {$user->name}: " . mb_substr($validated['content'] ?? '', 0, 50);

                Notification::create([
                    'user_id' => $chatRoom->agent->user_id,
                    'title' => 'Tin nhắn mới',
                    'message' => $notificationMessage,
                    'related_chat_room_id' => $chatRoom->id,
                    'is_read' => false
                ]);
            }

            DB::commit();

            return response()->json([
    'success' => true,
    'message' => 'Gửi tin nhắn thành công',
    'data' => [
        'id' => $message->id,
        'content' => $message->content,
        'attachment' => $message->attachment,
        'attachment_type' => $attachmentType,
        'attachment_url' => $message->attachment 
            ? url('storage/' . $message->attachment)
            : null,
        'sender_type' => $message->sender_type,
        'sender_name' => $user->name,
        'sender_image' => $user->image,
        'is_read' => false,
        'created_at' => $message->created_at->format('H:i d/m/Y'),
        'timestamp' => $message->created_at->timestamp,
    ]
], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            // ✅ Xóa file nếu có lỗi
            if (isset($attachmentPath) && Storage::disk('public')->exists($attachmentPath)) {
                Storage::disk('public')->delete($attachmentPath);
            }

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi gửi tin nhắn',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Lấy danh sách tin nhắn - ✅ ĐÃ TỐI ƯU
     */
    public function getMessages($id, Request $request)
    {
        $user = Auth::user();

        $chatRoom = ChatRoom::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$chatRoom) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy phòng chat'
            ], 404);
        }

        // ✅ Pagination cho messages
        $perPage = $request->input('per_page', 50);

        $messages = Message::where('chat_room_id', $chatRoom->id)
            ->with('sender:id,name,image')
            ->orderBy('created_at', 'asc')
            ->paginate($perPage);

        // ✅ Đánh dấu đã đọc (chỉ messages của agent)
        Message::where('chat_room_id', $chatRoom->id)
            ->where('sender_type', 'agent')
            ->where('is_read', false)
            ->update(['is_read' => true]);

        $data = $messages->map(function ($message) {
    $attachmentType = null;
    if ($message->attachment) {
        $extension = strtolower(pathinfo($message->attachment, PATHINFO_EXTENSION));
        $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        $attachmentType = in_array($extension, $imageExtensions) ? 'image' : 'file';
    }

    return [
        'id' => $message->id,
        'content' => $message->content,
        'attachment' => $message->attachment,
        'attachment_type' => $attachmentType,
        'attachment_url' => $message->attachment 
            ? url('storage/' . $message->attachment)
            : null,
        'sender_type' => $message->sender_type,
        'sender_name' => $message->sender->name,
        'sender_image' => $message->sender->image,
        'is_read' => $message->is_read,
        'created_at' => $message->created_at->format('H:i d/m/Y'),
        'timestamp' => $message->created_at->timestamp,
    ];
});

        return response()->json([
            'success' => true,
            'data' => $data,
            'pagination' => [
                'current_page' => $messages->currentPage(),
                'last_page' => $messages->lastPage(),
                'per_page' => $messages->perPage(),
                'total' => $messages->total(),
            ]
        ]);
    }

    /**
     * Đóng phòng chat - ✅ ĐÃ CẢI THIỆN
     */
    public function closeRoom($id)
    {
        $user = Auth::user();

        $chatRoom = ChatRoom::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$chatRoom) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy phòng chat'
            ], 404);
        }

        if ($chatRoom->status === 'closed') {
            return response()->json([
                'success' => false,
                'message' => 'Phòng chat đã đóng trước đó'
            ], 400);
        }

        DB::beginTransaction();
        try {
            $chatRoom->update([
                'status' => 'closed',
                'closed_at' => now()
            ]);

            // ✅ Giảm current_chats của agent
            if ($chatRoom->agent) {
                $chatRoom->agent->decrement('current_chats');

                Notification::create([
                    'user_id' => $chatRoom->agent->user_id,
                    'title' => 'Phòng chat đã đóng',
                    'message' => "Khách hàng {$user->name} đã đóng phòng chat: {$chatRoom->subject}",
                    'related_chat_room_id' => $chatRoom->id,
                    'is_read' => false
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đóng phòng chat thành công'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi đóng phòng chat',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Đánh giá agent - ✅ LOGIC CẢI THIỆN: HỖ TRỢ TRƯỜNG HỢP KHÔNG CÓ AGENT
     */
    public function rateAgent(Request $request, $id)
    {
        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'feedback' => 'nullable|string|max:500'
        ]);

        $user = Auth::user();

        $chatRoom = ChatRoom::where('id', $id)
            ->where('user_id', $user->id)
            ->where('status', 'closed')
            ->first();

        if (!$chatRoom) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy phòng chat hoặc phòng chat chưa đóng'
            ], 404);
        }

        // ✅ Kiểm tra đã đánh giá chưa (không cần phải có agent)
        if ($chatRoom->rating) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn đã đánh giá phòng chat này rồi'
            ], 400);
        }

        DB::beginTransaction();
        try {
            // ✅ Lưu rating vào chat_room (dù có agent hay không)
            $chatRoom->update([
                'rating' => $validated['rating'],
                'feedback' => $validated['feedback'] ?? null
            ]);

            // ✅ Chỉ cập nhật rating agent nếu có agent
            if ($chatRoom->assigned_to) {
                $agent = $chatRoom->agent;

                if ($agent) {
                    // Tính lại rating trung bình chính xác
                    $avgRating = ChatRoom::where('assigned_to', $agent->id)
                        ->where('status', 'closed')
                        ->whereNotNull('rating')
                        ->avg('rating');

                    $agent->update(['rating' => round($avgRating, 2)]);

                    // Thông báo cho agent
                    Notification::create([
                        'user_id' => $agent->user_id,
                        'title' => 'Đánh giá mới',
                        'message' => "Khách hàng {$user->name} đã đánh giá {$validated['rating']} sao",
                        'related_chat_room_id' => $chatRoom->id,
                        'is_read' => false
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Cảm ơn bạn đã đánh giá!',
                'data' => [
                    'agent_new_rating' => $chatRoom->assigned_to ? ($chatRoom->agent->rating ?? 0) : null
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Rate agent error: ' . $e->getMessage(), [
                'user_id' => Auth::id(),
                'chat_room_id' => $id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi đánh giá',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Đếm số tin nhắn chưa đọc - ✅ ĐÃ TỐI ƯU
     */
    public function unreadCount()
    {
        $user = Auth::user();

        $unreadCount = Message::whereHas('chatRoom', function ($query) use ($user) {
            $query->where('user_id', $user->id)
                ->where('status', 'open');
        })
            ->where('sender_type', 'agent')
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'unread_count' => $unreadCount
        ]);
    }

    /**
     * Tìm kiếm phòng chat - ✅ ĐÃ CẢI THIỆN
     */
    public function search(Request $request)
    {
        $validated = $request->validate([
            'keyword' => 'required|string|min:1|max:100'
        ]);

        $user = Auth::user();
        $keyword = $validated['keyword'];

        $chatRooms = ChatRoom::where('user_id', $user->id)
            ->where(function ($query) use ($keyword) {
                $query->where('subject', 'like', "%{$keyword}%")
                    ->orWhereHas('messages', function ($q) use ($keyword) {
                        $q->where('content', 'like', "%{$keyword}%");
                    });
            })
            ->with([
                'agent.user:id,name,image',
                'messages' => function ($query) {
                    $query->latest()->limit(1);
                }
            ])
            ->orderBy('updated_at', 'desc')
            ->get()
            ->map(function ($room) {
                $lastMessage = $room->messages->first();

                return [
                    'id' => $room->id,
                    'subject' => $room->subject,
                    'status' => $room->status,
                    'created_at' => $room->created_at->format('d/m/Y H:i'),
                    'agent' => $room->agent ? [
                        'name' => $room->agent->user->name,
                        'image' => $room->agent->user->image,
                    ] : null,
                    'last_message' => $lastMessage ? [
                        'content' => $lastMessage->content ?? '',
                        'created_at' => $lastMessage->created_at->format('H:i d/m/Y'),
                    ] : null,
                ];
            });

        return response()->json([
            'success' => true,
            'keyword' => $keyword,
            'count' => $chatRooms->count(),
            'data' => $chatRooms
        ]);
    }

    /**
     * ✅ THÊM MỚI: Lấy file đính kèm với bảo mật
     */
    public function getAttachment($filename)
    {
        try {
            $user = Auth::user();
            $path = "chat_attachments/{$filename}";

            // Kiểm tra quyền truy cập
            $message = Message::where('attachment', $path)
                ->whereHas('chatRoom', function ($query) use ($user) {
                    $query->where('user_id', $user->id);
                })
                ->first();

            if (!$message) {
                abort(404, 'File không tồn tại hoặc bạn không có quyền truy cập');
            }

            if (!Storage::disk('public')->exists($path)) {
                abort(404, 'File không tồn tại');
            }

            $filePath = storage_path("app/public/{$path}");
            $mimeType = mime_content_type($filePath);

            return response()->file($filePath, [
                'Content-Type' => $mimeType,
                'Content-Disposition' => 'inline; filename="' . basename($path) . '"',
                'Cache-Control' => 'public, max-age=31536000',
            ]);

        } catch (\Exception $e) {
            Log::error('Get attachment error: ' . $e->getMessage(), [
                'filename' => $filename,
                'user_id' => Auth::id()
            ]);
            abort(404);
        }
    }

    private function handleFileUpload($file): string
    {
        $fileName = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
        return $file->storeAs('chat_attachments', $fileName, 'public');
    }
    private function getAttachmentType($file): string
    {
        $mimeType = $file->getMimeType();
        return str_starts_with($mimeType, 'image/') ? 'image' : 'file';
    }

    // ========== THÊM ENDPOINT: Lấy thông báo của user ==========
/**
 * Lấy danh sách thông báo chưa đọc
 */
public function getNotifications(Request $request)
{
    $user = Auth::user();
    
    $notifications = Notification::where('user_id', $user->id)
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(function($notification) {
            return [
                'id' => $notification->id,
                'title' => $notification->title,
                'message' => $notification->message,
                'is_read' => $notification->is_read,
                'related_chat_room_id' => $notification->related_chat_room_id,
                'created_at' => $notification->created_at->format('H:i d/m/Y'),
                'timestamp' => $notification->created_at->timestamp,
            ];
        });

    return response()->json([
        'success' => true,
        'data' => $notifications,
        'unread_count' => $notifications->where('is_read', false)->count()
    ]);
}

/**
 * Đánh dấu thông báo đã đọc
 */
public function markNotificationAsRead($notificationId)
{
    $user = Auth::user();
    
    $notification = Notification::where('id', $notificationId)
        ->where('user_id', $user->id)
        ->first();

    if (!$notification) {
        return response()->json([
            'success' => false,
            'message' => 'Không tìm thấy thông báo'
        ], 404);
    }

    $notification->update(['is_read' => true]);

    return response()->json([
        'success' => true,
        'message' => 'Đánh dấu thông báo đã đọc'
    ]);
}

/**
 * Đánh dấu tất cả thông báo đã đọc
 */
public function markAllNotificationsAsRead()
{
    $user = Auth::user();
    
    Notification::where('user_id', $user->id)
        ->where('is_read', false)
        ->update(['is_read' => true]);

    return response()->json([
        'success' => true,
        'message' => 'Đánh dấu tất cả thông báo đã đọc'
    ]);
}

// ========== THÊM ENDPOINT: Quản lý Support Agents ==========
/**
 * Lấy danh sách agent (cho client xem)
 */
public function getAvailableAgents(Request $request)
{
    $agents = SupportAgent::with('user:id,name,image,email')
        ->where('status', '!=', 'offline')
        ->whereColumn('current_chats', '<', 'max_chats')
        ->get()
        ->map(function($agent) {
            return [
                'id' => $agent->id,
                'name' => $agent->user->name,
                'image' => $agent->user->image,
                'email' => $agent->user->email,
                'rating' => $agent->rating ?? 0,
                'status' => $agent->status,
                'current_chats' => $agent->current_chats,
                'max_chats' => $agent->max_chats,
                'availability' => $agent->max_chats - $agent->current_chats
            ];
        });

    return response()->json([
        'success' => true,
        'data' => $agents,
        'total' => $agents->count()
    ]);
}

/**
 * Lấy thống kê agent (cho admin dashboard)
 */
public function getAgentStats($agentId)
{
    $agent = SupportAgent::with('user:id,name,email')
        ->find($agentId);

    if (!$agent) {
        return response()->json([
            'success' => false,
            'message' => 'Không tìm thấy agent'
        ], 404);
    }

    // Thống kê phòng chat
    $totalRooms = ChatRoom::where('assigned_to', $agentId)->count();
    $closedRooms = ChatRoom::where('assigned_to', $agentId)
        ->where('status', 'closed')
        ->count();
    $openRooms = $agent->current_chats;
    
    // Thống kê đánh giá
    $ratedRooms = ChatRoom::where('assigned_to', $agentId)
        ->where('status', 'closed')
        ->whereNotNull('rating')
        ->get();
    
    $avgRating = $ratedRooms->avg('rating');
    $ratingDistribution = [
        '5_star' => $ratedRooms->where('rating', 5)->count(),
        '4_star' => $ratedRooms->where('rating', 4)->count(),
        '3_star' => $ratedRooms->where('rating', 3)->count(),
        '2_star' => $ratedRooms->where('rating', 2)->count(),
        '1_star' => $ratedRooms->where('rating', 1)->count(),
    ];

    return response()->json([
        'success' => true,
        'data' => [
            'agent' => [
                'id' => $agent->id,
                'name' => $agent->user->name,
                'email' => $agent->user->email,
                'rating' => round($avgRating, 2),
                'status' => $agent->status,
            ],
            'chat_stats' => [
                'total_chats' => $totalRooms,
                'closed_chats' => $closedRooms,
                'open_chats' => $openRooms,
                'max_concurrent' => $agent->max_chats,
            ],
            'rating_stats' => [
                'average' => round($avgRating, 2),
                'total_rated' => $ratedRooms->count(),
                'distribution' => $ratingDistribution,
            ],
            'response_quality' => [
                'avg_rating' => round($avgRating, 2),
                'rating_level' => $avgRating >= 4.5 ? 'Xuất sắc' : ($avgRating >= 4 ? 'Rất tốt' : ($avgRating >= 3 ? 'Tốt' : 'Cần cải thiện'))
            ]
        ]
    ]);
}

// ========== CẢI THIỆN: Tối ưu createRoom ==========
/**
 * Tạo phòng chat - TỐI ƯU: Ưu tiên agent tốt nhất
 */
public function createRoom(Request $request)
{
    $validated = $request->validate([
        'subject' => 'required|string|max:255',
        'message' => 'required|string|max:1000',
        'attachment' => 'nullable|file|max:10240|mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,txt'
    ]);

    DB::beginTransaction();
    try {
        $user = Auth::user();

        // ✅ Kiểm tra số phòng chat đang mở (tối đa 4)
        $openRoomsCount = ChatRoom::where('user_id', $user->id)
            ->where('status', 'open')
            ->count();

        if ($openRoomsCount >= 4) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn chỉ có thể mở tối đa 4 phòng chat cùng lúc. Vui lòng đóng một số phòng trước khi tạo mới.',
                'open_rooms_count' => $openRoomsCount,
                'max_rooms' => 4
            ], 400);
        }

        // ✅ Tìm agent khả dụng - Ưu tiên rating cao nhất
        $agent = SupportAgent::where('status', '!=', 'offline')
            ->whereColumn('current_chats', '<', 'max_chats')
            ->orderBy('rating', 'desc')  // ✅ Ưu tiên rating cao nhất
            ->orderBy('current_chats', 'asc')  // ✅ Thứ tự: rating cao > ít chat nhất
            ->first();

        // Tạo phòng chat
        $chatRoom = ChatRoom::create([
            'user_id' => $user->id,
            'assigned_to' => $agent?->id,
            'status' => 'open',
            'subject' => $validated['subject']
        ]);

        // ✅ Xử lý file đính kèm
        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $this->handleFileUpload($request->file('attachment'));
        }

        // Tạo tin nhắn đầu tiên
        Message::create([
            'chat_room_id' => $chatRoom->id,
            'sender_id' => $user->id,
            'sender_type' => 'user',
            'content' => $validated['message'],
            'attachment' => $attachmentPath,
            'is_read' => false
        ]);

        // Cập nhật agent
        if ($agent) {
            $agent->increment('current_chats');

            // ✅ Thông báo cho agent
            Notification::create([
                'user_id' => $agent->user_id,
                'type' => 'new_chat_request',
                'title' => 'Yêu cầu hỗ trợ mới',
                'message' => "Khách hàng {$user->name} cần hỗ trợ: {$validated['subject']}",
                'related_chat_room_id' => $chatRoom->id,
                'is_read' => false
            ]);
        }

        DB::commit();

        return response()->json([
            'success' => true,
            'message' => 'Tạo phòng chat thành công',
            'data' => [
                'id' => $chatRoom->id,
                'subject' => $chatRoom->subject,
                'status' => $chatRoom->status,
                'has_agent' => !is_null($agent),
                'agent' => $agent ? [
                    'id' => $agent->id,
                    'name' => $agent->user->name,
                    'image' => $agent->user->image,
                    'rating' => $agent->rating ?? 0,
                    'status' => $agent->status,
                ] : null,
            ]
        ], 201);

    } catch (\Exception $e) {
        DB::rollBack();
        
        if (isset($attachmentPath) && Storage::disk('public')->exists($attachmentPath)) {
            Storage::disk('public')->delete($attachmentPath);
        }

        Log::error('Create chat room error: ' . $e->getMessage());

        return response()->json([
            'success' => false,
            'message' => 'Có lỗi xảy ra khi tạo phòng chat',
            'error' => config('app.debug') ? $e->getMessage() : null
        ], 500);
    }
}
}