<?php

namespace Tests\Feature;

use App\Models\Experience;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExperienceDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_manage_experience(): void
    {
        $admin = User::factory()->create();
        $this->actingAs($admin)->post('/dashboard/experiences', [
            'title' => 'Web Developer',
            'company' => 'Example Company',
            'start_date' => '2024-01-01',
            'is_current' => 1,
            'summary' => 'Built business websites.',
            'description' => 'Developed and maintained web applications.',
            'highlights' => "Built a CRM\nImproved performance",
            'technologies' => 'React, Laravel',
        ])->assertRedirect();

        $experience = Experience::firstOrFail();
        $this->assertSame(['React', 'Laravel'], $experience->technologies);
        $this->assertSame(['Built a CRM', 'Improved performance'], $experience->highlights);
        $this->actingAs($admin)->get('/dashboard/experiences')->assertSee('Example Company')->assertSee('Web Developer');
        $this->getJson('/api/v1/experience')->assertOk()->assertJsonFragment(['company' => 'Example Company']);
    }
}
