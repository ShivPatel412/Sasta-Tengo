<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Education extends Model
{
    protected $fillable = [
        'degree',
        'institution',
        'field_of_study',
        'start_year',
        'end_year',
        'is_current',
        'description',
        'gpa',
        'order'
    ];

    protected $casts = [
        'is_current' => 'boolean',
        'gpa' => 'decimal:2',
    ];
}
