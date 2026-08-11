<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Service;
use App\Models\User;
use App\Notifications\ProjectRequestSubmitted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
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

    public function test_admin_can_manage_project_request_status(): void
    {
        $service = Service::create(['title' => 'Website', 'description' => 'Website service', 'price' => 500, 'duration' => 60]);
        $appointment = Appointment::create([
            'service_id' => $service->id,
            'client_name' => 'Qualified Client',
            'client_email' => 'client@example.com',
            'client_phone' => '1234567890',
            'appointment_date' => now()->addDay(),
        ]);

        $this->actingAs(User::factory()->create())
            ->put("/dashboard/appointments/{$appointment->id}", [
                'status' => 'confirmed',
                'admin_notes' => 'Send proposal.',
            ])->assertRedirect();

        $this->assertDatabaseHas('appointments', ['id' => $appointment->id, 'status' => 'confirmed', 'admin_notes' => 'Send proposal.']);
        $this->actingAs(User::factory()->create())->get('/dashboard/appointments?status=confirmed')
            ->assertSee('Qualified Client')->assertDontSee('CRM stage')->assertSee('Status')->assertSee('Action');
    }

    public function test_project_inquiry_is_saved_as_a_project_request(): void
    {
        Notification::fake();
        $payload = [
            'service' => 'Website Design',
            'addSomethingElse' => false,
            'otherService' => '',
            'projectType' => 'Business website',
            'description' => 'Build a conversion-focused website.',
            'existingUrl' => 'https://example.com',
            'inspirationUrls' => 'https://stripe.com',
            'features' => ['Contact form', 'CMS'],
            'assets' => ['Logo'],
            'requirementsNotes' => 'Accessible and fast.',
            'budget' => '$2,000–$5,000',
            'timeline' => '1–2 months',
            'fullName' => 'Project Client',
            'company' => 'Example Ltd',
            'email' => 'project@example.com',
            'phone' => '1234567890',
            'country' => 'India',
            'additionalMessage' => 'Please email first.',
            'confirmed' => true,
        ];

        $this->postJson('/api/v1/project-requests', $payload)->assertCreated();

        $request = Appointment::where('client_email', 'project@example.com')->firstOrFail();
        $this->assertNull($request->service_id);
        $this->assertSame('Business website', $request->request_data['projectType']);
        Notification::assertSentOnDemandTimes(ProjectRequestSubmitted::class, 2);

        $this->actingAs(User::factory()->create())
            ->get("/dashboard/appointments/{$request->id}")
            ->assertOk()
            ->assertSee('Website Design')
            ->assertSee('Business website')
            ->assertSee('Example Ltd')
            ->assertSee('Contact form, CMS');
    }
}
