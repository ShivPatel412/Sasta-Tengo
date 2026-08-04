<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = [
        'title',
        'description',
        'image',
        'poster',
        'gallery',
        'technologies',
        'github_url',
        'live_url',
        'category',
        'is_featured',
        'order'
    ];

    protected $casts = [
        'technologies' => 'array',
        'gallery' => 'array',
        'is_featured' => 'boolean',
    ];

    protected $appends = ['poster_url', 'gallery_urls'];

    public function getPosterUrlAttribute(): ?string
    {
        return $this->poster ? asset('storage/'.$this->poster) : null;
    }

    public function getGalleryUrlsAttribute(): array
    {
        return array_map(fn ($image) => asset('storage/'.$image), $this->gallery ?? []);
    }
}
