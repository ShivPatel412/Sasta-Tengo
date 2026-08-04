<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function getStats()
    {
        $appointmentStats = Appointment::select('status', DB::raw('count(*) as count'))->groupBy('status')->pluck('count', 'status');

        return response()->json([
            'total_appointments' => Appointment::count(),
            'pending_appointments' => Appointment::where('status', 'pending')->count(),
            'upcoming_appointments' => Appointment::where('appointment_date', '>=', now())->whereIn('status', ['pending', 'confirmed'])->count(),
            'unread_contacts' => Contact::where('is_read', false)->count(),
            'appointment_stats' => [
                'pending' => $appointmentStats['pending'] ?? 0,
                'confirmed' => $appointmentStats['confirmed'] ?? 0,
                'completed' => $appointmentStats['completed'] ?? 0,
                'cancelled' => $appointmentStats['cancelled'] ?? 0,
            ],
        ]);
    }

    public function getRecentAppointments(Request $request)
    {
        return response()->json(Appointment::with('service')->latest()->limit($request->input('limit', 10))->get());
    }

    public function getRecentContacts(Request $request)
    {
        return response()->json(Contact::latest()->limit($request->input('limit', 10))->get());
    }
}
