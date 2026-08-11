<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardLayoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_renders_the_overview_layout(): void
    {
        $this->actingAs(User::factory()->create())
            ->get('/dashboard')
            ->assertOk()
            ->assertSee('Welcome back!')
            ->assertSee('Contact Leads')
            ->assertSee('Lead Pipeline')
            ->assertSee('Activity Overview')
            ->assertSee('Top Services Requested');
    }
}
