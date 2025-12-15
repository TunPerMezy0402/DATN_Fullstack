<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('123456'),
            'email_verified_at' => now()
        ]);
        
        echo "Admin user created successfully!\n";
        echo "Email: admin@test.com\n";
        echo "Password: 123456\n";
    }
}