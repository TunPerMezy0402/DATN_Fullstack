import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  MessageOutlined, SendOutlined, CloseOutlined, LeftOutlined,
  PaperClipOutlined, StarFilled, FileOutlined, PictureOutlined,
  LoadingOutlined, SearchOutlined,
  ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UserOutlined, DeleteOutlined,
  DashboardOutlined, WarningOutlined
} from "@ant-design/icons";

// ========== CONFIGURATION ==========
const API_URL = "http://127.0.0.1:8000/api";

const getAuthToken = () => {
  return localStorage.getItem("access_token") || 
         localStorage.getItem("token") || 
         sessionStorage.getItem("token");
};

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CONTENT_LENGTH = 5000;
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'application/zip', 'application/x-rar-compressed'
];

// ========== TYPES ==========
interface Message {
  id: number;
  content: string;
  attachment: string | null;
  attachment_type?: "image" | "file";
  attachment_url?: string | null;
  sender_type: "user" | "agent" | "admin";
  sender_name: string;
  sender_image: string | null;
  created_at: string;
  timestamp?: number;
  is_read: boolean;
}

interface User {
  id: number;
  name: string;
  email: string;
  image: string | null;
}

interface ChatRoom {
  id: number;
  subject: string;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  rating?: number;
  feedback?: string;
  unread_count: number;
  user?: User;
  last_message?: {
    content: string;
    has_attachment?: boolean;
    sender_type: string;
    created_at: string;
  };
}

interface DashboardStats {
  total_rooms: number;
  open_rooms: number;
  closed_rooms: number;
  total_messages: number;
  unread_messages: number;
}

type ViewMode = "dashboard" | "rooms" | "chat";
type RoomFilter = "open" | "closed" | "all";

// ========== API HELPER ==========
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  
  const defaultHeaders: HeadersInit = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };

  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || `HTTP Error: ${response.status}`);
  }
  
  return data;
};

// ========== VALIDATION HELPERS ==========
const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_SIZE) {
    return 'File không được vượt quá 10MB';
  }
  
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return 'File không đúng định dạng cho phép';
  }
  
  return null;
};

const validateContent = (content: string): string | null => {
  if (content.length > MAX_CONTENT_LENGTH) {
    return `Nội dung không được vượt quá ${MAX_CONTENT_LENGTH} ký tự`;
  }
  return null;
};

// ========== ERROR DISPLAY ==========
const ErrorMessage: React.FC<{ message: string; onClose: () => void }> = ({ message, onClose }) => (
  <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-slide-in">
    <WarningOutlined />
    <span>{message}</span>
    <button onClick={onClose} className="ml-2 hover:opacity-80">
      <CloseOutlined />
    </button>
  </div>
);

// ========== ADMIN DASHBOARD ==========
const AdminDashboard: React.FC<{
  stats: DashboardStats;
  onNavigate: (view: ViewMode) => void;
}> = ({ stats, onNavigate }) => {
  return (
    <div className="p-6 overflow-y-auto h-full bg-gray-50">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
        <DashboardOutlined /> Dashboard Hỗ trợ khách hàng
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => onNavigate("rooms")}>
          <div className="flex items-center justify-between mb-2">
            <MessageOutlined className="text-3xl" />
            <span className="text-4xl font-bold">{stats.total_rooms}</span>
          </div>
          <div className="text-blue-100 text-sm">Tổng phòng chat</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => onNavigate("rooms")}>
          <div className="flex items-center justify-between mb-2">
            <CheckCircleOutlined className="text-3xl" />
            <span className="text-4xl font-bold">{stats.open_rooms}</span>
          </div>
          <div className="text-green-100 text-sm">Đang mở</div>
        </div>

        <div className="bg-gradient-to-br from-gray-500 to-gray-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <CloseCircleOutlined className="text-3xl" />
            <span className="text-4xl font-bold">{stats.closed_rooms}</span>
          </div>
          <div className="text-gray-100 text-sm">Đã đóng</div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <MessageOutlined className="text-3xl" />
            <span className="text-4xl font-bold">{stats.unread_messages}</span>
          </div>
          <div className="text-red-100 text-sm">Tin nhắn chưa đọc</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <ClockCircleOutlined className="text-3xl" />
            <span className="text-4xl font-bold">{stats.total_messages}</span>
          </div>
          <div className="text-purple-100 text-sm">Tổng tin nhắn</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <button
          onClick={() => onNavigate("rooms")}
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-all border-2 border-blue-500 text-left hover:scale-105"
        >
          <div className="flex items-center gap-3 mb-2">
            <MessageOutlined className="text-2xl text-blue-600" />
            <h3 className="text-lg font-semibold">Quản lý phòng chat</h3>
          </div>
          <p className="text-gray-600 text-sm">Xem và quản lý tất cả các phòng chat</p>
        </button>
      </div>
    </div>
  );
};

// ========== ADMIN ROOM LIST ==========
const AdminRoomList: React.FC<{
  rooms: ChatRoom[];
  loading: boolean;
  filter: RoomFilter;
  searchKeyword: string;
  onFilterChange: (filter: RoomFilter) => void;
  onSearch: (keyword: string) => void;
  onSelectRoom: (room: ChatRoom) => void;
}> = ({ rooms, loading, filter, searchKeyword, onFilterChange, onSearch, onSelectRoom }) => {
  const [localSearch, setLocalSearch] = useState(searchKeyword);

  const handleSearch = () => {
    const trimmed = localSearch.trim();
    if (trimmed.length > 100) {
      alert('Từ khóa tìm kiếm không được vượt quá 100 ký tự');
      return;
    }
    onSearch(trimmed);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 bg-gray-50 border-b space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email, nội dung..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <SearchOutlined className="absolute left-3 top-3 text-gray-400" />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <SearchOutlined />
          </button>
        </div>

        <div className="flex gap-2">
          {(['all', 'open', 'closed'] as RoomFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`flex-1 py-2 rounded-lg transition-colors font-medium ${
                filter === f
                  ? f === 'all' ? 'bg-blue-600 text-white' :
                    f === 'open' ? 'bg-green-600 text-white' : 'bg-gray-600 text-white'
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
            >
              {f === 'all' ? 'Tất cả' : f === 'open' ? 'Đang mở' : 'Đã đóng'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingOutlined className="text-4xl text-blue-600" spin />
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-gray-500">
            <MessageOutlined className="text-5xl mb-3 opacity-30" />
            <p className="text-sm">Không có phòng chat nào</p>
          </div>
        ) : (
          <div className="divide-y">
            {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => onSelectRoom(room)}
                className="p-4 hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{room.subject}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <UserOutlined className="text-xs text-gray-400" />
                      <span className="text-xs text-gray-600">{room.user?.name}</span>
                      {room.unread_count > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {room.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                      room.status === "open"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {room.status === "open" ? "Đang mở" : "Đã đóng"}
                  </span>
                </div>

                {room.last_message && (
                  <div className="text-xs text-gray-500 truncate">
                    {room.last_message.has_attachment && <PaperClipOutlined className="mr-1" />}
                    {room.last_message.content || "Đã gửi file đính kèm"}
                  </div>
                )}

                <div className="text-xs text-gray-400 mt-1">{room.updated_at}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ========== ADMIN CHAT INTERFACE ==========
const AdminChatInterface: React.FC<{
  room: ChatRoom;
  messages: Message[];
  newMessage: string;
  uploadFile: File | null;
  sendingMessage: boolean;
  onBack: () => void;
  onMessageChange: (value: string) => void;
  onFileSelect: (file: File | null) => void;
  onSendMessage: () => void;
  onCloseRoom: () => void;
  onDeleteMessage: (messageId: number) => void;
}> = ({
  room,
  messages,
  newMessage,
  uploadFile,
  sendingMessage,
  onBack,
  onMessageChange,
  onFileSelect,
  onSendMessage,
  onCloseRoom,
  onDeleteMessage
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      onFileSelect(null);
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    onFileSelect(file);
  };

  const handleSend = () => {
    if (newMessage.trim()) {
      const contentError = validateContent(newMessage);
      if (contentError) {
        setError(contentError);
        return;
      }
    }
    onSendMessage();
  };

  return (
    <div className="flex flex-col h-full">
      {error && <ErrorMessage message={error} onClose={() => setError(null)} />}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={onBack}
              className="text-white hover:bg-white/10 p-1 rounded-full transition-colors"
            >
              <LeftOutlined />
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{room.subject}</div>
              <div className="text-xs opacity-90 flex items-center gap-2 mt-0.5">
                <UserOutlined />
                <span className="truncate">{room.user?.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {room.status === "open" && (
              <button
                onClick={onCloseRoom}
                className="text-white hover:bg-white/10 px-3 py-1 rounded text-xs transition-colors"
              >
                Đóng phòng
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageOutlined className="text-4xl mb-2 opacity-30" />
            <p className="text-sm">Chưa có tin nhắn</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === "user" ? "justify-start" : "justify-end"}`}
            >
              <div className="group relative max-w-[75%]">
                <div
                  className={`rounded-2xl px-4 py-2 shadow-sm ${
                    msg.sender_type === "user"
                      ? "bg-white text-gray-800 border border-gray-200"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  <div className="text-xs font-medium mb-1 opacity-75">
                    {msg.sender_name}
                    {msg.sender_type === "admin" && " (Admin)"}
                  </div>

                  {msg.content && (
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                  )}

                  {msg.attachment && msg.attachment_url && (
                    <div className="mt-2">
                      {msg.attachment_type === "image" ? (
                        <img
                          src={msg.attachment_url}
                          alt="Attachment"
                          className="rounded-lg max-w-full max-h-48 object-contain"
                        />
                      ) : (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs underline hover:no-underline"
                        >
                          <FileOutlined />
                          File đính kèm
                        </a>
                      )}
                    </div>
                  )}

                  <div className="text-xs mt-1 opacity-75">{msg.created_at}</div>
                </div>

                {msg.sender_type !== "user" && (
                  <button
                    onClick={() => onDeleteMessage(msg.id)}
                    className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    title="Xóa tin nhắn"
                  >
                    <DeleteOutlined className="text-xs" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {room.status === "open" ? (
        <div className="p-4 bg-white border-t">
          {uploadFile && (
            <div className="mb-2 flex items-center justify-between bg-gray-100 px-3 py-2 rounded">
              <div className="flex items-center gap-2 text-sm">
                {uploadFile.type.startsWith('image/') ? (
                  <PictureOutlined className="text-blue-600" />
                ) : (
                  <FileOutlined className="text-gray-600" />
                )}
                <span className="truncate max-w-[200px]">{uploadFile.name}</span>
                <span className="text-xs text-gray-500">
                  ({(uploadFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                onClick={() => onFileSelect(null)}
                className="text-red-500 hover:text-red-700"
              >
                <CloseOutlined />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sendingMessage}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <PaperClipOutlined className="text-lg" />
            </button>

            <textarea
              placeholder="Nhập tin nhắn..."
              value={newMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={sendingMessage}
              rows={1}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />

            <button
              onClick={handleSend}
              disabled={(!newMessage.trim() && !uploadFile) || sendingMessage}
              className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingMessage ? (
                <LoadingOutlined spin />
              ) : (
                <SendOutlined className="text-lg" />
              )}
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500 text-center">
            {newMessage.length}/{MAX_CONTENT_LENGTH} ký tự
          </div>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 border-t text-center">
          <div className="text-sm text-gray-600">Phòng chat đã đóng</div>
          {room.rating && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <StarFilled className="text-yellow-500" />
              <span className="text-sm font-medium">{room.rating}/5</span>
              {room.feedback && (
                <span className="text-xs text-gray-500">- {room.feedback}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ========== MAIN APP COMPONENT ==========
const AdminChatApp: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);

  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    total_rooms: 0,
    open_rooms: 0,
    closed_rooms: 0,
    total_messages: 0,
    unread_messages: 0
  });

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomFilter, setRoomFilter] = useState<RoomFilter>("all");
  const [searchKeyword, setSearchKeyword] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const result = await apiRequest('/admin/chat/dashboard');
      if (result.success) {
        setDashboardStats(result.data);
      }
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      setError(error.message);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const params = new URLSearchParams();

      if (roomFilter !== "all") {
        params.append('status', roomFilter);
      }

      if (searchKeyword.trim()) {
        params.append('search', searchKeyword.trim());
      }

      const result = await apiRequest(`/admin/chat?${params}`);
      if (result.success) {
        setRooms(result.data);
      }
    } catch (error: any) {
      console.error('Error fetching rooms:', error);
      setError(error.message);
    } finally {
      setRoomsLoading(false);
    }
  }, [roomFilter, searchKeyword]);

  const fetchRoomDetails = useCallback(async (roomId: number) => {
    try {
      const result = await apiRequest(`/admin/chat/rooms/${roomId}`);
      if (result.success) {
        setSelectedRoom(result.data);
      }
    } catch (error: any) {
      console.error('Error fetching room details:', error);
      setError(error.message);
    }
  }, []);

  const fetchMessages = useCallback(async (roomId: number) => {
    try {
      const result = await apiRequest(`/admin/chat/rooms/${roomId}/messages`);
      if (result.success) {
        setMessages(result.data);
      }
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      setError(error.message);
    }
  }, []);

  const handleSendMessage = async () => {
    if (!selectedRoom || (!newMessage.trim() && !uploadFile) || sendingMessage) {
      return;
    }

    if (newMessage.trim()) {
      const contentError = validateContent(newMessage);
      if (contentError) {
        setError(contentError);
        return;
      }
    }

    if (uploadFile) {
      const fileError = validateFile(uploadFile);
      if (fileError) {
        setError(fileError);
        return;
      }
    }

    setSendingMessage(true);
    try {
      const formData = new FormData();

      if (newMessage.trim()) {
        formData.append('content', newMessage.trim());
      }

      if (uploadFile) {
        formData.append('attachment', uploadFile);
      }

      const result = await apiRequest(`/admin/chat/rooms/${selectedRoom.id}/send`, {
        method: 'POST',
        body: formData
      });

      if (result.success) {
        setMessages(prev => [...prev, result.data]);
        setNewMessage("");
        setUploadFile(null);

        if (selectedRoom) {
          setSelectedRoom({
            ...selectedRoom,
            last_message: {
              content: result.data.content,
              has_attachment: !!result.data.attachment,
              sender_type: result.data.sender_type,
              created_at: result.data.created_at
            }
          });
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError(error.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCloseRoom = async () => {
    if (!selectedRoom || !confirm('Bạn có chắc muốn đóng phòng chat này?')) {
      return;
    }

    try {
      const result = await apiRequest(`/admin/chat/rooms/${selectedRoom.id}/close`, {
        method: 'POST'
      });

      if (result.success) {
        setSelectedRoom({ ...selectedRoom, status: 'closed' });
        fetchRooms();
      }
    } catch (error: any) {
      console.error('Error closing room:', error);
      setError(error.message);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm('Bạn có chắc muốn xóa tin nhắn này?')) {
      return;
    }

    try {
      const result = await apiRequest(`/admin/chat/messages/${messageId}`, {
        method: 'DELETE'
      });

      if (result.success) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      }
    } catch (error: any) {
      console.error('Error deleting message:', error);
      setError(error.message);
    }
  };

  const handleSelectRoom = (room: ChatRoom) => {
    setSelectedRoom(room);
    setViewMode("chat");
    fetchRoomDetails(room.id);
    fetchMessages(room.id);
  };

  const handleNavigate = (view: ViewMode) => {
    setViewMode(view);
    setSelectedRoom(null);

    if (view === "dashboard") {
      fetchDashboardStats();
    } else if (view === "rooms") {
      fetchRooms();
    }
  };

  const handleBackFromChat = () => {
    setViewMode("rooms");
    setSelectedRoom(null);
    setMessages([]);
    setNewMessage("");
    setUploadFile(null);
    fetchRooms();
  };

  // Initial load - fetch dashboard on mount
  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  useEffect(() => {
    if (viewMode === "rooms") {
      fetchRooms();
    }
  }, [viewMode, roomFilter, fetchRooms]);

  // Polling with visibility check
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const startPolling = () => {
      interval = setInterval(() => {
        if (!document.hidden) {
          if (viewMode === "dashboard") {
            fetchDashboardStats();
          } else if (viewMode === "rooms") {
            fetchRooms();
          } else if (viewMode === "chat" && selectedRoom) {
            fetchMessages(selectedRoom.id);
          }
        }
      }, 15000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [viewMode, selectedRoom, fetchDashboardStats, fetchRooms, fetchMessages]);

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {error && <ErrorMessage message={error} onClose={() => setError(null)} />}
      
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-800">Admin Chat Management</h1>
            <div className="flex gap-2">
              <button
                onClick={() => handleNavigate("dashboard")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === "dashboard"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <DashboardOutlined className="mr-2" />
                Dashboard
              </button>
              <button
                onClick={() => handleNavigate("rooms")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === "rooms" || viewMode === "chat"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <MessageOutlined className="mr-2" />
                Phòng chat
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === "dashboard" ? (
          <AdminDashboard
            stats={dashboardStats}
            onNavigate={handleNavigate}
          />
        ) : viewMode === "rooms" ? (
          <AdminRoomList
            rooms={rooms}
            loading={roomsLoading}
            filter={roomFilter}
            searchKeyword={searchKeyword}
            onFilterChange={setRoomFilter}
            onSearch={setSearchKeyword}
            onSelectRoom={handleSelectRoom}
          />
        ) : viewMode === "chat" && selectedRoom ? (
          <AdminChatInterface
            room={selectedRoom}
            messages={messages}
            newMessage={newMessage}
            uploadFile={uploadFile}
            sendingMessage={sendingMessage}
            onBack={handleBackFromChat}
            onMessageChange={setNewMessage}
            onFileSelect={setUploadFile}
            onSendMessage={handleSendMessage}
            onCloseRoom={handleCloseRoom}
            onDeleteMessage={handleDeleteMessage}
          />
        ) : null}
      </div>
      
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AdminChatApp;