<?php
namespace App\Http\Controllers\Api\admin;

use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    // Hiển thị danh sách người dùng (có phân trang + search)
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->has('search') && $request->search != '') {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%')
                  ->orWhere('phone', 'like', '%' . $request->search . '%');
            });
        }

        $users = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($users); // Trả về JSON
    }

    // Lưu người dùng mới
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:user,admin',
            'phone' => 'required|string|max:15|unique:users,phone',
        ]);

        $user = new User();
        $user->name = $validated['name'];
        $user->address = $validated['address'];
        $user->email = $validated['email'];
        $user->password = bcrypt($validated['password']); // Mã hóa mật khẩu
        $user->role = $validated['role'];
        $user->phone = $validated['phone'];
        $user->save();

        return response()->json([
            'message' => 'Người dùng mới đã được thêm!',
            'user' => $user
        ], 201); // 201 = Created
    }

    // Hiển thị chi tiết người dùng
    public function show($id)
    {
        $user = User::findOrFail($id);
        return response()->json($user);
    }

    // Cập nhật người dùng (chỉ status trong ví dụ này)
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|boolean',
        ]);

        $user->status = $validated['status'];
        $user->save();

        return response()->json([
            'message' => 'Cập nhật người dùng thành công!',
            'user' => $user
        ]);
    }

    // Xóa người dùng
    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json([
            'message' => 'Đã xóa người dùng thành công'
        ]);
    }

    // Danh sách người dùng đã xóa (thùng rác)
    public function trash()
    {
        $users = User::onlyTrashed()->paginate(15);
        return response()->json($users);
    }

    // Khôi phục người dùng đã xóa
    public function restore($id)
    {
        $user = User::onlyTrashed()->findOrFail($id);
        $user->restore();

        return response()->json([
            'message' => 'Người dùng đã được khôi phục',
            'user' => $user
        ]);
    }

    // Xóa vĩnh viễn người dùng
    public function forceDelete($id)
    {
        $user = User::onlyTrashed()->findOrFail($id);
        $user->forceDelete();

        return response()->json([
            'message' => 'Người dùng đã bị xóa vĩnh viễn'
        ]);
    }
}
