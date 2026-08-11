<?php

namespace Tests\Feature;

use Database\Seeders\AdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_credentials_come_from_the_environment(): void
    {
        $this->seed(AdminSeeder::class);

        $admin = \App\Models\User::where('email', 'admin@example.com')->firstOrFail();
        $this->assertTrue(Hash::check('test-password', $admin->password));
    }
}
