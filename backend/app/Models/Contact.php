<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Contact extends Model
{
    protected $fillable = [
        'name',
        'email',
        'phone',
        'subject',
        'message',
        'is_read',
        'lead_status',
        'admin_notes'
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];
}
