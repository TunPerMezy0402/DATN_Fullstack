<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Models\AddressBook;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UserProfileController extends Controller
{
    private const AVATAR_DIR = 'storage/img/avatar';


    public function show(Request $request)
    {
        $user = $request->user()->load('addresses');

        // Xử lý URL ảnh avatar
        $imageUrl = $user->image
            ? (Str::startsWith($user->image, ['http://', 'https://'])
                ? $user->image
                : asset($user->image))
            : null;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'image' => $imageUrl,
                'role' => $user->role,

                // ⭐ Thêm 3 trường ngân hàng
                'bank_account_number' => $user->bank_account_number,
                'bank_name' => $user->bank_name,
                'bank_account_name' => $user->bank_account_name,

                // ⭐ Thêm trường kiểm tra password
                'has_password' => !empty($user->password),
            ],
            'addresses' => $user->addresses,
        ]);
    }


    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => [
                'nullable',
                'email',
                Rule::unique('users')->ignore($user->id),
            ],
            'phone' => ['nullable', 'regex:/^\d{10}$/'],
            'default_address_id' => 'nullable|exists:address_book,id',
            'avatar' => 'nullable|image|max:5120',

            // ⭐ Validate 3 trường ngân hàng
            'bank_account_number' => 'nullable|string|max:50',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_name' => 'nullable|string|max:255',

            // ⭐ Password để xác thực cập nhật ngân hàng
            'password' => 'nullable|string',
        ]);

        // ⭐ Kiểm tra nếu có cập nhật thông tin ngân hàng
        $hasBankData = isset($data['bank_account_number']) ||
            isset($data['bank_name']) ||
            isset($data['bank_account_name']);

        if ($hasBankData) {
            // ⭐ Nếu password = null hoặc empty
            if (empty($data['password'])) {
                return response()->json([
                    'message' => 'Vui lòng nhập mật khẩu để xác nhận cập nhật thông tin ngân hàng',
                    'errors' => [
                        'password' => ['Mật khẩu là bắt buộc khi cập nhật thông tin ngân hàng']
                    ]
                ], 422);
            }

            if (!Hash::check($data['password'], $user->password)) {
                return response()->json([
                    'message' => 'Mật khẩu không chính xác',
                    'errors' => [
                        'password' => ['Mật khẩu bạn nhập không đúng']
                    ]
                ], 422);
            }
        }

        unset($data['password']);

        // 🖼 Upload avatar
        if ($request->hasFile('avatar')) {

            // Xóa avatar cũ
            if ($user->image && file_exists(public_path($user->image))) {
                unlink(public_path($user->image));
            }

            $filename = time() . '_' . uniqid() . '.' .
                $request->file('avatar')->getClientOriginalExtension();

            $destination = public_path(self::AVATAR_DIR);
            if (!file_exists($destination)) {
                mkdir($destination, 0755, true);
            }

            $request->file('avatar')->move($destination, $filename);
            $data['image'] = self::AVATAR_DIR . '/' . $filename;
        }
        unset($data['avatar']);

        // Cập nhật user
        $user->update($data);

        // ✳ Cập nhật địa chỉ mặc định
        if (!empty($data['default_address_id'])) {
            AddressBook::where('user_id', $user->id)->update(['is_default' => false]);
            AddressBook::where('id', $data['default_address_id'])
                ->where('user_id', $user->id)
                ->update(['is_default' => true]);
        }

        // Tải lại dữ liệu
        $user->load('addresses');

        // Tạo URL ảnh avatar
        $imageUrl = $user->image
            ? (Str::startsWith($user->image, ['http://', 'https://'])
                ? $user->image
                : asset($user->image))
            : null;

        return response()->json([
            'message' => 'Cập nhật thông tin cá nhân thành công',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'image' => $imageUrl,

                // ⭐ Thêm vào response
                'bank_account_number' => $user->bank_account_number,
                'bank_name' => $user->bank_name,
                'bank_account_name' => $user->bank_account_name,
            ],
            'addresses' => $user->addresses,
        ]);
    }

    /**
     * -----------------------------------------
     * ➕ Thêm địa chỉ mới
     * -----------------------------------------
     */
    public function addAddress(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'recipient_name' => 'required|string|max:255',
            'phone' => ['required', 'regex:/^\d{10}$/'],
            'city' => 'required|string|max:100',
            'district' => 'required|string|max:100',
            'commune' => 'required|string|max:100',
            'village' => 'required|string|max:100',
            'notes' => 'nullable|string|max:255',
            'is_default' => 'boolean',
        ]);

        $data['user_id'] = $user->id;

        if (!empty($data['is_default'])) {
            AddressBook::where('user_id', $user->id)->update(['is_default' => false]);
        }

        $address = AddressBook::create($data);

        return response()->json([
            'message' => 'Thêm địa chỉ mới thành công',
            'address' => $address,
        ]);
    }

    /**
     * -----------------------------------------
     * ✏️ Cập nhật địa chỉ
     * -----------------------------------------
     */
    public function updateAddress(Request $request, $id)
    {
        $user = $request->user();

        $address = AddressBook::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $data = $request->validate([
            'recipient_name' => 'required|string|max:255',
            'phone' => ['required', 'regex:/^\d{10}$/'],
            'city' => 'required|string|max:100',
            'district' => 'required|string|max:100',
            'commune' => 'required|string|max:100',
            'village' => 'required|string|max:100',
            'notes' => 'nullable|string|max:255',
            'is_default' => 'boolean',
        ]);

        if (!empty($data['is_default'])) {
            AddressBook::where('user_id', $user->id)->update(['is_default' => false]);
        }

        $address->update($data);

        return response()->json([
            'message' => 'Cập nhật địa chỉ thành công',
            'address' => $address,
        ]);
    }

    /**
     * -----------------------------------------
     * 🗑 Xóa địa chỉ
     * -----------------------------------------
     */
    public function deleteAddress($id, Request $request)
    {
        $user = $request->user();

        $address = AddressBook::where('id', $id)
            ->where('user_id', $user->id)
            ->first();

        if (!$address) {
            return response()->json(['message' => 'Không tìm thấy địa chỉ'], 404);
        }

        $address->delete();

        return response()->json(['message' => 'Xóa địa chỉ thành công']);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();

        // ⭐ Kiểm tra user có password hay chưa
        $hasPassword = !empty($user->password);

        $data = $request->validate([
            'current_password' => $hasPassword ? 'required|string' : 'nullable',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        // ⭐ Chỉ check current_password nếu user đã có password
        if ($hasPassword) {
            if (!Hash::check($data['current_password'], $user->password)) {
                return response()->json([
                    'message' => 'Mật khẩu hiện tại không chính xác'
                ], 422);
            }
        }

        $user->update([
            'password' => Hash::make($data['new_password']),
        ]);

        return response()->json([
            'message' => $hasPassword ? 'Đổi mật khẩu thành công' : 'Tạo mật khẩu thành công'
        ]);
    }
}