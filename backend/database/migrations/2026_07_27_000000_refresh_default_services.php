<?php

use App\Models\Service;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        foreach ([
            '1:1 Consultation' => ['title' => 'Website Design', 'description' => 'A responsive, modern website that makes your business look professional and easy to trust.', 'icon' => '🌐'],
            'Code Review' => ['title' => 'Software Development', 'description' => 'Practical web applications, dashboards, and custom tools built around your workflow.', 'icon' => '⚙️'],
            'Technical Interview Prep' => ['title' => 'Digital Strategy', 'description' => 'A focused planning session to turn your idea into a clear website or software roadmap.', 'icon' => '💡'],
        ] as $title => $data) {
            Service::where('title', $title)->update($data);
        }
    }

    public function down(): void {}
};
