<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    protected $fillable = [
        'service_id',
        'client_name',
        'client_email',
        'client_phone',
        'appointment_date',
        'notes',
        'status'
    ];

    protected $casts = [
        'appointment_date' => 'datetime',
    ];

    public function service()
    {
        return $this->belongsTo(Service::class);
    }

}
