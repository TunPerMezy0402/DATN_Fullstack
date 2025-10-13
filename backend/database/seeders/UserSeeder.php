<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Tạo admin user
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'status' => 0,
            'phone' => '0123456789',
            'address' => '123 Admin Street'
        ]);

        // Tạo user thường
        User::create([
            'name' => 'Test User',
            'email' => 'user@example.com',
            'password' => Hash::make('password'),
            'role' => 'user',
            'status' => 0,
            'phone' => '0987654321',
            'address' => '456 User Avenue'
        ]);

        // Tạo user bị tạm ngưng
        User::create([
            'name' => 'Suspended User',
            'email' => 'suspended@example.com',
            'password' => Hash::make('password'),
            'role' => 'user',
            'status' => 1,
            'phone' => '0555555555',
            'address' => '789 Suspended Road'
        ]);
    }
}

