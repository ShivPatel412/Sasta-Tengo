<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;

class ServicesSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['title' => 'Website Design', 'description' => 'A responsive, modern website that makes your business look professional and easy to trust.', 'price' => 500, 'duration' => 60, 'icon' => '🌐', 'is_active' => true],
            ['title' => 'Software Development', 'description' => 'Practical web applications, dashboards, and custom tools built around your workflow.', 'price' => 500, 'duration' => 60, 'icon' => '⚙️', 'is_active' => true],
            ['title' => 'Digital Strategy', 'description' => 'A focused planning session to turn your idea into a clear website or software roadmap.', 'price' => 500, 'duration' => 60, 'icon' => '💡', 'is_active' => true],
        ] as $service) {
            Service::updateOrCreate(['title' => $service['title']], $service);
        }
    }
}
