<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BannerImage extends Model
{
	use SoftDeletes;

	protected $fillable = ['banner_id', 'image', 'is_active'];
	protected $casts = ['is_active' => 'boolean'];

	public function banner()
	{
		return $this->belongsTo(Banner::class);
	}
}
