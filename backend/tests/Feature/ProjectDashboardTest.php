<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_publish_a_project(): void
    {
        $this->actingAs(User::factory()->create())
            ->post('/dashboard/projects', [
                'title' => 'Portfolio',
                'description' => 'A personal portfolio website.',
                'technologies' => 'React, Laravel',
                'category' => 'web',
                'order' => 1,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('projects', ['title' => 'Portfolio']);
    }
}
