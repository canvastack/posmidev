<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Src\Pms\Infrastructure\Models\ContentPage;
use Src\Pms\Infrastructure\Models\Tenant;

class ContentPagesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get HQ tenant by configured UUID or name
        $hqTenantId = config('tenancy.hq_tenant_id');
        $hqTenant = null;

        if ($hqTenantId) {
            $hqTenant = Tenant::find($hqTenantId);
        }

        if (!$hqTenant) {
            $hqTenant = Tenant::where('name', config('tenancy.hq_tenant_name', 'HQ'))->first();
        }

        if (!$hqTenant) {
            $this->command->warn('HQ tenant not found, skipping content pages seeding.');
            return;
        }

        $this->command->info("Seeding content pages for tenant: {$hqTenant->name} ({$hqTenant->id})");

        // About/Company Page
        ContentPage::updateOrCreate(
            [
                'tenant_id' => $hqTenant->id,
                'slug' => 'about',
            ],
            [
                'title' => 'About Us - POSMID',
                'status' => 'published',
                'published_at' => now(),
                'content' => [
                    'hero' => [
                        'badge' => 'Industry Leader Since 2009 - Trusted by 10,000+ Businesses',
                        'title' => 'Revolutionizing Point of Sale Technology Across the Globe',
                        'subtitle' => 'From small cafes to enterprise retailers, we\'ve got you covered.',
                        'description' => 'We\'re passionate about creating innovative POS solutions that empower businesses to grow, streamline operations, and deliver exceptional customer experiences.',
                    ],
                    'achievements' => [
                        ['number' => '10,000+', 'label' => 'Happy Customers', 'icon' => 'Users', 'color' => 'from-blue-500 to-blue-600'],
                        ['number' => '75+', 'label' => 'Countries Served', 'icon' => 'Globe', 'color' => 'from-green-500 to-green-600'],
                        ['number' => '99.99%', 'label' => 'Uptime Guarantee', 'icon' => 'CheckCircle', 'color' => 'from-purple-500 to-purple-600'],
                        ['number' => '24/7', 'label' => 'Customer Support', 'icon' => 'Clock', 'color' => 'from-orange-500 to-orange-600'],
                    ],
                    'story' => [
                        'title' => 'Empowering Businesses Since 2009',
                        'image' => 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=700&h=500&fit=crop',
                        'paragraphs' => [
                            'Founded in 2009, POSMID began with a simple yet ambitious mission: to create the most intuitive, powerful, and reliable point of sale system for businesses of all sizes.',
                            'What started as a small team of passionate developers and retail experts has grown into a company serving over 10,000 businesses across 75+ countries. Our journey has been driven by one core belief: technology should make business operations simpler, not more complex.',
                            'Today, we continue to innovate with cutting-edge technology, including glassmorphism design, AI-powered analytics, real-time inventory management, and seamless integrations that help businesses thrive in the digital age.',
                        ],
                        'features' => [
                            'Cloud-based POS solutions',
                            'Real-time inventory management',
                            'Advanced analytics & reporting',
                            'Multi-platform compatibility',
                            '24/7 customer support',
                            'AI-powered insights',
                            'Secure payment processing',
                            'Customizable workflows',
                        ],
                        'satisfaction' => '98.5%',
                    ],
                    'services' => [
                        [
                            'title' => 'Cloud-Based POS System',
                            'description' => 'Modern, secure, and scalable point of sale solution that works anywhere, anytime.',
                            'icon' => 'Zap',
                            'features' => ['Real-time synchronization', 'Offline mode support', 'Multi-device compatibility', 'Automatic updates'],
                        ],
                        [
                            'title' => 'Inventory Management',
                            'description' => 'Advanced inventory tracking with real-time stock levels and automated reordering.',
                            'icon' => 'ShoppingBag',
                            'features' => ['Real-time tracking', 'Low stock alerts', 'Supplier management', 'Barcode scanning'],
                        ],
                        [
                            'title' => 'Analytics & Reporting',
                            'description' => 'Comprehensive business insights with customizable reports and dashboards.',
                            'icon' => 'TrendingUp',
                            'features' => ['Sales analytics', 'Customer insights', 'Performance metrics', 'Custom reports'],
                        ],
                        [
                            'title' => 'Customer Management',
                            'description' => 'Build lasting relationships with integrated CRM and loyalty programs.',
                            'icon' => 'Heart',
                            'features' => ['Customer profiles', 'Loyalty programs', 'Email marketing', 'Purchase history'],
                        ],
                    ],
                    'milestones' => [
                        ['year' => '2009', 'title' => 'Company Founded', 'description' => 'Started with a vision to revolutionize retail technology'],
                        ['year' => '2012', 'title' => 'First 1,000 Customers', 'description' => 'Reached our first major milestone in customer acquisition'],
                        ['year' => '2015', 'title' => 'International Expansion', 'description' => 'Expanded operations to Europe and Asia markets'],
                        ['year' => '2018', 'title' => 'Cloud Migration', 'description' => 'Successfully migrated all systems to cloud infrastructure'],
                        ['year' => '2021', 'title' => '10,000+ Customers', 'description' => 'Celebrated serving over 10,000 businesses worldwide'],
                        ['year' => '2024', 'title' => 'AI Integration', 'description' => 'Launched AI-powered analytics and predictive insights'],
                    ],
                    'team' => [
                        [
                            'name' => 'John Smith',
                            'role' => 'CEO & Founder',
                            'image' => 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&face',
                            'description' => '15+ years experience in retail technology and business development. Former VP at Microsoft.',
                        ],
                        [
                            'name' => 'Sarah Johnson',
                            'role' => 'Chief Technology Officer',
                            'image' => 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=200&fit=crop&face',
                            'description' => 'Expert in POS systems, cloud architecture, and AI integration. MIT Computer Science graduate.',
                        ],
                        [
                            'name' => 'Mike Chen',
                            'role' => 'Head of Sales & Marketing',
                            'image' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&face',
                            'description' => 'Specializes in business growth, customer relations, and market expansion strategies.',
                        ],
                        [
                            'name' => 'Emily Rodriguez',
                            'role' => 'Head of Customer Success',
                            'image' => 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&face',
                            'description' => 'Ensures customer satisfaction and manages our 24/7 support operations worldwide.',
                        ],
                        [
                            'name' => 'David Kim',
                            'role' => 'Lead Product Designer',
                            'image' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&face',
                            'description' => 'Creates intuitive user experiences and modern interfaces for our POS systems.',
                        ],
                        [
                            'name' => 'Lisa Wang',
                            'role' => 'VP of Operations',
                            'image' => 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&face',
                            'description' => 'Manages global operations, supply chain, and ensures seamless service delivery.',
                        ],
                    ],
                ],
            ]
        );

        $this->command->info('✅ Content pages seeded successfully.');
    }
}