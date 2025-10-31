<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Models\AddressBook;
use Illuminate\Support\Facades\Storage;

class UserProfileController extends Controller
{

    private const PUBLIC_DIR = 'img/avatar';

    public function show(Request $request)
    {
        $user = $request->user()->load('addresses');

        $imagePath = $user->image;
        if ($imagePath) {
            if (\Illuminate\Support\Str::startsWith($imagePath, ['http://', 'https://'])) {
                $imageUrl = $imagePath;
            } elseif (\Illuminate\Support\Str::startsWith($imagePath, 'storage/')) {
                $imageUrl = asset($imagePath);
            } else {
                $imageUrl = asset(Storage::url($imagePath));
            }
        } else {
            $imageUrl = null;
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'image' => $imageUrl,
            ],
            'addresses' => $user->addresses,
        ]);
    }

    /**
     * ✏️ Cập nhật thông tin cá nhân
     */
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
        ]);

        if ($request->hasFile('avatar')) {
            if ($user->image && file_exists(public_path($user->image))) {
                unlink(public_path($user->image));
            }
            $filename = time() . '_' . uniqid() . '.' . $request->file('avatar')->getClientOriginalExtension();
            $destination = public_path('storage/img/avatar');
            if (!file_exists($destination)) {
                mkdir($destination, 0755, true);
            }
            $request->file('avatar')->move($destination, $filename);
            $data['image'] = 'storage/img/avatar/' . $filename;
        }

        unset($data['avatar']);

        $user->update($data);


        // ✅ Cập nhật địa chỉ mặc định
        if (!empty($data['default_address_id'])) {
            AddressBook::where('user_id', $user->id)->update(['is_default' => false]);
            AddressBook::where('id', $data['default_address_id'])
                ->where('user_id', $user->id)
                ->update(['is_default' => true]);
        }

        $user->load('addresses');

        $imagePath = $user->image;
        if ($imagePath) {
            if (\Illuminate\Support\Str::startsWith($imagePath, ['http://', 'https://'])) {
                $imageUrl = $imagePath;
            } elseif (\Illuminate\Support\Str::startsWith($imagePath, 'storage/')) {
                $imageUrl = asset($imagePath);
            } else {
                $imageUrl = asset(Storage::url($imagePath));
            }
        } else {
            $imageUrl = null;
        }

        return response()->json([
            'message' => 'Cập nhật thông tin cá nhân thành công',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'image' => $imageUrl,
            ],
            'addresses' => $user->addresses,
        ]);
    }

    /**
     * ➕ Thêm địa chỉ mới
     */
    public function addAddress(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'recipient_name' => 'required|string|max:255',
            // Phone: exactly 10 digits
            'phone' => ['required', 'regex:/^\\d{10}$/'],
            'city' => 'required|string|max:100',
            'district' => 'required|string|max:100',
            'commune' => 'required|string|max:100',
            'village' => 'required|string|max:100',
            'notes' => 'nullable|string|max:255',
            'is_default' => 'boolean',
        ]);

        $data['user_id'] = $user->id;

        // Nếu chọn địa chỉ mặc định → reset các địa chỉ khác
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
     * ✏️ Cập nhật địa chỉ
     */
    public function updateAddress(Request $request, $id)
    {
        $user = $request->user();

        $address = AddressBook::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $data = $request->validate([
            'recipient_name' => 'required|string|max:255',
            // Phone: exactly 10 digits
            'phone' => ['required', 'regex:/^\\d{10}$/'],
            'city' => 'required|string|max:100',
            'district' => 'required|string|max:100',
            'commune' => 'required|string|max:100',
            'village' => 'required|string|max:100',
            'notes' => 'nullable|string|max:255',
            'is_default' => 'boolean',
        ]);

        // Nếu set default → reset các địa chỉ khác
        if (!empty($data['is_default'])) {
            AddressBook::where('user_id', $user->id)->update(['is_default' => false]);
        }

        $address->update($data);

        return response()->json([
            'message' => 'Cập nhật địa chỉ thành công',
            'address' => $address,
        ]);
    }

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

    /**
     * 🔐 Đổi mật khẩu
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        if (!Hash::check($data['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Mật khẩu hiện tại không chính xác'
            ], 422);
        }

        $user->update([
            'password' => Hash::make($data['new_password']),
        ]);

        return response()->json(['message' => 'Đổi mật khẩu thành công']);
    }
}
