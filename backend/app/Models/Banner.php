<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Banner extends Model
{
	use SoftDeletes;

	protected $fillable = ['title', 'is_active'];
	protected $casts = ['is_active' => 'boolean'];

	public function images()
	{
		return $this->hasMany(BannerImage::class);
	}

	public function scopeActive($query)
	{
		return $query->where('is_active', true);
	}
}
