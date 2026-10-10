import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceLogo } from '@/components/ui/finance-logo';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { 
  TrendingUp, 
  PieChart, 
  BarChart3, 
  DollarSign, 
  Smartphone, 
  Zap,
  Target,
  ArrowRight,
  CheckCircle,
  Download
} from 'lucide-react';
import financeHero from '@/assets/finance-chart-hero.jpg';
import financeDashboard from '@/assets/finance-dashboard-bg.jpg';

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  // Redirect to app if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate('/app');
    }
  }, [user, loading, navigate]);

  const handleInstall = async () => {
    await promptInstall();
  };

  const features = [
    {
      icon: TrendingUp,
      title: "Smart Analytics",
      description: "Advanced insights into your spending patterns and financial trends with AI-powered recommendations."
    },
    {
      icon: PieChart,
      title: "Portfolio Tracking",
      description: "Monitor your investments, savings, and expenses in real-time with beautiful, interactive charts."
    },
    {
      icon: Smartphone,
      title: "Mobile First",
      description: "Seamlessly manage your finances on any device with our responsive, mobile-optimized interface."
    },
    {
      icon: Target,
      title: "Goal Planning",
      description: "Set and track financial goals with intelligent budget recommendations and progress monitoring."
    },
    {
      icon: Zap,
      title: "Real-Time Sync",
      description: "Instant updates across all your devices with cloud synchronization and offline support."
    }
  ];

  const stats = [
    { value: "Free", label: "No subscription" },
    { value: "$0", label: "No payment required" },
    { value: "Always", label: "No trial period" },
  ];

    return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FinanceLogo className="w-10 h-10" />
              <h1 className="text-2xl font-bold font-poppins tracking-tight">
                Xpenzy
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {(isInstallable || isInstalled) && (
                <Button 
                  variant="outline" 
                  onClick={handleInstall}
                  disabled={isInstalled}
                  className="font-medium"
                >
                  {isInstalled ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Installed
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Install App
                    </>
                  )}
                </Button>
              )}
              <Button 
                variant="ghost" 
                onClick={() => navigate('/auth')}
                className="font-medium"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90 font-medium"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-primary/5"></div>
        <div className="container mx-auto px-6 py-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <Badge variant="secondary" className="w-fit">
                <Zap className="w-4 h-4 mr-2" />
                Personal finance, made simple
              </Badge>
              
              <div className="space-y-6">
                <h1 className="text-5xl lg:text-6xl font-bold font-poppins leading-tight">
                  A clearer view of your
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {" "}finances
                  </span>
                </h1>
                
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Track spending, plan budgets, and understand where your money goes with one calm, easy-to-use workspace.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/auth')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg group"
                >
                  Get started — it’s free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>

              <div className="flex items-center gap-8 pt-4">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="relative z-10">
                <img 
                  src={financeHero} 
                  alt="Financial Dashboard Preview" 
                  className="w-full h-auto rounded-2xl shadow-2xl"
                />
              </div>
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl opacity-50"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Features
            </Badge>
            <h2 className="text-4xl font-bold font-poppins mb-4">
              Everything You Need to Manage Your Finances
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools and insights designed to simplify your financial life and help you make smarter decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card border-border hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-8">
                  <div className="mb-6">
                    <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <feature.icon className="w-7 h-7 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-4 font-poppins">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent"></div>
        <div className="container mx-auto px-6 relative">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              Dashboard
            </Badge>
            <h2 className="text-4xl font-bold font-poppins mb-4">
              Beautiful, Intuitive Interface
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience a clean, modern dashboard that makes complex financial data easy to understand and act upon.
            </p>
          </div>

          <div className="relative max-w-6xl mx-auto">
            <img 
              src={financeDashboard} 
              alt="Dashboard Interface" 
              className="w-full h-auto rounded-2xl shadow-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent rounded-2xl"></div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl lg:text-5xl font-bold font-poppins">
              Ready to Transform Your Finances?
            </h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to organize your money, with no subscription and no payment details required.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-12 py-6 text-lg group"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            <div className="flex items-center justify-center gap-6 pt-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary" />
                No credit card required
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary" />
                Free to use, always
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary" />
                No card required
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-card border-t border-border">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <FinanceLogo className="w-8 h-8" />
                <h3 className="text-xl font-bold font-poppins">Xpenzy</h3>
              </div>
              <p className="text-muted-foreground">
                Empowering individuals and businesses to make smarter financial decisions through intelligent technology.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Free to use</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Integrations</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Status</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-12 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 Xpenzy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
