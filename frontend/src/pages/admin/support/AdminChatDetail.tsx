import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  Row,
  Col,
  Avatar,
  Space,
  Typography,
  Tag,
  Button,
  Input,
  Upload,
  message,
  Spin,
  Divider,
  Image,
  Alert,
} from "antd";
import {
  UserOutlined,
  SendOutlined,
  PaperClipOutlined,
  CloseOutlined,
  LeftOutlined,
  TeamOutlined,
  StarOutlined,
} from "@ant-design/icons";
import axiosClient from "../../../api/axiosClient";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface User {
  id: number;
  name: string;
  email: string;
  image: string | null;
}

interface Agent {
  id: number;
  name: string;
  email: string;
  image: string | null;
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
  rating: number | null;
  feedback: string | null;
  user: User;
  agent: Agent | null;
}

interface Message {
  id: number;
  content: string;
  attachment: string | null;
  attachment_type: "image" | "file" | null;
  attachment_url: string | null;
  sender_type: "user" | "agent";
  sender_name: string;
  sender_image: string | null;
  is_read: boolean;
  created_at: string;
  timestamp: number;
}

const AdminChatDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [newMessage, setNewMessage] = useState("");
  const [uploadFile, setUploadFile] = useState<any>(null);

  // Polling
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchChatRoom();
    fetchMessages();

    // Polling mỗi 5 giây
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchChatRoom = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get(`/admin/chat/rooms/${id}`);

      if (response.data?.success) {
        setChatRoom(response.data.chat_room);
      }
    } catch (error: any) {
      console.error("Error fetching chat room:", error);
      message.error(error?.response?.data?.message || "Lỗi tải phòng chat");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axiosClient.get(`/admin/chat/rooms/${id}/messages`);

      if (response.data?.success) {
        setMessages(response.data.data || []);
      }
    } catch (error: any) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !uploadFile) {
      message.warning("Vui lòng nhập nội dung hoặc đính kèm file");
      return;
    }

    try {
      setSending(true);

      const formData = new FormData();
      if (newMessage.trim()) formData.append("content", newMessage);
      if (uploadFile) formData.append("attachment", uploadFile);

      const response = await axiosClient.post(
        `/admin/chat/rooms/${id}/send`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data?.success) {
        setMessages((prev) => [...prev, response.data.data]);
        setNewMessage("");
        setUploadFile(null);
        message.success("Đã gửi tin nhắn");
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      message.error(error?.response?.data?.message || "Lỗi gửi tin nhắn");
    } finally {
      setSending(false);
    }
  };

  const handleCloseRoom = async () => {
    try {
      await axiosClient.post(`/admin/chat/rooms/${id}/close`);
      message.success("Đã đóng phòng chat");
      fetchChatRoom();
    } catch (error: any) {
      message.error(error?.response?.data?.message || "Lỗi đóng phòng chat");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!chatRoom) {
    return (
      <div style={{ padding: "24px" }}>
        <Alert message="Không tìm thấy phòng chat" type="error" />
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}>
      {/* Header */}
      <Card style={{ marginBottom: "16px" }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                icon={<LeftOutlined />}
                onClick={() => navigate("/admin/chat/rooms")}
              >
                Quay lại
              </Button>
              <Title level={4} style={{ margin: 0 }}>
                {chatRoom.subject}
              </Title>
              <Tag color={chatRoom.status === "open" ? "green" : "default"}>
                {chatRoom.status === "open" ? "Đang mở" : "Đã đóng"}
              </Tag>
            </Space>
          </Col>
          <Col>
            {chatRoom.status === "open" && (
              <Button danger onClick={handleCloseRoom}>
                Đóng phòng chat
              </Button>
            )}
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        {/* Chat Area */}
        <Col span={16}>
          <Card
            title="Tin nhắn"
            style={{ height: "calc(100vh - 200px)", display: "flex", flexDirection: "column" }}
            bodyStyle={{ flex: 1, display: "flex", flexDirection: "column", padding: 0 }}
          >
            {/* Messages List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px",
                background: "#fafafa",
              }}
            >
              {messages.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                  Chưa có tin nhắn nào
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      justifyContent: msg.sender_type === "agent" ? "flex-end" : "flex-start",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "70%",
                        background: msg.sender_type === "agent" ? "#1890ff" : "#fff",
                        color: msg.sender_type === "agent" ? "#fff" : "#000",
                        padding: "12px",
                        borderRadius: "8px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                      }}
                    >
                      {msg.sender_type === "user" && (
                        <div style={{ fontSize: "11px", marginBottom: "4px", opacity: 0.7 }}>
                          {msg.sender_name}
                        </div>
                      )}

                      {msg.content && (
                        <div style={{ whiteSpace: "pre-wrap", marginBottom: msg.attachment ? "8px" : 0 }}>
                          {msg.content}
                        </div>
                      )}

                      {msg.attachment && msg.attachment_url && (
                        <div>
                          {msg.attachment_type === "image" ? (
                            <Image
                              src={msg.attachment_url}
                              alt="Attachment"
                              style={{ maxWidth: "100%", borderRadius: "4px" }}
                            />
                          ) : (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: msg.sender_type === "agent" ? "#fff" : "#1890ff" }}
                            >
                              📎 File đính kèm
                            </a>
                          )}
                        </div>
                      )}

                      <div
                        style={{
                          fontSize: "10px",
                          marginTop: "4px",
                          opacity: 0.7,
                        }}
                      >
                        {msg.created_at}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {chatRoom.status === "open" ? (
              <div style={{ padding: "16px", background: "#fff", borderTop: "1px solid #f0f0f0" }}>
                {uploadFile && (
                  <div style={{ marginBottom: "8px", padding: "8px", background: "#f5f5f5", borderRadius: "4px" }}>
                    <Space>
                      <Text>📎 {uploadFile.name}</Text>
                      <Button
                        type="text"
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={() => setUploadFile(null)}
                      />
                    </Space>
                  </div>
                )}

                <Space.Compact style={{ width: "100%" }}>
                  <Upload
                    beforeUpload={(file) => {
                      if (file.size > 10 * 1024 * 1024) {
                        message.error("File không được vượt quá 10MB");
                        return false;
                      }
                      setUploadFile(file);
                      return false;
                    }}
                    showUploadList={false}
                    accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                  >
                    <Button icon={<PaperClipOutlined />} disabled={sending}>
                      Đính kèm
                    </Button>
                  </Upload>

                  <TextArea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    disabled={sending}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />

                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={sending}
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && !uploadFile) || sending}
                  >
                    Gửi
                  </Button>
                </Space.Compact>
              </div>
            ) : (
              <div style={{ padding: "16px", textAlign: "center", background: "#f5f5f5" }}>
                <Text type="secondary">Phòng chat đã đóng</Text>
              </div>
            )}
          </Card>
        </Col>

        {/* Info Sidebar */}
        <Col span={8}>
          <Card title="Thông tin khách hàng">
            <Space direction="vertical" style={{ width: "100%" }}>
              <div style={{ textAlign: "center" }}>
                <Avatar
                  src={chatRoom.user.image}
                  icon={<UserOutlined />}
                  size={64}
                />
                <Title level={5} style={{ marginTop: "8px", marginBottom: 0 }}>
                  {chatRoom.user.name}
                </Title>
                <Text type="secondary">{chatRoom.user.email}</Text>
              </div>

              <Divider />

              <div>
                <Text type="secondary">Thời gian tạo:</Text>
                <br />
                <Text>{chatRoom.created_at}</Text>
              </div>

              <div>
                <Text type="secondary">Cập nhật gần nhất:</Text>
                <br />
                <Text>{chatRoom.updated_at}</Text>
              </div>

              {chatRoom.closed_at && (
                <div>
                  <Text type="secondary">Đóng lúc:</Text>
                  <br />
                  <Text>{chatRoom.closed_at}</Text>
                </div>
              )}
            </Space>
          </Card>

          {chatRoom.agent && (
            <Card title="Agent phụ trách" style={{ marginTop: "16px" }}>
              <Space direction="vertical" style={{ width: "100%" }}>
                <div style={{ textAlign: "center" }}>
                  <Avatar
                    src={chatRoom.agent.image}
                    icon={<TeamOutlined />}
                    size={64}
                  />
                  <Title level={5} style={{ marginTop: "8px", marginBottom: 0 }}>
                    {chatRoom.agent.name}
                  </Title>
                  <Text type="secondary">{chatRoom.agent.email}</Text>
                  <div style={{ marginTop: "8px" }}>
                    <Tag color="blue">
                      <StarOutlined /> {chatRoom.agent.rating.toFixed(1)}
                    </Tag>
                    <Tag color={chatRoom.agent.status === "online" ? "green" : "default"}>
                      {chatRoom.agent.status}
                    </Tag>
                  </div>
                </div>
              </Space>
            </Card>
          )}

          {chatRoom.rating && (
            <Card title="Đánh giá" style={{ marginTop: "16px" }}>
              <div>
                <Text>Số sao: </Text>
                <Tag color="gold">⭐ {chatRoom.rating}/5</Tag>
              </div>
              {chatRoom.feedback && (
                <div style={{ marginTop: "8px" }}>
                  <Text type="secondary">Nhận xét:</Text>
                  <div style={{ marginTop: "4px", padding: "8px", background: "#f5f5f5", borderRadius: "4px" }}>
                    <Text>{chatRoom.feedback}</Text>
                  </div>
                </div>
              )}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default AdminChatDetail;