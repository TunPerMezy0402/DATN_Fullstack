<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Banner;
use App\Models\BannerImage;

class BannerTestDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Tạo banner test
        $banner1 = Banner::create([
            'title' => 'Banner Chính - Giảm giá 50%',
            'is_active' => true
        ]);

        $banner2 = Banner::create([
            'title' => 'Banner Phụ - Sản phẩm mới',
            'is_active' => false
        ]);

        $banner3 = Banner::create([
            'title' => 'Banner Khuyến mãi - Tặng quà',
            'is_active' => false
        ]);

        // Tạo banner images mẫu (nếu có model BannerImage)
        if (class_exists('App\Models\BannerImage')) {
            BannerImage::create([
                'banner_id' => $banner1->id,
                'image_url' => '/images/banner1.jpg',
                'is_active' => true,
                'sort_order' => 1
            ]);

            BannerImage::create([
                'banner_id' => $banner1->id,
                'image_url' => '/images/banner1-2.jpg',
                'is_active' => true,
                'sort_order' => 2
            ]);

            BannerImage::create([
                'banner_id' => $banner2->id,
                'image_url' => '/images/banner2.jpg',
                'is_active' => true,
                'sort_order' => 1
            ]);
        }

        $this->command->info('Banner test data created successfully!');
        $this->command->info('Banner 1 (Active): ' . $banner1->title);
        $this->command->info('Banner 2 (Inactive): ' . $banner2->title);
        $this->command->info('Banner 3 (Inactive): ' . $banner3->title);
    }
}
