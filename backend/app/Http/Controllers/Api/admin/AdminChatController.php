<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ChatRoom;
use App\Models\Message;
use App\Models\Notification;
use App\Models\SupportAgent;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class AdminChatController extends Controller
{
    /**
     * ========== PHẦN HỖ TRỢ KHÁCH HÀNG (GIỐNG CLIENT) ==========
     */

    /**
     * Lấy danh sách phòng chat - Admin xem tất cả
     */
    public function index(Request $request)
    {
        $query = ChatRoom::with([
                'user:id,name,image,email',
                'agent.user:id,name,image',
                'messages' => function ($query) {
                    $query->latest()->limit(1);
                }
            ])
            ->withCount([
                'messages as unread_count' => function ($query) {
                    $query->where('sender_type', 'user')
                        ->where('is_read', false);
                }
            ]);

        // Filter theo trạng thái
        if ($request->has('status') && in_array($request->status, ['open', 'closed'])) {
            $query->where('status', $request->status);
        }

        // Filter theo agent
        if ($request->has('agent_id')) {
            $query->where('assigned_to', $request->agent_id);
        }

        // Tìm kiếm
        if ($request->has('search')) {
            $keyword = $request->search;
            $query->where(function($q) use ($keyword) {
                $q->where('subject', 'like', "%{$keyword}%")
                  ->orWhereHas('user', function($q2) use ($keyword) {
                      $q2->where('name', 'like', "%{$keyword}%")
                         ->orWhere('email', 'like', "%{$keyword}%");
                  });
            });
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
                    'user' => [
                        'id' => $room->user->id,
                        'name' => $room->user->name,
                        'email' => $room->user->email,
                        'image' => $room->user->image,
                    ],
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
                    'unread_count' => $room->unread_count,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $chatRooms
        ]);
    }

    /**
     * Xem chi tiết phòng chat
     */
    public function show($id)
    {
        $chatRoom = ChatRoom::where('id', $id)
            ->with([
                'user:id,name,image,email',
                'agent.user:id,name,image,email'
            ])
            ->first();

        if (!$chatRoom) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy phòng chat'
            ], 404);
        }

        // Đánh dấu tin nhắn của user là đã đọc (admin đọc)
        Message::where('chat_room_id', $chatRoom->id)
            ->where('sender_type', 'user')
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
                'user' => [
                    'id' => $chatRoom->user->id,
                    'name' => $chatRoom->user->name,
                    'image' => $chatRoom->user->image,
                    'email' => $chatRoom->user->email,
                ],
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
     * Lấy danh sách tin nhắn
     */
    public function getMessages($id, Request $request)
    {
        $chatRoom = ChatRoom::find($id);

        if (!$chatRoom) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy phòng chat'
            ], 404);
        }

        $perPage = $request->input('per_page', 50);

        $messages = Message::where('chat_room_id', $chatRoom->id)
            ->with('sender:id,name,image')
            ->orderBy('created_at', 'asc')
            ->paginate($perPage);

        // Đánh dấu tin nhắn của user là đã đọc
        Message::where('chat_room_id', $chatRoom->id)
            ->where('sender_type', 'user')
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
                'attachment_url' => $message->attachment ? url('storage/' . $message->attachment) : null,
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
     * Gửi tin nhắn (Admin trả lời khách hàng)
     */
    public function sendMessage(Request $request, $id)
    {
        $validated = $request->validate([
            'content' => 'required_without:attachment|nullable|string|max:1000',
            'attachment' => 'required_without:content|nullable|file|max:10240|mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,txt,zip'
        ], [
            'content.required_without' => 'Vui lòng nhập nội dung hoặc đính kèm file',
            'attachment.required_without' => 'Vui lòng nhập nội dung hoặc đính kèm file'
        ]);

        $admin = Auth::user();

        $chatRoom = ChatRoom::find($id);

        if (!$chatRoom) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy phòng chat'
            ], 404);
        }

        if ($chatRoom->status !== 'open') {
            return response()->json([
                'success' => false,
                'message' => 'Phòng chat đã đóng'
            ], 400);
        }

        DB::beginTransaction();
        try {
            $attachmentPath = null;
            $attachmentType = null;

            // Xử lý file upload
            if ($request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $attachmentPath = $this->handleFileUpload($file);
                $attachmentType = $this->getAttachmentType($file);
            }

            // Tạo tin nhắn từ admin (sender_type = 'agent')
            $message = Message::create([
                'chat_room_id' => $chatRoom->id,
                'sender_id' => $admin->id,
                'sender_type' => 'agent', // Admin gửi như agent
                'content' => $validated['content'] ?? '',
                'attachment' => $attachmentPath,
                'is_read' => false
            ]);

            $chatRoom->touch();

            // Thông báo cho khách hàng
            $notificationMessage = $attachmentPath
                ? "Admin đã gửi " . ($attachmentType === 'image' ? 'ảnh' : 'file')
                : "Admin: " . mb_substr($validated['content'] ?? '', 0, 50);

            Notification::create([
                'user_id' => $chatRoom->user_id,
                'title' => 'Tin nhắn mới từ Admin',
                'message' => $notificationMessage,
                'related_chat_room_id' => $chatRoom->id,
                'is_read' => false
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Gửi tin nhắn thành công',
                'data' => [
                    'id' => $message->id,
                    'content' => $message->content,
                    'attachment' => $message->attachment,
                    'attachment_type' => $attachmentType,
                    'attachment_url' => $message->attachment ? url('storage/' . $message->attachment) : null,
                    'sender_type' => $message->sender_type,
                    'sender_name' => $admin->name,
                    'sender_image' => $admin->image,
                    'is_read' => false,
                    'created_at' => $message->created_at->format('H:i d/m/Y'),
                    'timestamp' => $message->created_at->timestamp,
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            if (isset($attachmentPath) && Storage::disk('public')->exists($attachmentPath)) {
                Storage::disk('public')->delete($attachmentPath);
            }

            Log::error('Admin send message error: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi gửi tin nhắn',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Đóng phòng chat
     */
    public function closeRoom($id)
    {
        $chatRoom = ChatRoom::find($id);

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

            if ($chatRoom->agent) {
                $chatRoom->agent->decrement('current_chats');
            }

            // Thông báo cho khách hàng
            Notification::create([
                'user_id' => $chatRoom->user_id,
                'title' => 'Phòng chat đã đóng',
                'message' => "Admin đã đóng phòng chat: {$chatRoom->subject}",
                'related_chat_room_id' => $chatRoom->id,
                'is_read' => false
            ]);

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
     * Đếm số tin nhắn chưa đọc (Admin)
     */
    public function unreadCount()
    {
        $unreadCount = Message::whereHas('chatRoom', function ($query) {
            $query->where('status', 'open');
        })
            ->where('sender_type', 'user')
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'unread_count' => $unreadCount
        ]);
    }

    /**
     * Tìm kiếm phòng chat
     */
    public function search(Request $request)
    {
        $validated = $request->validate([
            'keyword' => 'required|string|min:1|max:100'
        ]);

        $keyword = $validated['keyword'];

        $chatRooms = ChatRoom::where(function ($query) use ($keyword) {
                $query->where('subject', 'like', "%{$keyword}%")
                    ->orWhereHas('user', function ($q) use ($keyword) {
                        $q->where('name', 'like', "%{$keyword}%")
                          ->orWhere('email', 'like', "%{$keyword}%");
                    })
                    ->orWhereHas('messages', function ($q) use ($keyword) {
                        $q->where('content', 'like', "%{$keyword}%");
                    });
            })
            ->with([
                'user:id,name,image,email',
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
                    'user' => [
                        'name' => $room->user->name,
                        'email' => $room->user->email,
                        'image' => $room->user->image,
                    ],
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
     * ========== QUẢN LÝ AGENTS ==========
     */

    /**
     * Lấy danh sách agents
     */
    public function getAgents(Request $request)
    {
        $agents = SupportAgent::with('user:id,name,image,email')
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
     * Gán agent cho phòng chat
     */
    public function assignAgent(Request $request, $id)
    {
        $validated = $request->validate([
            'agent_id' => 'required|exists:support_agents,id'
        ]);

        $chatRoom = ChatRoom::find($id);

        if (!$chatRoom) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy phòng chat'
            ], 404);
        }

        $agent = SupportAgent::find($validated['agent_id']);

        if ($agent->current_chats >= $agent->max_chats) {
            return response()->json([
                'success' => false,
                'message' => 'Agent đã đạt số lượng chat tối đa'
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Giảm current_chats của agent cũ
            if ($chatRoom->assigned_to) {
                $oldAgent = SupportAgent::find($chatRoom->assigned_to);
                $oldAgent?->decrement('current_chats');
            }

            // Gán agent mới
            $chatRoom->update(['assigned_to' => $agent->id]);
            $agent->increment('current_chats');

            // Thông báo cho agent
            Notification::create([
                'user_id' => $agent->user_id,
                'title' => 'Được gán phòng chat mới',
                'message' => "Admin đã gán bạn phòng chat: {$chatRoom->subject}",
                'related_chat_room_id' => $chatRoom->id,
                'is_read' => false
            ]);

            // Thông báo cho user
            Notification::create([
                'user_id' => $chatRoom->user_id,
                'title' => 'Đã có nhân viên hỗ trợ',
                'message' => "{$agent->user->name} sẽ hỗ trợ bạn",
                'related_chat_room_id' => $chatRoom->id,
                'is_read' => false
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Gán agent thành công'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Thống kê agent
     */
    public function getAgentStats($agentId)
    {
        $agent = SupportAgent::with('user:id,name,email')->find($agentId);

        if (!$agent) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy agent'
            ], 404);
        }

        $totalRooms = ChatRoom::where('assigned_to', $agentId)->count();
        $closedRooms = ChatRoom::where('assigned_to', $agentId)
            ->where('status', 'closed')
            ->count();
        $openRooms = $agent->current_chats;
        
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
            ]
        ]);
    }

    /**
     * ========== HELPER FUNCTIONS ==========
     */

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

    /**
     * Xóa tin nhắn
     */
    public function deleteMessage($id)
    {
        try {
            $message = Message::findOrFail($id);
            
            if ($message->attachment) {
                Storage::disk('public')->delete($message->attachment);
            }

            $message->delete();

            return response()->json([
                'success' => true,
                'message' => 'Đã xóa tin nhắn'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Dashboard thống kê
     */
    public function dashboard()
    {
        $stats = [
            'total_rooms' => ChatRoom::count(),
            'open_rooms' => ChatRoom::where('status', 'open')->count(),
            'closed_rooms' => ChatRoom::where('status', 'closed')->count(),
            'total_messages' => Message::count(),
            'unread_messages' => Message::where('sender_type', 'user')
                ->where('is_read', false)
                ->count(),
            'total_agents' => SupportAgent::count(),
            'online_agents' => SupportAgent::where('status', 'online')->count(),
            'busy_agents' => SupportAgent::where('status', 'busy')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }
}