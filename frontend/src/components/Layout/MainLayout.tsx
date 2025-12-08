import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Outlet } from "react-router-dom";
import {
  Modal,
  Form,
  Input,
  Button,
  message,
  Alert,
  Badge,
  Upload,
  List,
  Tag,
  Rate,
  Spin,
  Image
} from "antd";
import {
  BankOutlined,
  LockOutlined,
  MessageOutlined,
  SendOutlined,
  CloseOutlined,
  PaperClipOutlined,
  PlusOutlined,
  LeftOutlined,
  FileOutlined,
  LoadingOutlined
} from "@ant-design/icons";
import axios from "axios";
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";

const API_URL = "http://127.0.0.1:8000/api";
const getAuthToken = () => localStorage.getItem("access_token") || localStorage.getItem("token");

// ========== INTERFACES ==========
interface AttachmentInfo {
  width: number;
  height: number;
  file_size: number;
  thumbnail_url: string;
}

interface Message {
  id: number;
  content: string;
  attachment: string | null;
  attachment_type?: "image" | "file";
  attachment_url?: string | null;
  attachment_info?: AttachmentInfo;
  sender_type: "user" | "agent";
  sender_name: string;
  sender_image: string | null;
  created_at: string;
  timestamp?: number;
  is_read: boolean;
}

interface Agent {
  id: number;
  name: string;
  image: string | null;
  email?: string;
  rating: number;
  status: string;
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
  agent?: Agent;
  last_message?: {
    content: string;
    has_attachment?: boolean;
    sender_type: string;
    created_at: string;
  };
}

type ChatView = "list" | "create" | "chat" | "rating";

// ========== HELPER FUNCTIONS ==========
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// ========== CHAT HEADER ==========
const ChatHeader: React.FC<{
  chatView: ChatView;
  currentRoom: ChatRoom | null;
  onClose: () => void;
  onBack: () => void;
  onCloseRoom: () => void;
}> = ({ chatView, currentRoom, onClose, onBack, onCloseRoom }) => {
  const getTitle = () => {
    switch (chatView) {
      case "list": return "Hỗ trợ khách hàng";
      case "create": return "Yêu cầu hỗ trợ mới";
      case "chat": return currentRoom?.subject || "Chat";
      case "rating": return "Đánh giá dịch vụ";
      default: return "Chat";
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {(chatView === "chat" || chatView === "create") && (
            <Button
              type="text"
              icon={<LeftOutlined />}
              onClick={onBack}
              className="text-white hover:bg-white/10 !p-1 !h-7 !w-7 rounded-full"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{getTitle()}</div>
            {currentRoom?.agent && chatView === "chat" && (
              <div className="text-[11px] opacity-90 flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                <span className="truncate">{currentRoom.agent.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {currentRoom?.status === "open" && chatView === "chat" && (
            <Button
              type="text"
              size="small"
              onClick={onCloseRoom}
              className="text-white hover:bg-white/10 !text-[11px] !h-6 !px-2"
            >
              Đóng
            </Button>
          )}
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            className="text-white hover:bg-white/10 !p-1 !h-7 !w-7 rounded-full"
          />
        </div>
      </div>
    </div>
  );
};

// ========== ROOM LIST ==========
const RoomList: React.FC<{
  rooms: ChatRoom[];
  filter: "open" | "closed";
  loading: boolean;
  onFilterChange: (filter: "open" | "closed") => void;
  onSelectRoom: (room: ChatRoom) => void;
  onCreateNew: () => void;
}> = ({ rooms, filter, loading, onFilterChange, onSelectRoom, onCreateNew }) => (
  <div className="flex flex-col h-full">
    <div className="p-3 bg-gray-50 border-b">
      <div className="flex gap-2">
        <Button
          type={filter === "open" ? "primary" : "default"}
          onClick={() => onFilterChange("open")}
          className="flex-1"
        >
          Đang mở
        </Button>
        <Button
          type={filter === "closed" ? "primary" : "default"}
          onClick={() => onFilterChange("closed")}
          className="flex-1"
        >
          Đã đóng
        </Button>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Spin />
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full p-6 text-gray-500">
          <MessageOutlined className="text-5xl mb-3 opacity-30" />
          <p className="text-sm">Chưa có cuộc hội thoại nào</p>
          <Button type="link" onClick={onCreateNew} className="mt-2">
            Tạo yêu cầu mới
          </Button>
        </div>
      ) : (
        <List
          dataSource={rooms}
          renderItem={(room) => (
            <List.Item
              className="cursor-pointer hover:bg-blue-50 !px-4 transition-colors"
              onClick={() => onSelectRoom(room)}
            >
              <List.Item.Meta
                title={
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{room.subject}</span>
                    {room.unread_count > 0 && <Badge count={room.unread_count} className="ml-2" />}
                  </div>
                }
                description={
                  <div>
                    {room.last_message && (
                      <div className="text-xs text-gray-600 truncate">
                        {room.last_message.has_attachment && "📎 "}
                        {room.last_message.content || "Đã gửi file đính kèm"}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">{room.updated_at}</span>
                      <Tag color={room.status === "open" ? "green" : "default"}>
                        {room.status === "open" ? "Đang mở" : "Đã đóng"}
                      </Tag>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>

    <div className="p-3 border-t bg-gray-50">
      <Button type="primary" icon={<PlusOutlined />} onClick={onCreateNew} block size="large">
        Tạo yêu cầu mới
      </Button>
    </div>
  </div>
);

// ========== CREATE FORM ==========
const CreateForm: React.FC<{
  form: any;
  loading: boolean;
  onSubmit: (values: any) => void;
}> = ({ form, loading, onSubmit }) => (
  <div className="flex-1 overflow-y-auto p-4">
    <Alert
      message="Cần hỗ trợ gì không?"
      description="Mô tả chi tiết vấn đề của bạn và nhân viên hỗ trợ sẽ phản hồi sớm nhất."
      type="info"
      showIcon
      className="mb-4"
    />

    <Form form={form} layout="vertical" onFinish={onSubmit}>
      <Form.Item
        label="Tiêu đề"
        name="subject"
        rules={[
          { required: true, message: "Vui lòng nhập tiêu đề" },
          { max: 255, message: "Tối đa 255 ký tự" }
        ]}
      >
        <Input placeholder="VD: Hỏi về sản phẩm..." size="large" maxLength={255} showCount />
      </Form.Item>

      <Form.Item
        label="Mô tả chi tiết"
        name="message"
        rules={[
          { required: true, message: "Vui lòng nhập nội dung" },
          { max: 1000, message: "Tối đa 1000 ký tự" }
        ]}
      >
        <Input.TextArea
          placeholder="Mô tả chi tiết vấn đề..."
          rows={8}
          size="large"
          maxLength={1000}
          showCount
        />
      </Form.Item>

      <Button type="primary" htmlType="submit" block size="large" loading={loading} icon={<SendOutlined />}>
        Gửi yêu cầu
      </Button>
    </Form>
  </div>
);

// ========== CHAT MESSAGES ==========
const ChatMessages: React.FC<{
  messages: Message[];
  currentRoom: ChatRoom | null;
  newMessage: string;
  uploadFile: any;
  sendingMessage: boolean;
  messagesEndRef: React.MutableRefObject<HTMLDivElement | null>;
  onMessageChange: (value: string) => void;
  onFileSelect: (file: any) => void;
  onFileRemove: () => void;
  onSendMessage: () => void;
}> = ({
  messages,
  currentRoom,
  newMessage,
  uploadFile,
  sendingMessage,
  messagesEndRef,
  onMessageChange,
  onFileSelect,
  onFileRemove,
  onSendMessage
}) => {
  const filePreview = useMemo(() => {
    if (!uploadFile) return null;

    const isImage = uploadFile.type?.startsWith('image/');
    if (isImage) {
      return (
        <div className="mb-2 relative inline-block">
          <img src={URL.createObjectURL(uploadFile)} alt="Preview" className="max-h-20 rounded border" />
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onFileRemove}
            className="!absolute top-1 right-1 bg-white shadow"
          />
        </div>
      );
    }

    return (
      <div className="mb-2 text-sm bg-gray-100 px-3 py-2 rounded flex items-center justify-between">
        <span className="flex items-center gap-2">
          <FileOutlined /> {uploadFile.name}
        </span>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onFileRemove} />
      </div>
    );
  }, [uploadFile, onFileRemove]);

  return (
    <>
      <div className="flex-1 overflow-y-auto p-3 bg-white">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageOutlined className="text-4xl mb-2 opacity-30" />
            <p className="text-xs">Bắt đầu cuộc trò chuyện</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] ${msg.sender_type === "user" ? "bg-blue-600 text-white" : "bg-gray-100"
                    } rounded-2xl px-3 py-2 shadow-sm`}
                >
                  {msg.sender_type === "agent" && (
                    <div className="text-[10px] font-medium mb-1 text-gray-600">
                      {msg.sender_name}
                    </div>
                  )}

                  {msg.content && (
                    <div className="break-words whitespace-pre-wrap text-[13px] leading-relaxed">
                      {msg.content}
                    </div>
                  )}

                  {msg.attachment && msg.attachment_url && (
                    <div className="mt-1.5">
                      {msg.attachment_type === "image" ? (
                        <>
                          <Image
                            src={msg.attachment_url}
                            alt="Attachment"
                            className="rounded-lg max-w-full"
                            style={{ maxHeight: "180px" }}
                            preview={{ mask: "👁️ Xem" }}
                            title={msg.attachment_info ? `${msg.attachment_info.width}x${msg.attachment_info.height}px` : ""}
                          />
                          {msg.attachment_info && (
                            <div className={`text-[9px] mt-1 ${msg.sender_type === "user" ? "text-blue-200" : "text-gray-400"}`}>
                              {msg.attachment_info.width}x{msg.attachment_info.height}px • {formatFileSize(msg.attachment_info.file_size)}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={`text-[11px] bg-opacity-20 px-2 py-1 rounded flex items-center gap-1 ${msg.sender_type === "user" ? "bg-blue-100" : "bg-gray-200"}`}>
                          <PaperClipOutlined />
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`hover:underline flex-1 truncate ${msg.sender_type === "user" ? "text-blue-100" : "text-blue-600"}`}
                          >
                            File đính kèm
                          </a>
                          {msg.attachment_info && (
                            <span className={msg.sender_type === "user" ? "text-blue-200" : "text-gray-500"}>
                              ({formatFileSize(msg.attachment_info.file_size)})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`text-[9px] mt-1 ${msg.sender_type === "user" ? "text-blue-200" : "text-gray-400"}`}>
                    {msg.created_at}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {currentRoom?.status === "open" ? (
        <div className="p-3 bg-white border-t">
          {filePreview}
          <div className="flex gap-2 items-end">
            <Upload
              beforeUpload={(file) => {
                const fileSizeMB = file.size / 1024 / 1024;
                if (fileSizeMB > 10) {
                  message.error("File không được vượt quá 10MB!");
                  return false;
                }
                onFileSelect(file);
                return false;
              }}
              showUploadList={false}
              accept="image/*,.pdf,.doc,.docx,.txt,.zip"
              maxCount={1}
            >
              <Button
                icon={<PaperClipOutlined />}
                disabled={sendingMessage}
                className="!h-9 !w-9 rounded-full"
                title="Tối đa 10MB"
              />
            </Upload>

            <Input.TextArea
              placeholder="Aa"
              value={newMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
              disabled={sendingMessage}
              autoSize={{ minRows: 1, maxRows: 3 }}
              className="flex-1 !rounded-full !px-4 !py-2 !bg-gray-100 !border-0"
            />

            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={onSendMessage}
              loading={sendingMessage}
              disabled={(!newMessage.trim() && !uploadFile) || sendingMessage}
              className="!h-9 !w-9 rounded-full"
            />
          </div>
        </div>
      ) : (
        <div className="p-3 bg-gray-50 border-t text-center">
          <div className="text-xs text-gray-600">Cuộc trò chuyện đã kết thúc</div>
        </div>
      )}
    </>
  );
};

// ========== RATING FORM ==========
const RatingForm: React.FC<{
  form: any;
  loading: boolean;
  onSubmit: (values: any) => void;
  onSkip: () => void;
}> = ({ form, loading, onSubmit, onSkip }) => {
  const [rating, setRating] = useState(0);

  const handleSubmit = () => {
    if (!rating) {
      message.error("Vui lòng chọn đánh giá");
      return;
    }
    const feedback = form.getFieldValue("feedback");
    onSubmit({ rating, feedback });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl">✓</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">Cảm ơn bạn!</h3>
        <p className="text-sm text-gray-600">Đánh giá để giúp chúng tôi cải thiện dịch vụ</p>
      </div>

      <Form form={form} layout="vertical">
        <Form.Item label="Đánh giá nhân viên hỗ trợ">
          <div className="flex flex-col items-center">
            <Rate className="!text-4xl" value={rating} onChange={setRating} />
            {rating > 0 && (
              <div className="text-sm text-gray-500 mt-2">
                {rating === 5 && "Xuất sắc! 🌟"}
                {rating === 4 && "Rất tốt! 👍"}
                {rating === 3 && "Tốt 😊"}
                {rating === 2 && "Được 😐"}
                {rating === 1 && "Cần cải thiện 😞"}
              </div>
            )}
          </div>
        </Form.Item>

        <Form.Item
          label="Nhận xét (tùy chọn)"
          name="feedback"
          rules={[{ max: 500, message: "Tối đa 500 ký tự" }]}
        >
          <Input.TextArea placeholder="Chia sẻ thêm về trải nghiệm..." rows={4} maxLength={500} showCount />
        </Form.Item>

        <div className="space-y-2">
          <Button type="primary" block size="large" loading={loading} onClick={handleSubmit}>
            Gửi đánh giá
          </Button>
          <Button type="default" block onClick={onSkip}>
            Bỏ qua
          </Button>
        </div>
      </Form>
    </div>
  );
};

// ========== MAIN LAYOUT ==========
const MainLayout: React.FC = () => {
  const [showBankModal, setShowBankModal] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bankForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [showChat, setShowChat] = useState(false);
  const [chatView, setChatView] = useState<ChatView>("list");
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [uploadFile, setUploadFile] = useState<any>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [roomFilter, setRoomFilter] = useState<"open" | "closed">("open");
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [createForm] = Form.useForm();
  const [ratingForm] = Form.useForm();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const checkBankInfoRequired = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const profileRes = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const user = profileRes.data.user;
      const hasBankInfo = user.bank_account_number && user.bank_name && user.bank_account_name;
      if (hasBankInfo) return;

      const ordersRes = await axios.get(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userOrders = ordersRes.data.data || [];
      const needsRefund = userOrders.some(
        (o: any) => o.payment_status === "refund_processing" || o.shipping?.shipping_status === "return_processing"
      );

      if (needsRefund) {
        setOrders(userOrders.filter(
          (o: any) => o.payment_status === "refund_processing" || o.shipping?.shipping_status === "return_processing"
        ));
        setShowBankModal(true);
      }
    } catch (err) {
      console.error("Bank check error:", err);
    }
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const res = await axios.get(`${API_URL}/client/chat/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error("Unread count error:", err);
    }
  }, []);

  const loadChatRooms = useCallback(async () => {
    try {
      setRoomsLoading(true);
      const token = getAuthToken();
      if (!token) return;

      const res = await axios.get(`${API_URL}/client/chat?status=${roomFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChatRooms(res.data.data || []);
    } catch (err) {
      console.error("Load rooms error:", err);
      message.error("Không thể tải danh sách phòng chat");
    } finally {
      setRoomsLoading(false);
    }
  }, [roomFilter]);

  const loadMessages = useCallback(async (roomId: number) => {
    try {
      const token = getAuthToken();
      const res = await axios.get(`${API_URL}/client/chat/${roomId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const processedMessages = (res.data.data || []).map((msg: Message) => ({
        ...msg,
        attachment_url: msg.attachment
          ? (msg.attachment_url || `${API_URL.replace("/api", "")}/storage/${msg.attachment}`)
          : null,
        attachment_info: msg.attachment_info,
      }));

      setMessages(processedMessages);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      loadUnreadCount();
    } catch (err) {
      console.error("Load messages error:", err);
      message.error("Không thể tải tin nhắn");
    }
  }, [loadUnreadCount]);

  const createChatRoom = useCallback(async (values: any) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        message.error("Vui lòng đăng nhập");
        return;
      }

      const openRooms = chatRooms.filter(room => room.status === "open");
      if (openRooms.length >= 4) {
        message.error("Bạn chỉ có thể mở tối đa 4 phòng chat cùng lúc. Vui lòng đóng một số phòng trước khi tạo mới.");
        setLoading(false);
        return;
      }

      const res = await axios.post(`${API_URL}/client/chat/create`, values, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (res.data.success) {
        const newRoom = res.data.data;
        setCurrentRoom(newRoom);
        setChatView("chat");
        loadMessages(newRoom.id);
        loadChatRooms();
        createForm.resetFields();
        message.success("Đã tạo yêu cầu hỗ trợ");
      }
    } catch (err: any) {
      console.error("Create room error:", err);
      message.error(err.response?.data?.message || "Không thể tạo yêu cầu");
    } finally {
      setLoading(false);
    }
  }, [createForm, loadChatRooms, loadMessages, chatRooms]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() && !uploadFile) return;
    if (!currentRoom) return;

    try {
      setSendingMessage(true);
      const token = getAuthToken();
      const formData = new FormData();

      if (newMessage.trim()) formData.append("content", newMessage);
      if (uploadFile) {
        const fileSizeMB = uploadFile.size / 1024 / 1024;
        if (fileSizeMB > 10) {
          message.error("File không được vượt quá 10MB!");
          setSendingMessage(false);
          return;
        }
        formData.append("attachment", uploadFile);
      }

      const res = await axios.post(`${API_URL}/client/chat/${currentRoom.id}/send`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        setNewMessage("");
        setUploadFile(null);
        const newMsg: Message = {
          ...res.data.data,
          attachment_url: res.data.data.attachment
            ? (res.data.data.attachment_url || `${API_URL.replace("/api", "")}/storage/${res.data.data.attachment}`)
            : null,
          attachment_info: res.data.data.attachment_info,
        };
        setMessages(prev => [...prev, newMsg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch (err: any) {
      console.error("Send message error:", err);
      if (err.response?.status === 422) {
        message.error(err.response?.data?.message || "Ảnh không hợp lệ");
      } else {
        message.error(err.response?.data?.message || "Không thể gửi tin nhắn");
      }
    } finally {
      setSendingMessage(false);
    }
  }, [newMessage, uploadFile, currentRoom]);

  const closeRoom = useCallback(async (roomId: number) => {
    try {
      const token = getAuthToken();
      const res = await axios.post(`${API_URL}/client/chat/${roomId}/close`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        message.success("Đã đóng phòng chat");
        setChatView("rating");
        loadChatRooms();
      }
    } catch (err: any) {
      console.error("Close room error:", err);
      message.error(err.response?.data?.message || "Không thể đóng phòng chat");
    }
  }, [loadChatRooms]);

  const rateAgent = useCallback(async (values: any) => {
    try {
      if (!currentRoom) return;

      setLoading(true);
      const token = getAuthToken();
      const res = await axios.post(`${API_URL}/client/chat/${currentRoom.id}/rate`, values, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      if (res.data.success) {
        message.success("Cảm ơn bạn đã đánh giá!");
        setChatView("list");
        setCurrentRoom(null);
        ratingForm.resetFields();
        loadChatRooms();
      }
    } catch (err: any) {
      console.error("Rate error:", err);
      message.error(err.response?.data?.message || "Không thể gửi đánh giá");
    } finally {
      setLoading(false);
    }
  }, [currentRoom, ratingForm, loadChatRooms]);

  const handleBankSubmit = useCallback(async (passwordValues: any) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const bankValues = bankForm.getFieldsValue();

      await axios.post(`${API_URL}/profile`, { ...bankValues, password: passwordValues.password, _method: "PUT" }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      message.success("Cập nhật thông tin ngân hàng thành công");
      setShowBankModal(false);
      setShowPasswordModal(false);
      bankForm.resetFields();
      passwordForm.resetFields();
    } catch (err: any) {
      message.error(err.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setLoading(false);
    }
  }, [bankForm, passwordForm]);

  useEffect(() => {
    checkBankInfoRequired();
    const token = getAuthToken();
    if (token) loadUnreadCount();
  }, [checkBankInfoRequired, loadUnreadCount]);

  useEffect(() => {
    if (currentRoom && chatView === "chat" && currentRoom.status === "open") {
      if (pollingRef.current) clearInterval(pollingRef.current);

      pollingRef.current = setInterval(() => {
        loadMessages(currentRoom.id);
        loadUnreadCount();
      }, 5000);

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [currentRoom?.id, chatView, currentRoom?.status, loadMessages, loadUnreadCount]);

  useEffect(() => {
    if (showChat) loadChatRooms();
  }, [roomFilter, showChat, loadChatRooms]);

  const toggleChat = () => {
    setShowChat(prev => !prev);
    if (!showChat) {
      loadChatRooms();
      loadUnreadCount();
    }
  };

  const selectRoom = (room: ChatRoom) => {
    setCurrentRoom(room);
    setChatView("chat");
    loadMessages(room.id);
  };

  const handleBack = () => {
    setChatView("list");
    setCurrentRoom(null);
    setMessages([]);
    setNewMessage("");
    setUploadFile(null);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
  };

  const handleCloseRoom = () => {
    if (!currentRoom) return;
    Modal.confirm({
      title: "Đóng phòng chat",
      content: "Bạn chắc chắn muốn đóng phòng chat này?",
      okText: "Đóng",
      cancelText: "Hủy",
      onOk: () => closeRoom(currentRoom.id),
    });
  };

  return (
    <>
      {/* Bank Info Modal */}
      <Modal
        title="Cập nhật thông tin ngân hàng"
        open={showBankModal}
        onCancel={() => setShowBankModal(false)}
        footer={null}
        width={600}
      >
        <Alert
          message="Thông tin ngân hàng cần thiết"
          description="Để hoàn tất quy trình hoàn tiền, bạn cần cập nhật thông tin ngân hàng."
          type="warning"
          showIcon
          className="mb-4"
        />

        {orders.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Đơn hàng cần hoàn tiền:</h4>
            <List
              dataSource={orders}
              renderItem={(order) => (
                <List.Item key={order.id}>
                  <span className="text-sm">
                    Đơn {order.order_number} - {order.payment_status === "refund_processing" ? "Hoàn tiền" : "Trả hàng"}
                  </span>
                </List.Item>
              )}
            />
          </div>
        )}

        <Form form={bankForm} layout="vertical" className="mb-4">
          <Form.Item
            label="Tên ngân hàng"
            name="bank_name"
            rules={[{ required: true, message: "Vui lòng nhập tên ngân hàng" }]}
          >
            <Input placeholder="VD: Vietcombank, Techcombank..." />
          </Form.Item>

          <Form.Item
            label="Số tài khoản"
            name="bank_account_number"
            rules={[
              { required: true, message: "Vui lòng nhập số tài khoản" },
              { pattern: /^[0-9]{9,20}$/, message: "Số tài khoản không hợp lệ" },
            ]}
          >
            <Input placeholder="Nhập số tài khoản" />
          </Form.Item>

          <Form.Item
            label="Chủ tài khoản"
            name="bank_account_name"
            rules={[{ required: true, message: "Vui lòng nhập chủ tài khoản" }]}
          >
            <Input placeholder="Nhập tên chủ tài khoản" />
          </Form.Item>
        </Form>

        <Button
          type="primary"
          block
          size="large"
          onClick={() => setShowPasswordModal(true)}
          loading={loading}
        >
          Tiếp tục
        </Button>
      </Modal>

      {/* Password Verification Modal */}
      <Modal
        title="Xác minh mật khẩu"
        open={showPasswordModal}
        onCancel={() => setShowPasswordModal(false)}
        footer={null}
      >
        <Form form={passwordForm} layout="vertical" onFinish={handleBankSubmit}>
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Cập nhật
          </Button>
        </Form>
      </Modal>

      {/* Main Header */}
      <Header />

      <div className="flex-1 bg-gray-100 p-4">
        <div className="max-w-5xl mx-auto">
          {/* Chat Button - Floating */}
          {!showChat && (
            <button
              onClick={toggleChat}
              className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center text-2xl transition-all z-40"
              title="Hỗ trợ khách hàng"
            >
              {unreadCount > 0 ? (
                <>
                  <MessageOutlined />
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                </>
              ) : (
                <MessageOutlined />
              )}
            </button>
          )}

          {/* Chat Modal */}
          {showChat && (
            <div className="fixed bottom-8 right-8 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden z-50">
              <ChatHeader
                chatView={chatView}
                currentRoom={currentRoom}
                onClose={() => setShowChat(false)}
                onBack={handleBack}
                onCloseRoom={handleCloseRoom}
              />

              {chatView === "list" && (
                <RoomList
                  rooms={chatRooms}
                  filter={roomFilter}
                  loading={roomsLoading}
                  onFilterChange={setRoomFilter}
                  onSelectRoom={selectRoom}
                  onCreateNew={() => {
                    createForm.resetFields();
                    setChatView("create");
                  }}
                />
              )}

              {chatView === "create" && (
                <CreateForm form={createForm} loading={loading} onSubmit={createChatRoom} />
              )}

              {chatView === "chat" && currentRoom && (
                <ChatMessages
                  messages={messages}
                  currentRoom={currentRoom}
                  newMessage={newMessage}
                  uploadFile={uploadFile}
                  sendingMessage={sendingMessage}
                  messagesEndRef={messagesEndRef}
                  onMessageChange={setNewMessage}
                  onFileSelect={setUploadFile}
                  onFileRemove={() => setUploadFile(null)}
                  onSendMessage={sendMessage}
                />
              )}

              {chatView === "rating" && currentRoom && (
                <RatingForm
                  form={ratingForm}
                  loading={loading}
                  onSubmit={rateAgent}
                  onSkip={() => {
                    setChatView("list");
                    setCurrentRoom(null);
                    ratingForm.resetFields();
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}

      {/* Outlet cho các routes con */}
      <Outlet />
      <Footer />
    </>
  );
};

export default MainLayout;