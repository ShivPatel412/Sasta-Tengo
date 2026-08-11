<?php

namespace Database\Seeders;

use App\Models\Experience;
use Illuminate\Database\Seeder;

class ExperienceSeeder extends Seeder
{
    public function run(): void
    {
        $experiences = [
            [
                'company' => 'Bugle Technologies',
                'title' => 'Web Developer',
                'website' => 'https://bugle.in/',
                'logo' => '/experience/bugle-technologies.png',
                'start_date' => '2023-01-01',
                'end_date' => null,
                'is_current' => true,
                'summary' => 'Built 10+ business websites, custom WordPress plugins, ACF solutions, and React frontends.',
                'description' => 'Developed and maintained high-performance business websites, custom WordPress solutions, and React-based frontend applications while focusing on performance, scalability, and SEO.',
                'highlights' => [
                    'Built and launched 10+ business websites across multiple industries.',
                    'Developed custom WordPress plugins to automate business workflows.',
                    'Created dynamic websites using Advanced Custom Fields (ACF).',
                    'Built responsive frontend interfaces using React.',
                    'Integrated REST APIs and third-party services.',
                    'Optimized website speed, SEO, and Core Web Vitals.',
                    'Customized Elementor themes and reusable components.',
                    'Maintained and improved existing client websites.',
                ],
                'technologies' => ['React', 'PHP', 'WordPress', 'ACF', 'HTML', 'CSS'],
                'order' => 1,
            ],
            [
                'company' => 'Genz Miner',
                'title' => 'Web Developer',
                'website' => 'https://www.saifeeinfotech.com/',
                'logo' => '/experience/genz-miner.jpg',
                'start_date' => '2022-05-01',
                'end_date' => '2022-12-01',
                'is_current' => false,
                'summary' => 'Developed eCommerce websites, inventory management systems, and client-focused business solutions.',
                'description' => 'Developed eCommerce platforms and internal business management systems while working closely with clients to deliver customized web solutions.',
                'highlights' => [
                    'Developed responsive eCommerce websites.',
                    'Built stock and inventory management modules.',
                    'Worked directly with clients to gather requirements and implement features.',
                    'Customized dashboards and business workflows.',
                    'Improved website usability and frontend performance.',
                    'Integrated Firebase authentication and backend services.',
                    'Created reusable React components.',
                ],
                'technologies' => ['React', 'Firebase', 'HTML', 'CSS', 'JavaScript', 'eCommerce Development'],
                'order' => 2,
            ],
            [
                'company' => 'Kalpataru Innovation',
                'title' => 'Junior Web Developer',
                'website' => 'https://www.kalpataruinnovation.com/',
                'logo' => '/experience/kalpataru-innovation.webp',
                'start_date' => '2022-01-01',
                'end_date' => '2022-04-01',
                'is_current' => false,
                'summary' => 'Created responsive WordPress websites, WooCommerce stores, and multi-vendor eCommerce platforms.',
                'description' => 'Worked on responsive WordPress websites, WooCommerce stores, and multi-vendor eCommerce platforms while gaining experience in full website development.',
                'highlights' => [
                    'Developed responsive WordPress business websites.',
                    'Built WooCommerce eCommerce stores.',
                    'Created multi-vendor marketplace websites.',
                    'Customized WordPress themes and plugins.',
                    'Implemented responsive layouts for desktop and mobile devices.',
                    'Improved website performance and user experience.',
                    'Assisted in deployment and website maintenance.',
                ],
                'technologies' => ['WordPress', 'WooCommerce', 'PHP', 'HTML', 'CSS', 'JavaScript'],
                'order' => 3,
            ],
        ];

        foreach ($experiences as $experience) {
            Experience::updateOrCreate(
                ['company' => $experience['company'], 'title' => $experience['title']],
                $experience
            );
        }
    }
}
