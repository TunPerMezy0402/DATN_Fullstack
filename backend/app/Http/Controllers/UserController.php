<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    // Hiển thị danh sách người dùng
    public function index(Request $request)
{
    $query = User::query();

    // Kiểm tra nếu có từ khóa tìm kiếm trong request
    if ($request->has('search') && $request->search != '') {
        $query->where(function($q) use ($request) {
            $q->where('name', 'like', '%' . $request->search . '%')
              ->orWhere('email', 'like', '%' . $request->search . '%')
              /* ->orWhere('role', 'like', '%' . $request->search . '%') */
              ->orWhere('phone', 'like', '%' . $request->search . '%');
        });
    }

    // Lấy danh sách người dùng với phân trang
    $users = $query->orderBy('created_at', 'desc')->paginate(15);

    return view('admin.users.index', compact('users'));
}

    


    // Form tạo người dùng mới
    public function create()
    {
        return view('admin.users.create');
    }

    // Lưu người dùng mới
    public function store(Request $request)
{
    // Validate dữ liệu từ form
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'address' => 'required|string|max:255',
        'email' => 'required|email|unique:users,email',
        'password' => 'required|string|min:8',
        'role' => 'required|in:user,admin',
        'phone' => 'required|string|max:15|unique:users,phone',  // Thêm validation cho trường phone
    ], [
        'name.required' => 'Tên người dùng là bắt buộc.',
        'name.max' => 'Tên người dùng không được vượt quá 255 ký tự.',
        'email.required' => 'Email là bắt buộc.',
        'email.email' => 'Email phải là một địa chỉ email hợp lệ.',
        'email.unique' => 'Email đã tồn tại trong hệ thống.',
        'password.required' => 'Mật khẩu là bắt buộc.',
        'password.min' => 'Mật khẩu phải có ít nhất 8 ký tự.',
        'role.required' => 'Vai trò là bắt buộc.',
        'role.in' => 'Vai trò phải là "user" hoặc "admin".',
        'phone.required' => 'Số điện thoại là bắt buộc.',
        'phone.max' => 'Số điện thoại không được vượt quá 15 ký tự.',
        'phone.unique' => 'Số điện thoại đã được sử dụng.',
        'address.required' => 'Địa chỉ không được để trống.',
    ]);

    // Tạo người dùng mới
    $user = new User();
    $user->name = $validated['name'];
    $user->address = $validated['address'];
    $user->email = $validated['email'];
    $user->password = $validated['password']; // Mã hóa mật khẩu
    $user->role = $validated['role'];
    $user->phone = $validated['phone'];  // Thêm trường phone
    $user->save();

    // Trả về thông báo thành công
    return redirect()->route('admin.users.index')->with('success', 'Người dùng mới đã được thêm!');
}


    // Hiển thị chi tiết người dùng
    public function show($id)
    {
        $user = User::findOrFail($id);
        return view('admin.users.show', compact('user'));
    }

    // Form sửa người dùng
    public function edit($id)
    {
        $user = User::findOrFail($id);
        return view('admin.users.edit', compact('user'));
    }

    // Cập nhật người dùng
    public function update(Request $request, $id)
    {
        // Lấy người dùng cần cập nhật
        $user = User::findOrFail($id);
    
        // Validate dữ liệu từ form
        $validated = $request->validate([
            /* 'name' => 'required|string|max:255',
            'password' => 'nullable|string|min:8', // Mật khẩu có thể rỗng
            'phone' => 'required|string|max:15|unique:users,phone,' . $user->id,
            'role' => 'required|in:user,admin', */
            'status' => 'required|boolean', // ✅ Thêm dòng này
        ], [
            /* 'name.required' => 'Tên người dùng là bắt buộc.',
            'name.max' => 'Tên người dùng không được vượt quá 255 ký tự.',
            'password.required' => 'Mật khẩu là bắt buộc.',
            'password.min' => 'Mật khẩu phải có ít nhất 8 ký tự.',
            'phone.required' => 'Số điện thoại là bắt buộc.',
            'phone.max' => 'Số điện thoại không được vượt quá 15 ký tự.',
            'phone.unique' => 'Số điện thoại đã được sử dụng.',
            'role.required' => 'Vai trò là bắt buộc.',
            'role.in' => 'Vai trò phải là "user" hoặc "admin".', */
            'status.required' => 'Trạng thái tài khoản là bắt buộc.', // ✅
            'status.boolean' => 'Trạng thái tài khoản phải là 0 hoặc 1.', // ✅
        ]);
    
        // Cập nhật thông tin người dùng
        /* $user->name = $validated['name'];
    
        if ($request->has('password') && $request->password) {
            $user->password = bcrypt($validated['password']); // Mã hóa mật khẩu
        }
       $user->phone = $validated['phone'];
    
        $user->role = $validated['role']; */
        $user->status = $validated['status']; // ✅ Cập nhật status
    
        $user->save();
    
        return redirect()->route('admin.users.show', $user->id)->with('success', 'Cập nhật người dùng thành công !');
    }
    


    // Xóa người dùng
    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return redirect()->route('admin.users.index')->with('success', 'Đã xóa người dùng thành công');
    }
}
