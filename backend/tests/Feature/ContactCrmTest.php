<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\User;
use App\Notifications\LeadSubmitted;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ContactCrmTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--force' => true]);
    }

    public function test_admin_can_filter_and_update_contact_messages(): void
    {
        $admin = User::factory()->create();
        $unread = Contact::create(['name' => 'Unread Lead', 'email' => 'new@example.com', 'subject' => 'New', 'message' => 'Hello', 'is_read' => false]);
        Contact::create(['name' => 'Read Lead', 'email' => 'read@example.com', 'subject' => 'Old', 'message' => 'Hello', 'is_read' => true]);

        $this->actingAs($admin)->get('/dashboard/contacts?filter=unread')->assertSee('Unread Lead')->assertDontSee('Read Lead');
        $this->actingAs($admin)->put("/dashboard/contacts/{$unread->id}", ['admin_notes' => 'Call tomorrow', 'is_read' => 1])->assertRedirect();

        $this->assertDatabaseHas('contacts', ['id' => $unread->id, 'admin_notes' => 'Call tomorrow', 'is_read' => true]);
        $this->actingAs($admin)->get('/dashboard/contacts')
            ->assertSee('Unread Lead')->assertSee('Read Lead')->assertDontSee('CRM stage')->assertSee('Status')->assertSee('Action');
    }

    public function test_new_lead_emails_the_user_and_admin(): void
    {
        Notification::fake();
        config(['mail.lead_recipient' => 'info@shivpatel.in']);

        $this->postJson('/api/v1/contacts', [
            'name' => 'New Lead',
            'email' => 'lead@example.com',
            'phone' => '+91 9876543210',
            'subject' => 'Website project',
            'message' => 'Please contact me.',
        ])->assertCreated();

        Notification::assertSentOnDemand(LeadSubmitted::class, fn ($notification, $channels, $notifiable) =>
            $notifiable->routes['mail'] === 'lead@example.com' && !$notification->forAdmin
        );
        Notification::assertSentOnDemand(LeadSubmitted::class, fn ($notification, $channels, $notifiable) =>
            $notifiable->routes['mail'] === 'info@shivpatel.in' && $notification->forAdmin
        );

        $contact = Contact::firstOrFail();
        $this->assertSame('We received your inquiry', (new LeadSubmitted($contact))->toMail(new \stdClass)->subject);
        $this->assertSame('New lead: Website project', (new LeadSubmitted($contact, true))->toMail(new \stdClass)->subject);
    }
}
