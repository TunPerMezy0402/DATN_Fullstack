import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Modal, Form, Input, Button, message, Alert, FloatButton, Tooltip } from "antd";
import { BankOutlined, LockOutlined, CustomerServiceOutlined, SendOutlined } from "@ant-design/icons";
import axios from "axios";
import Header from "../../components/common/Header";
import Footer from "../../components/common/Footer";

const API_URL = "http://127.0.0.1:8000/api";
const getAuthToken = () =>
  localStorage.getItem("access_token") || localStorage.getItem("token");

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const [showBankModal, setShowBankModal] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bankForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportForm] = Form.useForm();
  const [supportLoading, setSupportLoading] = useState(false);

  // Check if user needs to update bank info
  const checkBankInfoRequired = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      // Fetch user profile
      const profileRes = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const user = profileRes.data.user;

      // Check if bank info is missing
      const hasBankInfo =
        user.bank_account_number &&
        user.bank_name &&
        user.bank_account_name;

      if (hasBankInfo) {
        return; // User already has bank info
      }

      // Fetch user orders
      const ordersRes = await axios.get(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userOrders = ordersRes.data.data || [];

      // Check if any order is in refund/return processing status
      const needsRefund = userOrders.some(
        (order: any) =>
          order.payment_status === "refund_processing" ||
          order.shipping?.shipping_status === "return_processing"
      );

      if (needsRefund) {
        setOrders(
          userOrders.filter(
            (order: any) =>
              order.payment_status === "refund_processing" ||
              order.shipping?.shipping_status === "return_processing"
          )
        );
        setShowBankModal(true);
      }
    } catch (error) {
      console.error("Error checking bank info:", error);
    }
  };

  useEffect(() => {
    checkBankInfoRequired();
  }, []);

  const handleBankFormSubmit = async (values: any) => {
    setShowPasswordModal(true);
  };

  const handleUpdateBankInfo = async (passwordValues: any) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const bankValues = bankForm.getFieldsValue();

      const payload = {
        ...bankValues,
        password: passwordValues.password,
        _method: "PUT",
      };

      await axios.post(`${API_URL}/profile`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      message.success("Cập nhật thông tin ngân hàng thành công");
      setShowBankModal(false);
      setShowPasswordModal(false);
      bankForm.resetFields();
      passwordForm.resetFields();
    } catch (err: any) {
      message.error(
        err.response?.data?.message || "Cập nhật thông tin ngân hàng thất bại"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSupportSubmit = async (values: any) => {
    try {
      setSupportLoading(true);
      const token = getAuthToken();

      await axios.post(
        `${API_URL}/support-tickets`,
        {
          subject: values.subject,
          message: values.message,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      message.success("Ticket hỗ trợ được tạo thành công!");
      setShowSupportModal(false);
      supportForm.resetFields();
    } catch (err: any) {
      message.error(
        err.response?.data?.message || "Lỗi khi tạo ticket hỗ trợ"
      );
    } finally {
      setSupportLoading(false);
    }
  };

  const handleSupportClick = () => {
    const token = getAuthToken();
    if (!token) {
      message.warning("Vui lòng đăng nhập để gửi yêu cầu hỗ trợ");
      navigate("/login");
      return;
    }
    setShowSupportModal(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <Footer />

      {/* Bank Info Modal */}
      <Modal
        open={showBankModal}
        title={
          <div className="flex items-center gap-2">
            <BankOutlined className="text-blue-500" />
            <span>Cập nhật thông tin ngân hàng</span>
          </div>
        }
        closable={false}
        maskClosable={false}
        footer={null}
        width={600}
      >
        <Alert
          message="Yêu cầu cập nhật thông tin ngân hàng"
          description={
            <div>
              <p>
                Bạn có {orders.length} đơn hàng đang trong quá trình hoàn
                tiền/hoàn hàng. Vui lòng cập nhật thông tin ngân hàng để nhận
                tiền hoàn lại.
              </p>
              <ul className="mt-2 ml-4">
                {orders.slice(0, 3).map((order) => (
                  <li key={order.id} className="text-sm">
                    • Đơn hàng #{order.sku} -{" "}
                    {order.payment_status === "refund_processing"
                      ? "Đang xử lý hoàn tiền"
                      : "Đang xử lý hoàn hàng"}
                  </li>
                ))}
                {orders.length > 3 && (
                  <li className="text-sm text-gray-500">
                    • ... và {orders.length - 3} đơn hàng khác
                  </li>
                )}
              </ul>
            </div>
          }
          type="warning"
          showIcon
          className="mb-4"
        />

        <Form
          form={bankForm}
          layout="vertical"
          onFinish={handleBankFormSubmit}
        >
          <Form.Item
            label="Số tài khoản ngân hàng"
            name="bank_account_number"
            rules={[
              { required: true, message: "Vui lòng nhập số tài khoản" },
              {
                pattern: /^[0-9]+$/,
                message: "Số tài khoản chỉ được chứa số",
              },
            ]}
          >
            <Input
              placeholder="Nhập số tài khoản ngân hàng"
              prefix={<BankOutlined />}
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Tên ngân hàng"
            name="bank_name"
            rules={[{ required: true, message: "Vui lòng nhập tên ngân hàng" }]}
          >
            <Input
              placeholder="VD: Vietcombank, Techcombank, BIDV..."
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Tên chủ tài khoản"
            name="bank_account_name"
            rules={[
              { required: true, message: "Vui lòng nhập tên chủ tài khoản" },
            ]}
          >
            <Input
              placeholder="Nhập tên chủ tài khoản (viết hoa, không dấu)"
              size="large"
            />
          </Form.Item>

          <div className="flex gap-3">
            <Button
              type="default"
              onClick={() => setShowBankModal(false)}
              className="flex-1"
              size="large"
            >
              Để sau
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              className="flex-1"
              size="large"
            >
              Tiếp tục
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Password Confirmation Modal */}
      <Modal
        open={showPasswordModal}
        title="Xác nhận mật khẩu"
        onCancel={() => setShowPasswordModal(false)}
        footer={null}
      >
        <p className="mb-4 text-gray-600">
          Vui lòng nhập mật khẩu để xác nhận thay đổi thông tin ngân hàng
        </p>
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleUpdateBankInfo}
        >
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
          >
            <Input.Password
              placeholder="Nhập mật khẩu của bạn"
              prefix={<LockOutlined />}
              size="large"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            icon={<LockOutlined />}
            size="large"
          >
            Xác nhận
          </Button>
        </Form>
      </Modal>

      {/* Support Chat Modal */}
      <Modal
        open={showSupportModal}
        title={
          <div className="flex items-center gap-2">
            <CustomerServiceOutlined className="text-blue-500" />
            <span>Gửi yêu cầu hỗ trợ</span>
          </div>
        }
        onCancel={() => setShowSupportModal(false)}
        footer={null}
        width={600}
      >
        <Form
          form={supportForm}
          layout="vertical"
          onFinish={handleSupportSubmit}
        >
          <Form.Item
            label="Tiêu đề"
            name="subject"
            rules={[
              { required: true, message: "Vui lòng nhập tiêu đề" },
              { max: 255, message: "Tiêu đề không được vượt quá 255 ký tự" },
            ]}
          >
            <Input
              placeholder="Nhập tiêu đề yêu cầu hỗ trợ"
              size="large"
              maxLength={255}
            />
          </Form.Item>

          <Form.Item
            label="Nội dung"
            name="message"
            rules={[
              { required: true, message: "Vui lòng nhập nội dung" },
              { min: 10, message: "Nội dung phải tối thiểu 10 ký tự" },
              { max: 5000, message: "Nội dung không được vượt quá 5000 ký tự" },
            ]}
          >
            <Input.TextArea
              placeholder="Mô tả chi tiết vấn đề của bạn..."
              rows={6}
              maxLength={5000}
              showCount
            />
          </Form.Item>

          <div className="flex gap-3">
            <Button
              type="default"
              onClick={() => setShowSupportModal(false)}
              className="flex-1"
              size="large"
            >
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={supportLoading}
              icon={<SendOutlined />}
              className="flex-1"
              size="large"
            >
              Gửi yêu cầu
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Support Float Button */}
      <Tooltip title="Gửi yêu cầu hỗ trợ">
        <FloatButton
          icon={<CustomerServiceOutlined />}
          type="primary"
          style={{
            right: 24,
            bottom: 34,
            width: 56,
            height: 56,
            fontSize: 24,
          }}
          onClick={handleSupportClick}
        />
      </Tooltip>
    </div>
  );
};

export default MainLayout;