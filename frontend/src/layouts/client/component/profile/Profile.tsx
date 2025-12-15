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
  Popconfirm,
  Tabs,
} from "antd";
import {
  EditOutlined,
  UploadOutlined,
  LockOutlined,
  SaveOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  BankOutlined,
} from "@ant-design/icons";
import axios from "axios";
import authService from "../../../../services/authService";
import { provinces, districts, wards } from "vietnam-provinces";
import type { UploadChangeParam } from "antd/es/upload";
import NoImage from "../../../../assets/client/img/default-avatar.jpg";

const { Title } = Typography;

const getAuthToken = () =>
  localStorage.getItem("access_token") || localStorage.getItem("token");

const Profile: React.FC = () => {
  const [editing, setEditing] = useState({
    name: false,
    phone: false,
    bank: false,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [hasAvatarChange, setHasAvatarChange] = useState(false);
  const [hasBankChanges, setHasBankChanges] = useState(false);

  const [form] = Form.useForm();
  const [bankForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [addressForm] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [passwordModal, setPasswordModal] = useState(false);
  const [bankPasswordModal, setBankPasswordModal] = useState(false);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [addressModal, setAddressModal] = useState(false);
  const [editAddress, setEditAddress] = useState<any>(null);

  const [districtList, setDistrictList] = useState<any[]>([]);
  const [wardList, setWardList] = useState<any[]>([]);

  const avatarObjectUrlRef = useRef<string | null>(null);
  const initialValuesRef = useRef<any>({});
  const initialBankValuesRef = useRef<any>({});
  // Thêm vào phần khai báo state (sau dòng 46)
const [hasPassword, setHasPassword] = useState(true);

  const fetchProfile = async () => {
  try {
    setLoading(true);
    const token = getAuthToken();
    const res = await axios.get("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });

      setUser(res.data.user);
      setAddresses(res.data.addresses || []);
      setAvatarPreview(res.data.user.image || null);
      setHasPassword(res.data.user.has_password !== false);

      const initialValues = {
        name: res.data.user.name,
        email: res.data.user.email,
        phone: res.data.user.phone,
      };

      const initialBankValues = {
        bank_account_number: res.data.user.bank_account_number || "",
        bank_name: res.data.user.bank_name || "",
        bank_account_name: res.data.user.bank_account_name || "",
      };

      form.setFieldsValue(initialValues);
      bankForm.setFieldsValue(initialBankValues);

      initialValuesRef.current = initialValues;
      initialBankValuesRef.current = initialBankValues;

      setHasChanges(false);
      setHasAvatarChange(false);
      setHasBankChanges(false);
    } catch {
      message.error("Không thể tải thông tin người dùng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
      }
    };
  }, []);

  const checkFormChanges = (changedValues: any, allValues: any) => {
    const hasFormChange =
      allValues.name !== initialValuesRef.current.name ||
      allValues.phone !== initialValuesRef.current.phone;

    setHasChanges(hasFormChange);
  };

  const checkBankChanges = (changedValues: any, allValues: any) => {
    const hasBankChange =
      allValues.bank_account_number !== initialBankValuesRef.current.bank_account_number ||
      allValues.bank_name !== initialBankValuesRef.current.bank_name ||
      allValues.bank_account_name !== initialBankValuesRef.current.bank_account_name;

    setHasBankChanges(hasBankChange);
  };

  const handleUpdateProfile = async (values: any) => {
    try {
      setSaving(true);
      const token = getAuthToken();
      const formData = new FormData();

      Object.entries(values).forEach(([key, value]) => {
        if (value) formData.append(key, value as string);
      });

      if (avatarFile) formData.append("avatar", avatarFile);

      formData.append("_method", "PUT");
      const res = await axios.post("/api/profile", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      message.success(res.data.message || "Cập nhật thành công");

      const newImage = res.data?.user?.image;
      if (newImage) {
        authService.updateUser({ avatar: newImage } as any);
        window.dispatchEvent(
          new CustomEvent("profile-updated", { detail: { avatar: newImage } })
        );
        setAvatarPreview(newImage);
      }

      if (res.data?.user) {
        setUser(res.data.user);
        const updatedValues = {
          name: res.data.user.name,
          email: res.data.user.email,
          phone: res.data.user.phone,
        };
        form.setFieldsValue(updatedValues);
        initialValuesRef.current = updatedValues;
      }

      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
      setAvatarFile(null);
      setHasAvatarChange(false);
      setHasChanges(false);
    } catch {
      message.error("Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBankInfo = async (passwordValues: any) => {
    try {
      setSaving(true);
      const token = getAuthToken();
      const bankValues = bankForm.getFieldsValue();

      const payload = {
        ...bankValues,
        password: passwordValues.password,
        _method: "PUT",
      };

      const res = await axios.post("/api/profile", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      message.success("Cập nhật thông tin ngân hàng thành công");
      
      if (res.data?.user) {
        const updatedBankValues = {
          bank_account_number: res.data.user.bank_account_number || "",
          bank_name: res.data.user.bank_name || "",
          bank_account_name: res.data.user.bank_account_name || "",
        };
        bankForm.setFieldsValue(updatedBankValues);
        initialBankValuesRef.current = updatedBankValues;
      }

      setHasBankChanges(false);
      setBankPasswordModal(false);
      setEditing((prev) => ({ ...prev, bank: false }));
    } catch (err: any) {
      message.error(
        err.response?.data?.message || "Cập nhật thông tin ngân hàng thất bại"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBankFormSubmit = () => {
    if (!hasBankChanges) {
      message.warning("Không có thay đổi nào");
      return;
    }
    setBankPasswordModal(true);
  };

  const handleAvatarChange = (info: UploadChangeParam) => {
    const file = info.file.originFileObj || info.file;

    if (!file || !(file instanceof File)) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      message.error("Vui lòng chọn định dạng ảnh hợp lệ");
      return;
    }

    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = objectUrl;

    setAvatarFile(file);
    setAvatarPreview(objectUrl);
    setHasAvatarChange(true);
  };

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

  const handleSaveAddress = async (values: any) => {
    try {
      const token = getAuthToken();

      if (editAddress) {
        const res = await axios.put(
          `/api/profile/address/${editAddress.id}`,
          values,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        message.success("Cập nhật địa chỉ thành công");

        setAddresses((prev) =>
          prev.map((addr) =>
            addr.id === editAddress.id
              ? res.data.address || { ...addr, ...values }
              : addr
          )
        );
      } else {
        const res = await axios.post("/api/profile/address", values, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success("Thêm địa chỉ thành công");

        if (res.data.address) {
          setAddresses((prev) => [...prev, res.data.address]);
        }
      }

      setAddressModal(false);
      setEditAddress(null);
      addressForm.resetFields();
    } catch {
      message.error("Không thể lưu địa chỉ");
    }
  };

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

      setAddresses((prev) =>
        prev.map((addr) => ({
          ...addr,
          is_default: addr.id === addressId,
        }))
      );
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

      setAddresses((prev) => prev.filter((addr) => addr.id !== addressId));
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

  const hasAnyChanges = hasChanges || hasAvatarChange;

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

            <Tabs
              defaultActiveKey="1"
              items={[
                {
                  key: "1",
                  label: "Thông tin chung",
                  children: (
                    <Form
                      form={form}
                      layout="vertical"
                      onFinish={handleUpdateProfile}
                      className="flex flex-col gap-4"
                      onValuesChange={checkFormChanges}
                    >
                      <Form.Item
                        label={
                          <div className="flex justify-between items-center">
                            <span className="mr-3">Họ và tên</span>
                            <EditOutlined
                              onClick={() =>
                                setEditing((prev) => ({
                                  ...prev,
                                  name: !prev.name,
                                }))
                              }
                              className="cursor-pointer text-gray-500 hover:text-blue-500"
                            />
                          </div>
                        }
                        name="name"
                        rules={[
                          { required: true, message: "Vui lòng nhập họ tên" },
                        ]}
                      >
                        <Input
                          placeholder="Nhập họ và tên"
                          disabled={!editing.name}
                        />
                      </Form.Item>

                      <Form.Item label="Email" name="email">
                        <Input disabled />
                      </Form.Item>

                      <Form.Item
                        label={
                          <div className="flex justify-between items-center">
                            <span className="mr-3">Số điện thoại</span>
                            <EditOutlined
                              onClick={() =>
                                setEditing((prev) => ({
                                  ...prev,
                                  phone: !prev.phone,
                                }))
                              }
                              className="cursor-pointer text-gray-500 hover:text-blue-500"
                            />
                          </div>
                        }
                        name="phone"
                        rules={[
                          { required: true, message: "Nhập số điện thoại" },
                          {
                            pattern: /^\d{10}$/,
                            message: "Số điện thoại phải gồm 10 chữ số",
                          },
                        ]}
                      >
                        <Input
                          placeholder="Nhập số điện thoại"
                          disabled={!editing.phone}
                        />
                      </Form.Item>

                      <div className="flex flex-col md:flex-row gap-3 mt-2">
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          htmlType="submit"
                          className="flex-1"
                          loading={saving}
                          disabled={!hasAnyChanges}
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
                  ),
                },
                {
                  key: "2",
                  label: (
                    <span>
                      <BankOutlined /> Ngân hàng
                    </span>
                  ),
                  children: (
                    <Form
                      form={bankForm}
                      layout="vertical"
                      className="flex flex-col gap-4"
                      onValuesChange={checkBankChanges}
                    >
                      <Form.Item
                        label={
                          <div className="flex justify-between items-center">
                            <span className="mr-3">Số tài khoản</span>
                            <EditOutlined
                              onClick={() =>
                                setEditing((prev) => ({
                                  ...prev,
                                  bank: !prev.bank,
                                }))
                              }
                              className="cursor-pointer text-gray-500 hover:text-blue-500"
                            />
                          </div>
                        }
                        name="bank_account_number"
                      >
                        <Input
                          placeholder="Nhập số tài khoản"
                          disabled={!editing.bank}
                        />
                      </Form.Item>

                      <Form.Item label="Tên ngân hàng" name="bank_name">
                        <Input
                          placeholder="Nhập tên ngân hàng"
                          disabled={!editing.bank}
                        />
                      </Form.Item>

                      <Form.Item
                        label="Tên chủ tài khoản"
                        name="bank_account_name"
                      >
                        <Input
                          placeholder="Nhập tên chủ tài khoản"
                          disabled={!editing.bank}
                        />
                      </Form.Item>

                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleBankFormSubmit}
                        className="w-full"
                        loading={saving}
                        disabled={!hasBankChanges}
                      >
                        Lưu thông tin ngân hàng
                      </Button>
                    </Form>
                  ),
                },
              ]}
            />
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
              <p className="italic text-gray-600 mt-2">
                Ghi chú: {addr.notes}
              </p>
            )}
          </Card>
        ))}
      </Card>

      {/* Modal đổi mật khẩu */}
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
    {/* ⭐ Chỉ hiện trường này nếu user có password */}
    {hasPassword && (
      <Form.Item
        label="Mật khẩu hiện tại"
        name="current_password"
        rules={[{ required: true, message: "Nhập mật khẩu hiện tại" }]}
      >
        <Input.Password />
      </Form.Item>
    )}

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

    <Button
      type="primary"
      htmlType="submit"
      block
      icon={<EditOutlined />}
    >
      {hasPassword ? "Cập nhật mật khẩu" : "Tạo mật khẩu"}
    </Button>
  </Form>
</Modal>

      {/* Modal xác nhận mật khẩu khi cập nhật ngân hàng */}
      <Modal
        open={bankPasswordModal}
        title="Xác nhận mật khẩu"
        onCancel={() => setBankPasswordModal(false)}
        footer={null}
      >
        <p className="mb-4 text-gray-600">
          Vui lòng nhập mật khẩu để xác nhận thay đổi thông tin ngân hàng
        </p>
        <Form layout="vertical" onFinish={handleUpdateBankInfo}>
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
          >
            <Input.Password placeholder="Nhập mật khẩu của bạn" />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={saving}
            icon={<LockOutlined />}
          >
            Xác nhận
          </Button>
        </Form>
      </Modal>

      {/* Modal địa chỉ */}
      <Modal
        open={addressModal}
        title={editAddress ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}
        onCancel={() => {
          setAddressModal(false);
          setEditAddress(null);
        }}
        footer={null}
      >
        <Form
          form={addressForm}
          layout="vertical"
          onFinish={handleSaveAddress}
        >
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
            <Input.TextArea
              rows={2}
              placeholder="Ghi chú giao hàng (nếu có)"
            />
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