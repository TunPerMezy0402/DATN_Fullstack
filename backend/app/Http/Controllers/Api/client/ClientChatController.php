<?php

namespace App\Http\Controllers\Api\Client;

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

class ClientChatController extends Controller
{

    public function rateChat(Request $request, $roomId)
    {
        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'feedback' => 'nullable|string|max:500'
        ]);

        $chatRoom = ChatRoom::where('id', $roomId)
            ->where('user_id', Auth::id())
            ->where('status', 'closed')
            ->first();

        if (!$chatRoom) {
            return response()->json([
                'success' => false,
                'message' => 'Không tìm thấy phòng chat hoặc phòng chưa đóng'
            ], 404);
        }

        DB::beginTransaction();
        try {
            $chatRoom->update([
                'rating' => $validated['rating'],
                'feedback' => $validated['feedback'] ?? null
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Cảm ơn bạn đã đánh giá!'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra'
            ], 500);
        }
    }

    /**
     * Lấy danh sách phòng chat của user - ✅ ĐÃ TỐI ƯU
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $query = ChatRoom::where('user_id', $user->id)
            ->with([
                'messages' => function ($query) {
                    $query->latest()->limit(1);
                }
            ])
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
     * ✅ HOÀN THIỆN: Lấy chi tiết phòng chat - WITH DEBUG
     */
    public function show($id)
    {
        try {
            $user = Auth::user();
            
            Log::info('Show chat room request', [
                'room_id' => $id,
                'user_id' => $user->id ?? 'NO_USER',
                'user_email' => $user->email ?? 'NO_EMAIL'
            ]);

            if (!is_numeric($id) || $id <= 0) {
                Log::warning('Invalid room ID format', ['id' => $id]);
                return response()->json([
                    'success' => false,
                    'message' => 'ID phòng chat không hợp lệ'
                ], 400);
            }

            $chatRoom = ChatRoom::where('id', $id)
                ->where('user_id', $user->id)
                ->first();

            if (!$chatRoom) {
                $roomExists = ChatRoom::where('id', $id)->first();
                
                Log::warning('Chat room not found for user', [
                    'room_id' => $id,
                    'user_id' => $user->id,
                    'room_exists' => $roomExists ? 'YES' : 'NO',
                    'room_user_id' => $roomExists->user_id ?? null
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy phòng chat'
                ], 404);
            }

            Log::info('Chat room found successfully', [
                'room_id' => $chatRoom->id,
                'user_id' => $chatRoom->user_id,
                'status' => $chatRoom->status
            ]);

            // Đánh dấu tin nhắn của agent là đã đọc
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
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Show chat room error', [
                'room_id' => $id ?? 'NO_ID',
                'user_id' => Auth::id() ?? 'NO_USER',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi lấy thông tin phòng chat',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Gửi tin nhắn - ✅ ĐÃ HOÀN THIỆN
     */
    public function sendMessage(Request $request, $id)
    {
        $validated = $request->validate([
            'content' => 'required_without:attachment|nullable|string|max:1000',
            'attachment' => [
                'required_without:content',
                'nullable',
                'file',
                'max:10240',
                'mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,txt,zip',
                function ($attribute, $value, $fail) {
                    if (!$value) return;
                    
                    $realMime = $value->getMimeType();
                    $allowedMimes = [
                        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                        'application/pdf',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'text/plain',
                        'application/zip',
                    ];
                    
                    if (!in_array($realMime, $allowedMimes)) {
                        $fail('Loại file không được phép.');
                    }
                },
            ]
        ], [
            'content.required_without' => 'Vui lòng nhập nội dung hoặc đính kèm file',
            'attachment.required_without' => 'Vui lòng nhập nội dung hoặc đính kèm file',
            'attachment.max' => 'File không được vượt quá 10MB',
            'attachment.mimes' => 'File không đúng định dạng cho phép'
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

            if ($request->hasFile('attachment')) {
                $file = $request->file('attachment');
                $attachmentPath = $this->handleFileUpload($file);
                $attachmentType = $this->getAttachmentType($file);
            }

            $message = Message::create([
                'chat_room_id' => $chatRoom->id,
                'sender_id' => $user->id,
                'sender_type' => 'user',
                'content' => $validated['content'] ?? '',
                'attachment' => $attachmentPath,
                'is_read' => false
            ]);

            $chatRoom->touch();

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

            if (isset($attachmentPath) && Storage::disk('public')->exists($attachmentPath)) {
                Storage::disk('public')->delete($attachmentPath);
            }

            Log::error('Client sendMessage error', [
                'exception' => $e,
                'chat_room_id' => $id,
                'user_id' => Auth::id(),
            ]);

            $message = 'Không thể gửi tin nhắn';
            if ($request->query('debug') || config('app.debug')) {
                $message = 'Có lỗi xảy ra: ' . $e->getMessage();
            }

            return response()->json([
                'success' => false,
                'message' => $message
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

        $perPage = $request->input('per_page', 50);

        $messages = Message::where('chat_room_id', $chatRoom->id)
            ->with('sender:id,name,image')
            ->orderBy('created_at', 'asc')
            ->paginate($perPage);

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

        if ($chatRoom->rating) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn đã đánh giá phòng chat này rồi'
            ], 400);
        }

        DB::beginTransaction();
        try {
            $updateData = [
                'rating' => (int) $validated['rating'],
            ];
            
            if (!empty($validated['feedback'])) {
                $updateData['feedback'] = trim((string) $validated['feedback']);
            }
            
            $chatRoom->update($updateData);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Cảm ơn bạn đã đánh giá!',
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
        $originalName = $file->getClientOriginalName();
        $sanitizedName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $originalName);
        $extension = $file->getClientOriginalExtension();
        
        $fileName = time() . '_' . uniqid() . '_' . $sanitizedName;
        
        return $file->storeAs('chat_attachments', $fileName, 'public');
    }

    private function getAttachmentType($file): string
    {
        $mimeType = $file->getMimeType();
        return str_starts_with($mimeType, 'image/') ? 'image' : 'file';
    }

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

            $openRoomsCount = ChatRoom::where('user_id', $user->id)
                ->where('status', 'open')
                ->count();

            if ($openRoomsCount >= 4) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn chỉ có thể mở tối đa 4 phòng chat cùng lúc.',
                    'open_rooms_count' => $openRoomsCount,
                    'max_rooms' => 4
                ], 400);
            }

            $chatRoom = ChatRoom::create([
                'user_id' => $user->id,
                'status' => 'open',
                'subject' => $validated['subject']
            ]);

            $attachmentPath = null;
            if ($request->hasFile('attachment')) {
                $attachmentPath = $this->handleFileUpload($request->file('attachment'));
            }

            Message::create([
                'chat_room_id' => $chatRoom->id,
                'sender_id' => $user->id,
                'sender_type' => 'user',
                'content' => $validated['message'],
                'attachment' => $attachmentPath,
                'is_read' => false
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tạo phòng chat thành công',
                'data' => [
                    'id' => $chatRoom->id,
                    'subject' => $chatRoom->subject,
                    'status' => $chatRoom->status,
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