<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ChatRoom;
use App\Models\Message;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AdminChatController extends Controller
{
    /**
     * Dashboard statistics
     */
    public function dashboard()
    {
        try {
            $stats = [
                'total_rooms' => ChatRoom::count(),
                'open_rooms' => ChatRoom::where('status', 'open')->count(),
                'closed_rooms' => ChatRoom::where('status', 'closed')->count(),
                'total_messages' => Message::count(),
                'unread_messages' => Message::whereHas('chatRoom', function ($query) {
                    $query->where('status', 'open');
                })
                    ->where('sender_type', 'user')
                    ->where('is_read', false)
                    ->count(),
            ];

            return $this->successResponse($stats);
        } catch (\Exception $e) {
            Log::error('Dashboard error: ' . $e->getMessage());
            return $this->errorResponse('Không thể tải dữ liệu dashboard', 500);
        }
    }

    /**
     * List chat rooms with filters
     */
    public function index(Request $request)
    {
        try {
            $query = ChatRoom::query()
                ->with([
                    'user:id,name,image,email',
                    'messages' => fn($q) => $q->latest()->limit(1)
                ])
                ->withCount([
                    'messages as unread_count' => fn($q) => $q
                        ->where('sender_type', 'user')
                        ->where('is_read', false)
                ]);

            // Status filter with validation
            if ($request->filled('status')) {
                $status = $request->status;
                if (in_array($status, ['open', 'closed'])) {
                    $query->where('status', $status);
                }
            }

            // Search with sanitization
            if ($request->filled('search')) {
                $keyword = trim($request->search);
                if (strlen($keyword) > 0) {
                    $query->where(function ($q) use ($keyword) {
                        $q->where('subject', 'like', "%{$keyword}%")
                            ->orWhereHas('user', fn($q2) => $q2
                                ->where('name', 'like', "%{$keyword}%")
                                ->orWhere('email', 'like', "%{$keyword}%"));
                    });
                }
            }

            $chatRooms = $query->orderBy('updated_at', 'desc')
                ->get()
                ->map(fn($room) => $this->formatChatRoom($room));

            return $this->successResponse($chatRooms);
        } catch (\Exception $e) {
            Log::error('List rooms error: ' . $e->getMessage());
            return $this->errorResponse('Không thể tải danh sách phòng chat', 500);
        }
    }

    /**
     * Show chat room details
     */
    public function show($id)
    {
        try {
            if (!is_numeric($id)) {
                return $this->errorResponse('ID không hợp lệ', 400);
            }

            $chatRoom = ChatRoom::with(['user:id,name,image,email'])
                ->find($id);

            if (!$chatRoom) {
                return $this->errorResponse('Không tìm thấy phòng chat', 404);
            }

            // Mark messages as read
            Message::where('chat_room_id', $chatRoom->id)
                ->where('sender_type', 'user')
                ->where('is_read', false)
                ->update(['is_read' => true]);

            return $this->successResponse($this->formatChatRoomDetail($chatRoom));
        } catch (\Exception $e) {
            Log::error('Show room error: ' . $e->getMessage());
            return $this->errorResponse('Không thể tải thông tin phòng chat', 500);
        }
    }

    /**
     * Get messages for a chat room
     */
    public function getMessages($id, Request $request)
    {
        try {
            if (!is_numeric($id)) {
                return $this->errorResponse('ID không hợp lệ', 400);
            }

            $chatRoom = ChatRoom::find($id);

            if (!$chatRoom) {
                return $this->errorResponse('Không tìm thấy phòng chat', 404);
            }

            $perPage = min($request->input('per_page', 50), 100);

            $messages = Message::where('chat_room_id', $chatRoom->id)
                ->with('sender:id,name,image')
                ->orderBy('created_at', 'asc')
                ->paginate($perPage);

            // Mark as read
            Message::where('chat_room_id', $chatRoom->id)
                ->where('sender_type', 'user')
                ->where('is_read', false)
                ->update(['is_read' => true]);

            $data = $messages->map(fn($msg) => $this->formatMessage($msg));

            return $this->successResponse($data, [
                'pagination' => [
                    'current_page' => $messages->currentPage(),
                    'last_page' => $messages->lastPage(),
                    'per_page' => $messages->perPage(),
                    'total' => $messages->total(),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Get messages error: ' . $e->getMessage());
            return $this->errorResponse('Không thể tải tin nhắn', 500);
        }
    }

    /**
     * Send message (Admin reply)
     */
    public function sendMessage(Request $request, $id)
    {
        try {
            // Validate ID
            if (!is_numeric($id)) {
                return $this->errorResponse('ID không hợp lệ', 400);
            }

            // Validate input
            $validated = $request->validate([
                'content' => 'required_without:attachment|nullable|string|max:5000',
                'attachment' => 'required_without:content|nullable|file|max:10240|mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,txt,zip,rar'
            ], [
                'content.required_without' => 'Vui lòng nhập nội dung hoặc đính kèm file',
                'content.max' => 'Nội dung không được vượt quá 5000 ký tự',
                'attachment.required_without' => 'Vui lòng nhập nội dung hoặc đính kèm file',
                'attachment.max' => 'File không được vượt quá 10MB',
                'attachment.mimes' => 'File không đúng định dạng cho phép'
            ]);

            $admin = Auth::user();
            $chatRoom = ChatRoom::find($id);

            if (!$chatRoom) {
                return $this->errorResponse('Không tìm thấy phòng chat', 404);
            }

            if ($chatRoom->status !== 'open') {
                return $this->errorResponse('Phòng chat đã đóng', 400);
            }

            DB::beginTransaction();

            $attachmentPath = null;
            $attachmentType = null;

            // Handle file upload
            if ($request->hasFile('attachment')) {
                $file = $request->file('attachment');
                
                // Additional validation
                if (!$file->isValid()) {
                    throw new \Exception('File upload không hợp lệ');
                }
                
                $attachmentPath = $this->handleFileUpload($file);
                $attachmentType = $this->getAttachmentType($file);
            }

            // Create message - always from admin
            $message = Message::create([
                'chat_room_id' => $chatRoom->id,
                'sender_id' => $admin->id,
                'sender_type' => 'admin',
                'content' => $validated['content'] ?? null,
                'attachment' => $attachmentPath,
                'is_read' => false
            ]);

            $chatRoom->touch();

            // Notify user
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

            $message->load('sender:id,name,image');

            return $this->successResponse($this->formatMessage($message), [
                'message' => 'Gửi tin nhắn thành công'
            ], 201);
        } catch (ValidationException $e) {
            return $this->errorResponse($e->getMessage(), 422, $e->errors());
        } catch (\Exception $e) {
            DB::rollBack();

            if (isset($attachmentPath) && Storage::disk('public')->exists($attachmentPath)) {
                Storage::disk('public')->delete($attachmentPath);
            }

            Log::error('Send message error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Close chat room
     */
    public function closeRoom($id)
    {
        try {
            if (!is_numeric($id)) {
                return $this->errorResponse('ID không hợp lệ', 400);
            }

            $chatRoom = ChatRoom::find($id);

            if (!$chatRoom) {
                return $this->errorResponse('Không tìm thấy phòng chat', 404);
            }

            if ($chatRoom->status === 'closed') {
                return $this->errorResponse('Phòng chat đã đóng trước đó', 400);
            }

            DB::beginTransaction();

            $chatRoom->update([
                'status' => 'closed',
                'closed_at' => now()
            ]);

            // Notify user
            Notification::create([
                'user_id' => $chatRoom->user_id,
                'title' => 'Phòng chat đã đóng',
                'message' => "Admin đã đóng phòng chat: {$chatRoom->subject}",
                'related_chat_room_id' => $chatRoom->id,
                'is_read' => false
            ]);

            DB::commit();

            return $this->successResponse([
                'room_id' => $chatRoom->id,
                'status' => 'closed'
            ], [
                'message' => 'Đóng phòng chat thành công'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Close room error: ' . $e->getMessage());
            return $this->errorResponse('Không thể đóng phòng chat', 500);
        }
    }

    /**
     * Get unread message count
     */
    public function unreadCount()
    {
        try {
            $unreadCount = Message::whereHas('chatRoom', fn($q) => $q->where('status', 'open'))
                ->where('sender_type', 'user')
                ->where('is_read', false)
                ->count();

            return $this->successResponse(['unread_count' => $unreadCount]);
        } catch (\Exception $e) {
            Log::error('Unread count error: ' . $e->getMessage());
            return $this->errorResponse('Không thể tải số lượng tin nhắn chưa đọc', 500);
        }
    }

    /**
     * Search chat rooms
     */
    public function search(Request $request)
    {
        try {
            $validated = $request->validate([
                'keyword' => 'required|string|min:1|max:100'
            ], [
                'keyword.required' => 'Vui lòng nhập từ khóa tìm kiếm',
                'keyword.min' => 'Từ khóa phải có ít nhất 1 ký tự',
                'keyword.max' => 'Từ khóa không được vượt quá 100 ký tự'
            ]);

            $keyword = trim($validated['keyword']);

            $chatRooms = ChatRoom::where(function ($query) use ($keyword) {
                $query->where('subject', 'like', "%{$keyword}%")
                    ->orWhereHas('user', fn($q) => $q
                        ->where('name', 'like', "%{$keyword}%")
                        ->orWhere('email', 'like', "%{$keyword}%"))
                    ->orWhereHas('messages', fn($q) => $q
                        ->where('content', 'like', "%{$keyword}%"));
            })
                ->with([
                    'user:id,name,image,email',
                    'messages' => fn($q) => $q->latest()->limit(1)
                ])
                ->orderBy('updated_at', 'desc')
                ->limit(50)
                ->get()
                ->map(fn($room) => $this->formatChatRoom($room));

            return $this->successResponse($chatRooms, [
                'keyword' => $keyword,
                'count' => $chatRooms->count()
            ]);
        } catch (ValidationException $e) {
            return $this->errorResponse($e->getMessage(), 422, $e->errors());
        } catch (\Exception $e) {
            Log::error('Search error: ' . $e->getMessage());
            return $this->errorResponse('Không thể tìm kiếm', 500);
        }
    }

    /**
     * Get all quick replies
     */
    public function getQuickReplies()
    {
        try {
            $quickReplies = DB::table('quick_replies')
                ->where('user_id', Auth::id())
                ->orderBy('usage_count', 'desc')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(fn($qr) => [
                    'id' => $qr->id,
                    'title' => $qr->title,
                    'content' => $qr->content,
                    'category' => $qr->category,
                    'usage_count' => $qr->usage_count ?? 0
                ]);

            return $this->successResponse($quickReplies);
        } catch (\Exception $e) {
            Log::error('Get quick replies error: ' . $e->getMessage());
            return $this->errorResponse('Không thể tải danh sách tin nhắn nhanh', 500);
        }
    }

    /**
     * Create quick reply
     */
    public function createQuickReply(Request $request)
    {
        try {
            $validated = $request->validate([
                'title' => 'required|string|max:100',
                'content' => 'required|string|max:1000',
                'category' => 'nullable|string|max:50'
            ], [
                'title.required' => 'Vui lòng nhập tiêu đề',
                'title.max' => 'Tiêu đề không được vượt quá 100 ký tự',
                'content.required' => 'Vui lòng nhập nội dung',
                'content.max' => 'Nội dung không được vượt quá 1000 ký tự',
                'category.max' => 'Danh mục không được vượt quá 50 ký tự'
            ]);

            $quickReply = DB::table('quick_replies')->insertGetId([
                'user_id' => Auth::id(),
                'title' => $validated['title'],
                'content' => $validated['content'],
                'category' => $validated['category'] ?? null,
                'usage_count' => 0,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return $this->successResponse([
                'id' => $quickReply,
                'title' => $validated['title'],
                'content' => $validated['content'],
                'category' => $validated['category'] ?? null,
                'usage_count' => 0
            ], [
                'message' => 'Tạo tin nhắn nhanh thành công'
            ], 201);
        } catch (ValidationException $e) {
            return $this->errorResponse($e->getMessage(), 422, $e->errors());
        } catch (\Exception $e) {
            Log::error('Create quick reply error: ' . $e->getMessage());
            return $this->errorResponse('Không thể tạo tin nhắn nhanh', 500);
        }
    }

    /**
     * Update quick reply
     */
    public function updateQuickReply(Request $request, $id)
    {
        try {
            if (!is_numeric($id)) {
                return $this->errorResponse('ID không hợp lệ', 400);
            }

            $validated = $request->validate([
                'title' => 'required|string|max:100',
                'content' => 'required|string|max:1000',
                'category' => 'nullable|string|max:50'
            ], [
                'title.required' => 'Vui lòng nhập tiêu đề',
                'title.max' => 'Tiêu đề không được vượt quá 100 ký tự',
                'content.required' => 'Vui lòng nhập nội dung',
                'content.max' => 'Nội dung không được vượt quá 1000 ký tự',
                'category.max' => 'Danh mục không được vượt quá 50 ký tự'
            ]);

            $quickReply = DB::table('quick_replies')
                ->where('id', $id)
                ->where('user_id', Auth::id())
                ->first();

            if (!$quickReply) {
                return $this->errorResponse('Không tìm thấy tin nhắn nhanh', 404);
            }

            DB::table('quick_replies')
                ->where('id', $id)
                ->update([
                    'title' => $validated['title'],
                    'content' => $validated['content'],
                    'category' => $validated['category'] ?? null,
                    'updated_at' => now()
                ]);

            return $this->successResponse([
                'id' => $id,
                'title' => $validated['title'],
                'content' => $validated['content'],
                'category' => $validated['category'] ?? null,
                'usage_count' => $quickReply->usage_count ?? 0
            ], [
                'message' => 'Cập nhật tin nhắn nhanh thành công'
            ]);
        } catch (ValidationException $e) {
            return $this->errorResponse($e->getMessage(), 422, $e->errors());
        } catch (\Exception $e) {
            Log::error('Update quick reply error: ' . $e->getMessage());
            return $this->errorResponse('Không thể cập nhật tin nhắn nhanh', 500);
        }
    }

    /**
     * Delete quick reply
     */
    public function deleteQuickReply($id)
    {
        try {
            if (!is_numeric($id)) {
                return $this->errorResponse('ID không hợp lệ', 400);
            }

            $deleted = DB::table('quick_replies')
                ->where('id', $id)
                ->where('user_id', Auth::id())
                ->delete();

            if (!$deleted) {
                return $this->errorResponse('Không tìm thấy tin nhắn nhanh', 404);
            }

            return $this->successResponse([
                'deleted_id' => $id
            ], [
                'message' => 'Xóa tin nhắn nhanh thành công'
            ]);
        } catch (\Exception $e) {
            Log::error('Delete quick reply error: ' . $e->getMessage());
            return $this->errorResponse('Không thể xóa tin nhắn nhanh', 500);
        }
    }

    /**
     * Increment usage count for quick reply
     */
    public function incrementQuickReplyUsage($id)
    {
        try {
            if (!is_numeric($id)) {
                return $this->errorResponse('ID không hợp lệ', 400);
            }

            $quickReply = DB::table('quick_replies')
                ->where('id', $id)
                ->where('user_id', Auth::id())
                ->first();

            if (!$quickReply) {
                return $this->errorResponse('Không tìm thấy tin nhắn nhanh', 404);
            }

            DB::table('quick_replies')
                ->where('id', $id)
                ->increment('usage_count');

            return $this->successResponse([
                'id' => $id,
                'usage_count' => ($quickReply->usage_count ?? 0) + 1
            ]);
        } catch (\Exception $e) {
            Log::error('Increment usage error: ' . $e->getMessage());
            return $this->errorResponse('Không thể cập nhật số lần sử dụng', 500);
        }
    }

    /**
     * Delete message
     */
    public function deleteMessage($id)
    {
        try {
            if (!is_numeric($id)) {
                return $this->errorResponse('ID không hợp lệ', 400);
            }

            $message = Message::find($id);

            if (!$message) {
                return $this->errorResponse('Không tìm thấy tin nhắn', 404);
            }

            if ($message->attachment) {
                Storage::disk('public')->delete($message->attachment);
            }

            $message->delete();

            return $this->successResponse([
                'deleted_id' => $id
            ], [
                'message' => 'Đã xóa tin nhắn'
            ]);
        } catch (\Exception $e) {
            Log::error('Delete message error: ' . $e->getMessage());
            return $this->errorResponse('Không thể xóa tin nhắn', 500);
        }
    }

    // ==================== HELPER METHODS ====================

    private function formatChatRoom($room)
    {
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
            'last_message' => $lastMessage ? [
                'content' => $lastMessage->content ?? '',
                'has_attachment' => !empty($lastMessage->attachment),
                'sender_type' => $lastMessage->sender_type,
                'created_at' => $lastMessage->created_at->format('H:i d/m/Y'),
            ] : null,
            'unread_count' => $room->unread_count ?? 0,
        ];
    }

    private function formatChatRoomDetail($room)
    {
        return [
            'id' => $room->id,
            'subject' => $room->subject,
            'status' => $room->status,
            'created_at' => $room->created_at->format('d/m/Y H:i'),
            'updated_at' => $room->updated_at->format('d/m/Y H:i'),
            'closed_at' => $room->closed_at?->format('d/m/Y H:i'),
            'rating' => $room->rating,
            'feedback' => $room->feedback,
            'user' => [
                'id' => $room->user->id,
                'name' => $room->user->name,
                'image' => $room->user->image,
                'email' => $room->user->email,
            ],
        ];
    }

    private function formatMessage($message)
    {
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

    private function successResponse($data, array $extra = [], int $status = 200)
    {
        $response = [
            'success' => true,
            'data' => $data
        ];

        return response()->json(array_merge($response, $extra), $status);
    }

    private function errorResponse(string $message, int $status = 400, $errors = null)
    {
        $response = [
            'success' => false,
            'message' => $message
        ];

        if ($errors) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $status);
    }
}