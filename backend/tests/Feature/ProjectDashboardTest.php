<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Project;
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

    public function test_admin_can_filter_projects(): void
    {
        Project::create(['title' => 'Website', 'description' => 'Web project', 'category' => 'web']);
        Project::create(['title' => 'Desktop Tool', 'description' => 'Desktop project', 'category' => 'desktop']);

        $this->actingAs(User::factory()->create())
            ->get('/dashboard/projects?category=web')
            ->assertSee('Website')
            ->assertDontSee('Desktop Tool')
            ->assertSee('Web Application')
            ->assertSee('Desktop Application');
    }

    public function test_admin_can_create_select_and_filter_a_custom_project_type(): void
    {
        $admin = User::factory()->create();

        $this->actingAs($admin)->post('/dashboard/projects/types', [
            'name' => 'AI Application',
        ])->assertRedirect();

        $this->assertDatabaseHas('project_types', ['name' => 'AI Application']);
        $this->actingAs($admin)->get('/dashboard/projects')->assertSee('AI Application');

        $this->actingAs($admin)->post('/dashboard/projects', [
            'title' => 'AI Assistant',
            'description' => 'A custom AI project.',
            'category' => 'AI Application',
        ])->assertRedirect();

        $this->assertDatabaseHas('projects', [
            'title' => 'AI Assistant',
            'category' => 'AI Application',
        ]);

        $this->actingAs($admin)
            ->get('/dashboard/projects?category='.urlencode('AI Application'))
            ->assertOk()
            ->assertSee('AI Assistant')
            ->assertSee('AI Application');
    }

    public function test_admin_can_view_project_details(): void
    {
        $project = Project::create([
            'title' => 'Highlight Generator',
            'description' => 'Generates highlights automatically.',
            'category' => 'other',
            'technologies' => ['Python', 'Jupyter Notebook'],
            'github_url' => 'https://github.com/example/highlights',
        ]);

        $this->actingAs(User::factory()->create())
            ->get("/dashboard/projects/{$project->id}")
            ->assertOk()
            ->assertSee('Highlight Generator')
            ->assertSee('Generates highlights automatically.')
            ->assertSee('Jupyter Notebook')
            ->assertSee('Edit');
    }

    public function test_admin_can_rename_and_delete_an_unused_project_type(): void
    {
        $admin = User::factory()->create();
        $this->actingAs($admin)->post('/dashboard/projects/types', ['name' => 'TimePass']);
        $typeId = \DB::table('project_types')->where('name', 'TimePass')->value('id');

        $this->actingAs($admin)->put("/dashboard/projects/types/{$typeId}", ['name' => 'Prototype'])
            ->assertRedirect('/dashboard/projects');
        $this->assertDatabaseHas('project_types', ['name' => 'Prototype']);

        $this->actingAs($admin)->delete("/dashboard/projects/types/{$typeId}")
            ->assertRedirect('/dashboard/projects');
        $this->assertDatabaseMissing('project_types', ['id' => $typeId]);
    }

    public function test_renaming_updates_projects_and_used_types_cannot_be_deleted(): void
    {
        $admin = User::factory()->create();
        $this->actingAs($admin)->post('/dashboard/projects/types', ['name' => 'Legacy']);
        $typeId = \DB::table('project_types')->where('name', 'Legacy')->value('id');
        Project::create(['title' => 'Legacy App', 'description' => 'Test', 'category' => 'Legacy']);

        $this->actingAs($admin)->put("/dashboard/projects/types/{$typeId}", ['name' => 'Modern'])
            ->assertRedirect('/dashboard/projects');
        $this->assertDatabaseHas('projects', ['title' => 'Legacy App', 'category' => 'Legacy']);

        $this->actingAs($admin)->delete("/dashboard/projects/types/{$typeId}")
            ->assertSessionHasErrors('project_type');
        $this->assertDatabaseHas('project_types', ['id' => $typeId, 'name' => 'Modern']);
    }

    public function test_built_in_project_types_can_be_managed_too(): void
    {
        $admin = User::factory()->create();
        $webType = \DB::table('project_types')->where('category', 'web')->first();

        $this->actingAs($admin)->get('/dashboard/projects')
            ->assertSee(route('dashboard.project-types.update', $webType->id));

        $this->actingAs($admin)->put("/dashboard/projects/types/{$webType->id}", ['name' => 'Website Projects'])
            ->assertRedirect('/dashboard/projects');

        $this->assertDatabaseHas('project_types', [
            'category' => 'web',
            'name' => 'Website Projects',
        ]);
    }
}
