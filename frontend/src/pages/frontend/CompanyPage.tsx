import { HeaderFrontend } from '../../components/layout/HeaderFrontend';
import { FooterFrontend } from '../../layouts/FooterFrontend';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Award, 
  Users, 
  ShoppingBag,
  CheckCircle,
  ArrowRight,
  Globe,
  Zap,
  Target,
  TrendingUp,
  Heart,
  Building,
  Calendar,
  Briefcase
} from 'lucide-react';
import { Link } from 'react-router-dom';

const teamMembers = [
  {
    name: 'John Smith',
    role: 'CEO & Founder',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&face',
    description: '15+ years experience in retail technology and business development. Former VP at Microsoft.',
    linkedin: '#',
    email: 'john@posmid.com'
  },
  {
    name: 'Sarah Johnson',
    role: 'Chief Technology Officer',
    image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&h=200&fit=crop&face',
    description: 'Expert in POS systems, cloud architecture, and AI integration. MIT Computer Science graduate.',
    linkedin: '#',
    email: 'sarah@posmid.com'
  },
  {
    name: 'Mike Chen',
    role: 'Head of Sales & Marketing',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&face',
    description: 'Specializes in business growth, customer relations, and market expansion strategies.',
    linkedin: '#',
    email: 'mike@posmid.com'
  },
  {
    name: 'Emily Rodriguez',
    role: 'Head of Customer Success',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&face',
    description: 'Ensures customer satisfaction and manages our 24/7 support operations worldwide.',
    linkedin: '#',
    email: 'emily@posmid.com'
  },
  {
    name: 'David Kim',
    role: 'Lead Product Designer',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&face',
    description: 'Creates intuitive user experiences and modern interfaces for our POS systems.',
    linkedin: '#',
    email: 'david@posmid.com'
  },
  {
    name: 'Lisa Wang',
    role: 'VP of Operations',
    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&face',
    description: 'Manages global operations, supply chain, and ensures seamless service delivery.',
    linkedin: '#',
    email: 'lisa@posmid.com'
  }
];

const achievements = [
  { number: '10,000+', label: 'Happy Customers', icon: Users, color: 'from-blue-500 to-blue-600' },
  { number: '75+', label: 'Countries Served', icon: Globe, color: 'from-green-500 to-green-600' },
  { number: '99.99%', label: 'Uptime Guarantee', icon: CheckCircle, color: 'from-purple-500 to-purple-600' },
  { number: '24/7', label: 'Customer Support', icon: Clock, color: 'from-orange-500 to-orange-600' }
];

const services = [
  {
    title: 'Cloud-Based POS System',
    description: 'Modern, secure, and scalable point of sale solution that works anywhere, anytime.',
    icon: Zap,
    features: ['Real-time synchronization', 'Offline mode support', 'Multi-device compatibility', 'Automatic updates']
  },
  {
    title: 'Inventory Management',
    description: 'Advanced inventory tracking with real-time stock levels and automated reordering.',
    icon: ShoppingBag,
    features: ['Real-time tracking', 'Low stock alerts', 'Supplier management', 'Barcode scanning']
  },
  {
    title: 'Analytics & Reporting',
    description: 'Comprehensive business insights with customizable reports and dashboards.',
    icon: TrendingUp,
    features: ['Sales analytics', 'Customer insights', 'Performance metrics', 'Custom reports']
  },
  {
    title: 'Customer Management',
    description: 'Build lasting relationships with integrated CRM and loyalty programs.',
    icon: Heart,
    features: ['Customer profiles', 'Loyalty programs', 'Email marketing', 'Purchase history']
  }
];

const milestones = [
  { year: '2009', title: 'Company Founded', description: 'Started with a vision to revolutionize retail technology' },
  { year: '2012', title: 'First 1,000 Customers', description: 'Reached our first major milestone in customer acquisition' },
  { year: '2015', title: 'International Expansion', description: 'Expanded operations to Europe and Asia markets' },
  { year: '2018', title: 'Cloud Migration', description: 'Successfully migrated all systems to cloud infrastructure' },
  { year: '2021', title: '10,000+ Customers', description: 'Celebrated serving over 10,000 businesses worldwide' },
  { year: '2024', title: 'AI Integration', description: 'Launched AI-powered analytics and predictive insights' }
];

export default function CompanyPage() {
  return (
    <div className="min-h-screen">
      <HeaderFrontend />

      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="text-center mb-20">
          <div className="max-w-5xl mx-auto">
            <Badge className="gradient-secondary text-white mb-6 text-lg px-6 py-2">
              <Award className="h-4 w-4 mr-2" />
              Industry Leader Since 2009 - Trusted by 10,000+ Businesses
            </Badge>
            <h1 className="text-6xl lg:text-7xl font-bold mb-8 leading-tight">
              Revolutionizing
              <span className="gradient-primary bg-clip-text text-transparent block">
                Point of Sale Technology
              </span>
              <span className="text-4xl lg:text-5xl text-muted-foreground block mt-4">
                Across the Globe
              </span>
            </h1>
            <p className="text-2xl text-muted-foreground leading-relaxed mb-12 max-w-4xl mx-auto">
              We're passionate about creating innovative POS solutions that empower businesses 
              to grow, streamline operations, and deliver exceptional customer experiences. 
              From small cafes to enterprise retailers, we've got you covered.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button size="lg" className="gradient-secondary text-white text-xl px-12 py-4" asChild>
                <Link to="/products">
                  Explore Our Products
                  <ArrowRight className="h-6 w-6 ml-3" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-xl px-12 py-4">
                <Phone className="h-6 w-6 mr-3" />
                Schedule Demo
              </Button>
            </div>
          </div>
        </section>

        {/* Company Stats */}
        <section className="mb-24">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {achievements.map((achievement, index) => {
              const Icon = achievement.icon;
              return (
                <GlassCard key={index} className="text-center group" hover>
                  <div className={`w-20 h-20 bg-gradient-to-br ${achievement.color} rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-4xl font-bold mb-3 gradient-primary bg-clip-text text-transparent">{achievement.number}</h3>
                  <p className="text-lg text-muted-foreground font-medium">{achievement.label}</p>
                </GlassCard>
              );
            })}
          </div>
        </section>

        {/* About Section */}
        <section className="grid lg:grid-cols-2 gap-16 items-center mb-24">
          <div>
            <Badge className="gradient-primary text-white mb-6">
              <Building className="h-4 w-4 mr-2" />
              Our Story
            </Badge>
            <h2 className="text-5xl font-bold mb-8">Empowering Businesses Since 2009</h2>
            <div className="space-y-6 text-xl text-muted-foreground leading-relaxed">
              <p>
                Founded in 2009, POSMID began with a simple yet ambitious mission: 
                to create the most intuitive, powerful, and reliable point of sale system for businesses of all sizes.
              </p>
              <p>
                What started as a small team of passionate developers and retail experts has grown into a 
                company serving over 10,000 businesses across 75+ countries. Our journey has been 
                driven by one core belief: technology should make business operations simpler, not more complex.
              </p>
              <p>
                Today, we continue to innovate with cutting-edge technology, including glassmorphism design, 
                AI-powered analytics, real-time inventory management, and seamless integrations that help 
                businesses thrive in the digital age.
              </p>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-6">
              {[
                'Cloud-based POS solutions',
                'Real-time inventory management', 
                'Advanced analytics & reporting',
                'Multi-platform compatibility',
                '24/7 customer support',
                'AI-powered insights',
                'Secure payment processing',
                'Customizable workflows'
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                  <span className="font-medium text-lg">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <GlassCard className="animate-float">
              <div className="aspect-video rounded-xl overflow-hidden mb-6">
                <img 
                  src="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=700&h=500&fit=crop"
                  alt="Modern Office"
                  className="w-full h-full object-cover"
                />
              </div>
            </GlassCard>
            <GlassCard className="absolute -bottom-8 -left-8 p-6 animate-glow">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 gradient-secondary rounded-full flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-lg">Customer Satisfaction</p>
                  <p className="text-3xl font-bold text-green-500">98.5%</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Services Section */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <Badge className="gradient-secondary text-white mb-6">
              <Target className="h-4 w-4 mr-2" />
              Our Services
            </Badge>
            <h2 className="text-5xl font-bold mb-6">Complete POS Solutions</h2>
            <p className="text-2xl text-muted-foreground max-w-4xl mx-auto">
              Everything you need to run your business efficiently, from point of sale 
              to inventory management and customer analytics.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <GlassCard key={index} className="group" hover>
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-4">{service.title}</h3>
                      <p className="text-lg text-muted-foreground mb-6">{service.description}</p>
                      <ul className="space-y-2">
                        {service.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="font-medium">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </section>

        {/* Timeline Section */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <Badge className="gradient-primary text-white mb-6">
              <Calendar className="h-4 w-4 mr-2" />
              Our Journey
            </Badge>
            <h2 className="text-5xl font-bold mb-6">15 Years of Innovation</h2>
            <p className="text-2xl text-muted-foreground max-w-3xl mx-auto">
              From a startup dream to a global leader in POS technology
            </p>
          </div>
          
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-blue-500 to-teal-500 rounded-full"></div>
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className={`flex items-center gap-8 ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`flex-1 ${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                    <GlassCard className="inline-block" hover>
                      <div className="text-3xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
                        {milestone.year}
                      </div>
                      <h3 className="text-xl font-semibold mb-3">{milestone.title}</h3>
                      <p className="text-muted-foreground">{milestone.description}</p>
                    </GlassCard>
                  </div>
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full border-4 border-background z-10"></div>
                  <div className="flex-1"></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="mb-24">
          <div className="text-center mb-16">
            <Badge className="gradient-secondary text-white mb-6">
              <Users className="h-4 w-4 mr-2" />
              Meet Our Team
            </Badge>
            <h2 className="text-5xl font-bold mb-6">The Minds Behind POSMID</h2>
            <p className="text-2xl text-muted-foreground max-w-4xl mx-auto">
              Our diverse team of experts is dedicated to delivering exceptional 
              POS solutions and world-class customer service.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {teamMembers.map((member, index) => (
              <GlassCard key={index} className="text-center group" hover>
                <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-6 group-hover:scale-105 transition-transform">
                  <img 
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-2xl font-bold mb-2">{member.name}</h3>
                <Badge variant="outline" className="mb-4 text-lg px-4 py-1">{member.role}</Badge>
                <p className="text-muted-foreground mb-6 leading-relaxed">{member.description}</p>
                <div className="flex justify-center gap-4">
                  <Button size="sm" variant="outline">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                  <Button size="sm" variant="outline">
                    <Briefcase className="h-4 w-4 mr-2" />
                    LinkedIn
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact">
          <div className="text-center mb-16">
            <Badge className="gradient-primary text-white mb-6">
              <Mail className="h-4 w-4 mr-2" />
              Get In Touch
            </Badge>
            <h2 className="text-5xl font-bold mb-6">Let's Start Your Success Story</h2>
            <p className="text-2xl text-muted-foreground max-w-3xl mx-auto">
              Ready to transform your business? Contact us today for a personalized demo 
              and see how POSMID can revolutionize your operations.
            </p>
          </div>
          
          <GlassCard className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16">
              <div>
                <h3 className="text-3xl font-bold mb-8">Contact Information</h3>
                <div className="space-y-8">
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center">
                      <MapPin className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-xl mb-2">Headquarters</p>
                      <p className="text-muted-foreground text-lg">123 Innovation Drive<br />San Francisco, CA 94102<br />United States</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 gradient-secondary rounded-full flex items-center justify-center">
                      <Phone className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-xl mb-2">Phone & Fax</p>
                      <p className="text-muted-foreground text-lg">Sales: +1 (555) 123-4567<br />Support: +1 (555) 765-4321<br />Fax: +1 (555) 123-4568</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Mail className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-xl mb-2">Email</p>
                      <p className="text-muted-foreground text-lg">Sales: sales@posmid.com<br />Support: support@posmid.com<br />General: info@posmid.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                      <Clock className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-xl mb-2">Business Hours</p>
                      <p className="text-muted-foreground text-lg">Monday - Friday: 9:00 AM - 6:00 PM PST<br />Saturday: 10:00 AM - 4:00 PM PST<br />Sunday: Closed</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <h3 className="text-3xl font-bold mb-8">Send us a message</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">First Name *</label>
                    <Input 
                      type="text" 
                      placeholder="John"
                      className="text-lg p-4"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Last Name *</label>
                    <Input 
                      type="text" 
                      placeholder="Doe"
                      className="text-lg p-4"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address *</label>
                  <Input 
                    type="email" 
                    placeholder="john.doe@company.com"
                    className="text-lg p-4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Company Name</label>
                  <Input 
                    type="text" 
                    placeholder="Your Company Inc."
                    className="text-lg p-4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Subject *</label>
                  <Input 
                    type="text" 
                    placeholder="I'm interested in POSMID solutions"
                    className="text-lg p-4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message *</label>
                  <Textarea 
                    placeholder="Tell us about your business needs and how we can help..."
                    className="text-lg p-4 min-h-[150px]"
                  />
                </div>
                <Button className="w-full gradient-secondary text-white text-lg py-4">
                  <Mail className="h-5 w-5 mr-3" />
                  Send Message
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  We'll get back to you within 24 hours. For urgent matters, please call us directly.
                </p>
              </div>
            </div>
          </GlassCard>
        </section>
      </div>

      <FooterFrontend />
    </div>
  );
}