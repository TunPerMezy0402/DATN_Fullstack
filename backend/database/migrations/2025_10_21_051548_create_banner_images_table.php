<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
      // create_banner_images_table
    Schema::create('banner_images', function (Blueprint $table) {
	$table->id();
	$table->foreignId('banner_id')->constrained('banners')->cascadeOnDelete();
	$table->string('image', 255);
	$table->boolean('is_active')->default(true);
	$table->timestamps();
	$table->softDeletes();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('banner_images');
    }
};
