<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class ContactCrmTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--force' => true]);
    }

    public function test_admin_can_filter_and_update_contact_leads(): void
    {
        $admin = User::factory()->create();
        $unread = Contact::create(['name' => 'Unread Lead', 'email' => 'new@example.com', 'subject' => 'New', 'message' => 'Hello', 'is_read' => false]);
        Contact::create(['name' => 'Read Lead', 'email' => 'read@example.com', 'subject' => 'Old', 'message' => 'Hello', 'is_read' => true]);

        $this->actingAs($admin)->get('/dashboard/contacts?filter=unread')->assertSee('Unread Lead')->assertDontSee('Read Lead');
        $this->actingAs($admin)->put("/dashboard/contacts/{$unread->id}", ['lead_status' => 'qualified', 'admin_notes' => 'Call tomorrow', 'is_read' => 1])->assertRedirect();

        $this->assertDatabaseHas('contacts', ['id' => $unread->id, 'lead_status' => 'qualified', 'admin_notes' => 'Call tomorrow', 'is_read' => true]);
    }
}
