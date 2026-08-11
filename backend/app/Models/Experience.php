<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Experience extends Model
{
    protected $table = 'experience';

    protected $fillable = [
        'title',
        'company',
        'logo',
        'website',
        'location',
        'start_date',
        'end_date',
        'is_current',
        'description',
        'summary',
        'highlights',
        'technologies',
        'order'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_current' => 'boolean',
        'technologies' => 'array',
        'highlights' => 'array',
    ];
}
