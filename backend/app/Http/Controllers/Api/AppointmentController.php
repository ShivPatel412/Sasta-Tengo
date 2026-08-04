<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $appointments = Appointment::with('service')
            ->orderBy('appointment_date', 'desc')
            ->get();
        
        return response()->json($appointments);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'service_id' => 'required|exists:services,id',
            'client_name' => 'required|string|max:255',
            'client_email' => 'required|email',
            'client_phone' => 'required|string|max:20',
            'appointment_date' => 'required|date|after:now',
            'notes' => 'nullable|string',
            'status' => 'prohibited'
        ]);

        $alreadyBooked = Appointment::where('appointment_date', $validated['appointment_date'])
            ->whereIn('status', ['pending', 'confirmed'])
            ->exists();

        if ($alreadyBooked) {
            return response()->json(['message' => 'This time slot is no longer available.'], 422);
        }

        $appointment = Appointment::create($validated);
        $appointment->load('service');
        
        return response()->json($appointment, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Appointment $appointment)
    {
        $appointment->load('service');
        return response()->json($appointment);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Appointment $appointment)
    {
        $validated = $request->validate([
            'service_id' => 'exists:services,id',
            'client_name' => 'string|max:255',
            'client_email' => 'email',
            'client_phone' => 'string|max:20',
            'appointment_date' => 'date',
            'notes' => 'nullable|string',
            'status' => 'in:pending,confirmed,completed,cancelled'
        ]);

        $appointment->update($validated);
        $appointment->load('service');
        
        return response()->json($appointment);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Appointment $appointment)
    {
        $appointment->delete();
        return response()->json(['message' => 'Appointment deleted successfully'], 200);
    }

    /**
     * Get upcoming appointments.
     */
    public function upcoming()
    {
        $appointments = Appointment::with('service')
            ->where('appointment_date', '>=', now())
            ->whereIn('status', ['pending', 'confirmed'])
            ->orderBy('appointment_date', 'asc')
            ->get();
        
        return response()->json($appointments);
    }

    /**
     * Update appointment status.
     */
    public function updateStatus(Request $request, Appointment $appointment)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,confirmed,completed,cancelled'
        ]);

        $appointment->update($validated);
        $appointment->load('service');
        
        return response()->json($appointment);
    }
}
