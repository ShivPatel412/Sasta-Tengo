<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $email = env('ADMIN_EMAIL') ?: throw new \RuntimeException('ADMIN_EMAIL is required.');
        $password = env('ADMIN_PASSWORD') ?: throw new \RuntimeException('ADMIN_PASSWORD is required.');

        User::updateOrCreate(['email' => $email], [
            'name' => 'Shiv Patel',
            'password' => Hash::make($password),
            'email_verified_at' => now(),
        ]);
    }
}
