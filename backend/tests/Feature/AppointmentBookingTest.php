<?php

namespace Tests\Feature;

use App\Models\Service;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppointmentBookingTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_time_slot_cannot_be_booked_twice(): void
    {
        $service = Service::create([
            'title' => 'Consultation',
            'description' => 'Test service',
            'price' => 500,
            'duration' => 60,
        ]);
        $booking = [
            'service_id' => $service->id,
            'client_name' => 'Test User',
            'client_email' => 'test@example.com',
            'client_phone' => '1234567890',
            'appointment_date' => now()->addDay()->format('Y-m-d H:i:s'),
        ];

        $this->postJson('/api/v1/appointments', $booking)->assertCreated();
        $this->postJson('/api/v1/appointments', $booking)->assertStatus(422);
    }
}
