<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Project;

class ProjectsSeeder extends Seeder
{
    public function run(): void
    {
        $projects = [
            [
                'title' => 'Automatic Highlight Generation',
                'description' => 'Generating automatic highlights from video by detecting the action.',
                'image' => 'highlight-gen.jpg',
                'technologies' => ['Python', 'Google Colab', 'Jupyter Notebook', 'Deep Learning', 'Machine Learning', 'Image Processing'],
                'github_url' => 'https://github.com/ShivPatel412/Automatic-Highlight-Generation',
                'live_url' => null,
                'category' => 'other',
                'is_featured' => true,
                'order' => 1,
            ],
            [
                'title' => 'Hotel Management',
                'description' => 'Designed and implemented Web and java application with a secure authentication system with role-based access control for Admin, Staff, and Customers.',
                'image' => 'hotel-management.jpg',
                'technologies' => ['Advanced Java', 'NetBeans', 'MySQL', 'HTML', 'CSS', 'Bootstrap', 'Javascript'],
                'github_url' => 'https://github.com/ShivPatel412/Hotel-Management-Sysytem',
                'live_url' => null,
                'category' => 'desktop',
                'is_featured' => true,
                'order' => 2,
            ],
            [
                'title' => 'Library Management',
                'description' => 'Collaborated with team of 3 to develop Library Management System using PHP, HTML, CSS, JavaScript, MySQL.',
                'image' => 'library-management.jpg',
                'technologies' => ['PHP', 'HTML', 'CSS', 'JavaScript', 'MySQL'],
                'github_url' => 'https://github.com/ShivPatel412/Library-Management-System',
                'live_url' => null,
                'category' => 'web',
                'is_featured' => true,
                'order' => 3,
            ],
        ];

        foreach ($projects as $project) {
            Project::updateOrCreate(['title' => $project['title']], $project);
        }
    }
}
