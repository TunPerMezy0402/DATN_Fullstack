import React, { useEffect, useState, useRef } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Divider,
  Typography,
  Modal,
  Upload,
  Spin,
  Select,
  Checkbox,
  Space,
  Popconfirm,
} from "antd";
import {
  EditOutlined,
  UploadOutlined,
  LockOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import axios from "axios";
import authService from "../../../../services/authService";
import { provinces, districts, wards } from "vietnam-provinces";
import type { UploadChangeParam } from "antd/es/upload";
import NoImage from "../../../../assets/client/img/default-avatar.jpg";

const { Title } = Typography;

// ✅ Lấy token đăng nhập
const getAuthToken = () =>
  localStorage.getItem("access_token") || localStorage.getItem("token");

const Profile: React.FC = () => {

  const [editing, setEditing] = useState({
    name: false,
    phone: false,
  });

  const [hasChanges, setHasChanges] = useState(false);

  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [addressForm] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [passwordModal, setPasswordModal] = useState(false);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [addressModal, setAddressModal] = useState(false);
  const [editAddress, setEditAddress] = useState<any>(null);

  const [districtList, setDistrictList] = useState<any[]>([]);
  const [wardList, setWardList] = useState<any[]>([]);

  // ✅ Ref để lưu trữ object URL hiện tại
  const avatarObjectUrlRef = useRef<string | null>(null);

  // ✅ Lấy thông tin người dùng + địa chỉ
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const res = await axios.get("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(res.data.user);
      setAddresses(res.data.addresses || []);
      // Backend returns full URL in `image`
      setAvatarPreview(res.data.user.image || null);

      form.setFieldsValue({
        name: res.data.user.name,
        email: res.data.user.email,
        phone: res.data.user.phone,
      });
    } catch {
      message.error("Không thể tải thông tin người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // ✅ Cleanup object URL khi component unmount
  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      }
    };
  }, []);

  // ✅ Cập nhật hồ sơ
  const handleUpdateProfile = async (values: any) => {
    try {
      const token = getAuthToken();
      const formData = new FormData();

      Object.entries(values).forEach(([key, value]) => {
        if (value) formData.append(key, value as string);
      });

      if (avatarFile) formData.append("avatar", avatarFile);

      // Use POST with method override to ensure file uploads work across environments
      formData.append("_method", "PUT");
      const res = await axios.post("/api/profile", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          // Let axios set proper multipart boundary automatically
        },
      });

      message.success(res.data.message || "Cập nhật thành công");
      // ✅ Cập nhật avatar vào local user và phát sự kiện để Header reload
      const newImage = res.data?.user?.image;
      if (newImage) {
        authService.updateUser({ avatar: newImage } as any);
        window.dispatchEvent(new CustomEvent("profile-updated", { detail: { avatar: newImage } }));
      }

      // ✅ Cleanup old object URL sau khi upload thành công
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
      setAvatarFile(null);

      fetchProfile();
    } catch {
      message.error("Cập nhật thất bại");
    }
  };

  // ✅ Hiển thị ảnh tạm khi upload
  const handleAvatarChange = (info: UploadChangeParam) => {
    console.log("Upload info:", info);

    // Lấy file từ originFileObj hoặc file object
    const file = info.file.originFileObj || info.file;

    if (!file || !(file instanceof File)) {
      console.log("No valid file found");
      return;
    }

    console.log("File details:", {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Basic client-side guard
    if (!file.type.startsWith("image/")) {
      message.error("Vui lòng chọn định dạng ảnh hợp lệ");
      return;
    }

    // ✅ Cleanup old object URL trước khi tạo URL mới
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
    }

    // ✅ Tạo object URL mới và lưu vào ref
    const objectUrl = URL.createObjectURL(file);
    console.log("Created object URL:", objectUrl);
    avatarObjectUrlRef.current = objectUrl;

    setAvatarFile(file);
    setAvatarPreview(objectUrl);
  };

  // ✅ Đổi mật khẩu
  const handleChangePassword = async (values: any) => {
    try {
      const token = getAuthToken();
      await axios.post("/api/profile/change-password", values, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Đổi mật khẩu thành công");
      setPasswordModal(false);
      passwordForm.resetFields();
    } catch (err: any) {
      message.error(err.response?.data?.message || "Đổi mật khẩu thất bại");
    }
  };

  // ✅ Khi chọn tỉnh/huyện
  const handleProvinceChange = (provinceCode: string) => {
    const filtered = districts.filter((d) => d.province_code === provinceCode);
    setDistrictList(filtered);
    setWardList([]);
    addressForm.setFieldsValue({ district: null, commune: null });
  };

  const handleDistrictChange = (districtCode: string) => {
    const filtered = wards.filter((w) => w.district_code === districtCode);
    setWardList(filtered);
    addressForm.setFieldsValue({ commune: null });
  };

  // ✅ Lưu địa chỉ
  const handleSaveAddress = async (values: any) => {
    try {
      const token = getAuthToken();

      if (editAddress) {
        await axios.put(`/api/profile/address/${editAddress.id}`, values, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success("Cập nhật địa chỉ thành công");
      } else {
        await axios.post("/api/profile/address", values, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success("Thêm địa chỉ thành công");
      }

      setAddressModal(false);
      setEditAddress(null);
      addressForm.resetFields();
      fetchProfile();
    } catch {
      message.error("Không thể lưu địa chỉ");
    }
  };

  // ✅ Đặt làm địa chỉ mặc định
  const handleSetDefault = async (addressId: number) => {
    try {
      const token = getAuthToken();
      const selected = addresses.find((a) => a.id === addressId);
      if (!selected) return;

      const payload = {
        ...selected,
        is_default: true,
      };

      await axios.put(`/api/profile/address/${addressId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      message.success("Đã đặt làm địa chỉ mặc định");
      fetchProfile();
    } catch (err: any) {
      console.error(err.response?.data);
      message.error(
        err.response?.data?.message || "Không thể đặt địa chỉ mặc định"
      );
    }
  };



  const handleDeleteAddress = async (addressId: number) => {
    try {
      const token = getAuthToken();
      await axios.delete(`/api/profile/address/${addressId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      message.success("Đã xóa địa chỉ");
      fetchProfile();
    } catch {
      message.error("Không thể xóa địa chỉ");
    }
  };

  const handleEditAddress = (addr: any) => {
    setEditAddress(addr);
    const dList = districts.filter((d) => d.province_code === addr.city);
    const wList = wards.filter((w) => w.district_code === addr.district);
    setDistrictList(dList);
    setWardList(wList);
    setAddressModal(true);
    setTimeout(() => {
      addressForm.setFieldsValue(addr);
    }, 0);
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-96">
        <Spin size="large" />
      </div>
    );

  const renderFullAddress = (addr: any) => {
    const cityName = provinces.find((p) => p.code === addr.city)?.name || "";
    const districtName =
      districts.find((d) => d.code === addr.district)?.name || "";
    const communeName = wards.find((w) => w.code === addr.commune)?.name || "";
    return `${addr.village}, ${communeName}, ${districtName}, ${cityName}`;
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Card className="shadow-md rounded-xl">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
          <div className="flex flex-col items-center">
            <div className="w-72 h-72 rounded-full overflow-hidden border-4 border-gray-200 shadow-md mt-4">
              <img
                src={avatarPreview || NoImage}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>

            <Upload
              showUploadList={false}
              beforeUpload={() => false}
              onChange={handleAvatarChange}
              accept="image/*"
            >
              <div className="flex justify-center w-full">
                <Button
                  icon={<UploadOutlined />}
                  className="mt-4"
                  style={{ borderRadius: 8 }}
                >
                  Chọn ảnh mới
                </Button>
              </div>
            </Upload>
          </div>

          <div className="flex-1 w-full max-w-md">
            <Title level={3} className="mb-3 text-center md:text-left">
              Thông tin cá nhân
            </Title>
            <Divider className="mt-0 mb-4" />

            <Form
              form={form}
              layout="vertical"
              onFinish={handleUpdateProfile}
              className="flex flex-col gap-4"
              onValuesChange={() => setHasChanges(true)}
            >
              {/* Họ và tên */}
              <Form.Item
                label={
                  <div className="flex justify-between items-center">
                    <span className="mr-3">Họ và tên</span>
                    <EditOutlined
                      onClick={() =>
                        setEditing((prev) => ({ ...prev, name: !prev.name }))
                      }
                      className="cursor-pointer text-gray-500 hover:text-blue-500"
                    />
                  </div>
                }
                name="name"
                rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
              >
                <Input
                  placeholder="Nhập họ và tên"
                  disabled={!editing.name}
                />
              </Form.Item>

              {/* Email */}
              <Form.Item label="Email" name="email">
                <Input disabled />
              </Form.Item>

              {/* Số điện thoại */}
              <Form.Item
                label={
                  <div className="flex justify-between items-center">
                    <span className="mr-3">Số điện thoại</span>
                    <EditOutlined
                      onClick={() =>
                        setEditing((prev) => ({ ...prev, phone: !prev.phone }))
                      }
                      className="cursor-pointer text-gray-500 hover:text-blue-500"
                    />
                  </div>
                }
                name="phone"
                rules={[
                  { required: true, message: "Nhập số điện thoại" },
                  { pattern: /^\d{10}$/, message: "Số điện thoại phải gồm 10 chữ số" },
                ]}
              >
                <Input
                  placeholder="Nhập số điện thoại"
                  disabled={!editing.phone}
                />
              </Form.Item>

              {/* Nút hành động */}
              <div className="flex flex-col md:flex-row gap-3 mt-2">
                <Button
  type="primary"
  icon={<SaveOutlined />}
  htmlType="submit"
  className="flex-1"
  disabled={!hasChanges || loading}
  loading={loading}
>
  Lưu thay đổi
</Button>
                <Button
                  icon={<LockOutlined />}
                  onClick={() => setPasswordModal(true)}
                  className="flex-1"
                >
                  Đổi mật khẩu
                </Button>
              </div>
            </Form>

          </div>
        </div>
      </Card>

      <Card
        title="Danh sách địa chỉ"
        className="shadow-sm mt-6"
        extra={
          addresses.length < 3 && (
            <Button
              type="primary"
              onClick={() => {
                setEditAddress(null);
                addressForm.resetFields();
                setAddressModal(true);
              }}
            >
              + Thêm địa chỉ
            </Button>
          )
        }
      >
        {addresses.map((addr) => (
          <Card
            key={addr.id}
            className="mb-3"
            type="inner"
            title={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span>{`${addr.recipient_name} (${addr.phone})`}</span>
                  {addr.is_default && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      Mặc định
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {!addr.is_default && (
                    <Button
                      type="default"
                      icon={<CheckCircleOutlined />}
                      onClick={() => handleSetDefault(addr.id)}
                    >
                      Đặt làm mặc định
                    </Button>
                  )}
                  <Button onClick={() => handleEditAddress(addr)}>Sửa</Button>
                  <Popconfirm
                    title="Xóa địa chỉ"
                    description="Bạn có chắc muốn xóa địa chỉ này?"
                    onConfirm={() => handleDeleteAddress(addr.id)}
                    okText="Xóa"
                    cancelText="Hủy"
                  >
                    <Button danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              </div>

            }
          >
            <p>{renderFullAddress(addr)}</p>
            {addr.notes && (
              <p className="italic text-gray-600 mt-2">Ghi chú: {addr.notes}</p>
            )}
          </Card>
        ))}

      </Card>

      <Modal
        open={passwordModal}
        title="Đổi mật khẩu"
        onCancel={() => setPasswordModal(false)}
        footer={null}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            label="Mật khẩu hiện tại"
            name="current_password"
            rules={[{ required: true, message: "Nhập mật khẩu hiện tại" }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label="Mật khẩu mới"
            name="new_password"
            rules={[{ required: true, message: "Nhập mật khẩu mới" }]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu"
            name="new_password_confirmation"
            dependencies={["new_password"]}
            rules={[
              { required: true, message: "Xác nhận mật khẩu mới" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("new_password") === value)
                    return Promise.resolve();
                  return Promise.reject(new Error("Mật khẩu không khớp"));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Button type="primary" htmlType="submit" block icon={<EditOutlined />}>
            Cập nhật mật khẩu
          </Button>
        </Form>
      </Modal>

      <Modal
        open={addressModal}
        title={editAddress ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}
        onCancel={() => {
          setAddressModal(false);
          setEditAddress(null);
        }}
        footer={null}
      >
        <Form form={addressForm} layout="vertical" onFinish={handleSaveAddress}>
          <Form.Item
            label="Họ tên người nhận"
            name="recipient_name"
            rules={[{ required: true, message: "Nhập tên người nhận" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[{ required: true, message: "Nhập số điện thoại" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Tỉnh/Thành phố"
            name="city"
            rules={[{ required: true, message: "Chọn tỉnh/thành phố" }]}
          >
            <Select
              placeholder="Chọn tỉnh/thành phố"
              onChange={handleProvinceChange}
              options={provinces.map((p) => ({ label: p.name, value: p.code }))}
            />
          </Form.Item>

          <Form.Item
            label="Quận/Huyện"
            name="district"
            rules={[{ required: true, message: "Chọn quận/huyện" }]}
          >
            <Select
              placeholder="Chọn quận/huyện"
              onChange={handleDistrictChange}
              options={districtList.map((d) => ({
                label: d.name,
                value: d.code,
              }))}
              disabled={!districtList.length}
            />
          </Form.Item>

          <Form.Item
            label="Phường/Xã"
            name="commune"
            rules={[{ required: true, message: "Chọn phường/xã" }]}
          >
            <Select
              placeholder="Chọn phường/xã"
              options={wardList.map((w) => ({ label: w.name, value: w.code }))}
              disabled={!wardList.length}
            />
          </Form.Item>

          <Form.Item
            label="Địa chỉ cụ thể"
            name="village"
            rules={[{ required: true, message: "Nhập địa chỉ cụ thể" }]}
          >
            <Input.TextArea rows={2} placeholder="Số nhà, tên đường..." />
          </Form.Item>

          <Form.Item label="Ghi chú" name="notes">
            <Input.TextArea rows={2} placeholder="Ghi chú giao hàng (nếu có)" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>
            {editAddress ? "Cập nhật địa chỉ" : "Thêm mới"}
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default Profile;