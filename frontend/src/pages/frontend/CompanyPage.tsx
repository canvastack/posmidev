import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/GlassCard';
import { HeaderFrontend } from '@/components/layout/HeaderFrontend';
import { FooterFrontend } from '@/layouts/FooterFrontend';
import { useContentPage } from '@/hooks/useContentPage';
import { useAuthStore } from '@/stores/authStore';
import {
  Award,
  ArrowRight,
  Phone,
  Building,
  CheckCircle,
  TrendingUp,
  Target,
  Calendar,
  Users,
  Mail,
  MapPin,
  Clock,
  Briefcase,
  ShoppingBag,
  Globe,
  Zap,
  Store,
  BarChart,
  CreditCard,
  Package,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

// Icon mapping for dynamic content
const iconMap: Record<string, LucideIcon> = {
  'ShoppingBag': ShoppingBag,
  'Globe': Globe,
  'Zap': Zap,
  'Award': Award,
  'Store': Store,
  'BarChart': BarChart,
  'CreditCard': CreditCard,
  'Package': Package,
  'Users': Users,
  'TrendingUp': TrendingUp,
  'Target': Target,
  'Building': Building,
  'CheckCircle': CheckCircle,
};

export default function CompanyPage() {
  const tenantId = useAuthStore((state) => state.tenantId) || import.meta.env.VITE_HQ_TENANT_ID || '11111111-1111-1111-1111-111111111111';
  const { page, loading, error } = useContentPage(tenantId, 'about');

  if (loading) {
    return (
      <div className="min-h-screen">
        <HeaderFrontend />
        <div className="container mx-auto px-6 py-32 flex justify-center items-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-xl text-muted-foreground">Loading about page...</p>
          </div>
        </div>
        <FooterFrontend />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen">
        <HeaderFrontend />
        <div className="container mx-auto px-6 py-32">
          <GlassCard className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Page Not Found</h2>
            <p className="text-muted-foreground mb-6">{error || 'Unable to load the about page.'}</p>
            <Button asChild>
              <Link to="/">Return Home</Link>
            </Button>
          </GlassCard>
        </div>
        <FooterFrontend />
      </div>
    );
  }

  const content = page.content;
  const hero = content.hero || {};
  const achievements = content.achievements || [];
  const story = content.story || {};
  const services = content.services || [];
  const milestones = content.milestones || [];
  const team = content.team || [];

  return (
    <div className="min-h-screen">
      <HeaderFrontend />

      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <section className="text-center mb-20">
          <div className="max-w-5xl mx-auto">
            {hero.badge && (
              <Badge className="gradient-secondary text-white mb-6 text-lg px-6 py-2">
                <Award className="h-4 w-4 mr-2" />
                {hero.badge}
              </Badge>
            )}
            
            {hero.title && (
              <h1 className="text-6xl lg:text-7xl font-bold mb-8 leading-tight">
                {hero.title.before}
                <span className="gradient-primary bg-clip-text text-transparent block">
                  {hero.title.highlight}
                </span>
                {hero.title.after && (
                  <span className="text-4xl lg:text-5xl text-muted-foreground block mt-4">
                    {hero.title.after}
                  </span>
                )}
              </h1>
            )}
            
            {hero.description && (
              <p className="text-2xl text-muted-foreground leading-relaxed mb-12 max-w-4xl mx-auto">
                {hero.description}
              </p>
            )}
            
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

        {/* Company Stats / Achievements */}
        {achievements.length > 0 && (
          <section className="mb-24">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {achievements.map((achievement: any, index: number) => {
                const Icon = iconMap[achievement.icon] || Award;
                return (
                  <GlassCard key={index} className="text-center group" hover>
                    <div className={`w-20 h-20 bg-gradient-to-br ${achievement.color} rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                      <Icon className="h-10 w-10 text-white" />
                    </div>
                    <h3 className="text-4xl font-bold mb-3 gradient-primary bg-clip-text text-transparent">
                      {achievement.number}
                    </h3>
                    <p className="text-lg text-muted-foreground font-medium">{achievement.label}</p>
                  </GlassCard>
                );
              })}
            </div>
          </section>
        )}

        {/* About / Story Section */}
        {story.title && (
          <section className="grid lg:grid-cols-2 gap-16 items-center mb-24">
            <div>
              <Badge className="gradient-primary text-white mb-6">
                <Building className="h-4 w-4 mr-2" />
                Our Story
              </Badge>
              <h2 className="text-5xl font-bold mb-8">{story.title}</h2>
              
              {story.paragraphs && story.paragraphs.length > 0 && (
                <div className="space-y-6 text-xl text-muted-foreground leading-relaxed">
                  {story.paragraphs.map((paragraph: string, index: number) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              )}
              
              {story.features && story.features.length > 0 && (
                <div className="mt-10 grid grid-cols-2 gap-6">
                  {story.features.map((feature: string, index: number) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                      <span className="font-medium text-lg">{feature}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="relative">
              {story.image && (
                <GlassCard className="animate-float">
                  <div className="aspect-video rounded-xl overflow-hidden mb-6">
                    <img 
                      src={story.image}
                      alt="Company Story"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </GlassCard>
              )}
              
              {story.satisfactionRate && (
                <GlassCard className="absolute -bottom-8 -left-8 p-6 animate-glow">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 gradient-secondary rounded-full flex items-center justify-center">
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">Customer Satisfaction</p>
                      <p className="text-3xl font-bold text-green-500">{story.satisfactionRate}</p>
                    </div>
                  </div>
                </GlassCard>
              )}
            </div>
          </section>
        )}

        {/* Services Section */}
        {services.length > 0 && (
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
              {services.map((service: any, index: number) => {
                const Icon = iconMap[service.icon] || Target;
                return (
                  <GlassCard key={index} className="group" hover>
                    <div className="flex items-start gap-6">
                      <div className="w-16 h-16 gradient-primary rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="h-8 w-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-4">{service.title}</h3>
                        <p className="text-lg text-muted-foreground mb-6">{service.description}</p>
                        {service.features && service.features.length > 0 && (
                          <ul className="space-y-2">
                            {service.features.map((feature: string, idx: number) => (
                              <li key={idx} className="flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="font-medium">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          </section>
        )}

        {/* Timeline / Milestones Section */}
        {milestones.length > 0 && (
          <section className="mb-24">
            <div className="text-center mb-16">
              <Badge className="gradient-primary text-white mb-6">
                <Calendar className="h-4 w-4 mr-2" />
                Our Journey
              </Badge>
              <h2 className="text-5xl font-bold mb-6">Years of Innovation</h2>
              <p className="text-2xl text-muted-foreground max-w-3xl mx-auto">
                From a startup dream to a global leader in POS technology
              </p>
            </div>
            
            <div className="relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-blue-500 to-teal-500 rounded-full"></div>
              <div className="space-y-12">
                {milestones.map((milestone: any, index: number) => (
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
        )}

        {/* Team Section */}
        {team.length > 0 && (
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
              {team.map((member: any, index: number) => (
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
        )}

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