<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Notifications\ProjectRequestSubmitted;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;

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

    public function storeProjectRequest(Request $request)
    {
        $validated = $request->validate([
            'service' => 'required|string|max:255',
            'addSomethingElse' => 'boolean',
            'otherService' => 'nullable|string|max:1000',
            'projectType' => 'required|string|max:255',
            'description' => 'required|string|max:5000',
            'existingUrl' => 'nullable|url|max:2048',
            'inspirationUrls' => 'nullable|string|max:5000',
            'features' => 'array|max:30',
            'features.*' => 'string|max:255',
            'assets' => 'array|max:30',
            'assets.*' => 'string|max:255',
            'requirementsNotes' => 'nullable|string|max:5000',
            'budget' => 'required|string|max:255',
            'timeline' => 'required|string|max:255',
            'fullName' => 'required|string|max:255',
            'company' => 'nullable|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20',
            'country' => 'required|string|max:255',
            'additionalMessage' => 'nullable|string|max:5000',
            'confirmed' => 'accepted',
        ]);

        $appointment = Appointment::create([
            'client_name' => $validated['fullName'],
            'client_email' => $validated['email'],
            'client_phone' => $validated['phone'],
            'notes' => $validated['description'],
            'request_data' => $validated,
        ]);

        rescue(fn () => Notification::route('mail', $appointment->client_email)->notify(new ProjectRequestSubmitted($appointment)), report: true);
        rescue(fn () => Notification::route('mail', config('mail.lead_recipient'))->notify(new ProjectRequestSubmitted($appointment, true)), report: true);

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
