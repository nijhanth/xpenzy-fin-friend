import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  PiggyBank, 
  TrendingUp, 
  Coins, 
  DollarSign,
  BarChart3,
  Wallet,
  Target,
  CreditCard,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

interface AuthProps {
  onAuthSuccess: () => void;
}

// Floating Animation Component
const FloatingElement = ({ 
  icon: Icon, 
  className = "", 
  style = {},
  animationClass = "float-element"
}: { 
  icon: any; 
  className?: string; 
  style?: React.CSSProperties;
  animationClass?: string;
}) => (
  <div 
    className={`absolute opacity-20 text-primary ${animationClass} ${className}`}
    style={style}
  >
    <Icon size={24} />
  </div>
);

// Particle Component
const Particle = ({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) => (
  <div 
    className={`absolute w-2 h-2 bg-primary/30 rounded-full particle ${className}`}
    style={style}
  />
);

// Rupee Symbol Component
const RupeeSymbol = ({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) => (
  <div 
    className={`absolute text-2xl font-bold text-primary/20 float-element-delayed ${className}`}
    style={style}
  >
    ₹
  </div>
);

export const Auth = ({ onAuthSuccess }: AuthProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [activeTab, setActiveTab] = useState('login');

  const { signUp, signIn, resetPassword, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      onAuthSuccess();
    }
  }, [user, onAuthSuccess]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields"
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: error.message
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in."
      });
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword || !displayName) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Passwords do not match"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password must be at least 6 characters long"
      });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(email, password, displayName);
    
    if (error) {
      if (error.message.includes('User already registered')) {
        toast({
          variant: "destructive",
          title: "Account Exists",
          description: "An account with this email already exists. Please sign in instead."
        });
      } else {
        toast({
          variant: "destructive",
          title: "Sign Up Failed",
          description: error.message
        });
      }
    } else {
      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account."
      });
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your email address"
      });
      return;
    }

    setIsLoading(true);
    const { error } = await resetPassword(resetEmail);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Reset Failed",
        description: error.message
      });
    } else {
      toast({
        title: "Reset Email Sent",
        description: "Check your email for password reset instructions."
      });
      setActiveTab('login');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-auth-bg">
      {/* Animated Background Waves */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-wave-1 rounded-full blur-3xl wave-1" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-gradient-wave-2 rounded-full blur-3xl wave-2" />
        <div className="absolute -bottom-32 left-1/4 w-64 h-64 bg-gradient-wave-3 rounded-full blur-3xl wave-3" />
      </div>

      {/* Floating Finance Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top Left Quadrant */}
        <FloatingElement icon={PiggyBank} className="top-20 left-16" />
        <FloatingElement icon={TrendingUp} className="top-32 left-32" animationClass="float-element-delayed" />
        <FloatingElement icon={Coins} className="top-48 left-8" animationClass="float-element-slow" />
        <RupeeSymbol className="top-24 left-24" />
        
        {/* Top Right Quadrant */}
        <FloatingElement icon={BarChart3} className="top-16 right-20" animationClass="float-element-delayed" />
        <FloatingElement icon={Wallet} className="top-36 right-8" />
        <FloatingElement icon={Target} className="top-52 right-24" animationClass="float-element-slow" />
        <RupeeSymbol className="top-28 right-16" />
        
        {/* Bottom Left Quadrant */}
        <FloatingElement icon={CreditCard} className="bottom-32 left-12" animationClass="float-element-slow" />
        <FloatingElement icon={DollarSign} className="bottom-48 left-28" />
        <FloatingElement icon={ArrowUpRight} className="bottom-16 left-40" animationClass="float-element-delayed" />
        <RupeeSymbol className="bottom-36 left-20" />
        
        {/* Bottom Right Quadrant */}
        <FloatingElement icon={Sparkles} className="bottom-20 right-32" />
        <FloatingElement icon={TrendingUp} className="bottom-40 right-12" animationClass="float-element-delayed" />
        <FloatingElement icon={PiggyBank} className="bottom-56 right-28" animationClass="float-element-slow" />
        <RupeeSymbol className="bottom-24 right-20" />
        
        {/* Center Floating Elements */}
        <FloatingElement icon={Coins} className="top-1/4 left-1/2 transform -translate-x-1/2" animationClass="float-element-delayed" />
        <FloatingElement icon={Wallet} className="bottom-1/4 left-1/3" animationClass="float-element-slow" />
        
        {/* Animated Particles */}
        <Particle className="top-1/6 left-1/5" />
        <Particle className="top-1/3 right-1/4 particle-delayed" />
        <Particle className="bottom-1/5 left-1/3" />
        <Particle className="bottom-1/3 right-1/5 particle-delayed" />
        <Particle className="top-2/3 left-1/6" />
        <Particle className="top-1/2 right-1/6 particle-delayed" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-scale-in">
          {/* App Logo Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-2xl shadow-float pulse-glow mb-4">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Xpenzy
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Smart Finance Management
            </p>
          </div>

          {/* Glass Morphism Login Card */}
          <div className="glass-card rounded-2xl p-8 backdrop-blur-xl">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-sm">
                <TabsTrigger 
                  value="login"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Sign Up
                </TabsTrigger>
                <TabsTrigger 
                  value="reset"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Reset
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-6">
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-foreground/90">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="pl-10 bg-white/10 backdrop-blur-sm border-white/20 focus:border-primary/50 focus:bg-white/20"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-foreground/90">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="pl-10 pr-10 bg-white/10 backdrop-blur-sm border-white/20 focus:border-primary/50 focus:bg-white/20"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 transform hover:scale-105" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-foreground/90">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your full name"
                        className="pl-10 bg-white/10 backdrop-blur-sm border-white/20 focus:border-primary/50 focus:bg-white/20"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-foreground/90">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="pl-10 bg-white/10 backdrop-blur-sm border-white/20 focus:border-primary/50 focus:bg-white/20"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-foreground/90">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        className="pl-10 pr-10 bg-white/10 backdrop-blur-sm border-white/20 focus:border-primary/50 focus:bg-white/20"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff /> : <Eye />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-foreground/90">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="pl-10 pr-10 bg-white/10 backdrop-blur-sm border-white/20 focus:border-primary/50 focus:bg-white/20"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff /> : <Eye />}
                      </button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 transform hover:scale-105" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="reset" className="mt-6">
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-foreground/90">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="pl-10 bg-white/10 backdrop-blur-sm border-white/20 focus:border-primary/50 focus:bg-white/20"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300 transform hover:scale-105" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending Reset Email..." : "Send Reset Email"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Footer */}
          <div className="text-center mt-6 text-muted-foreground">
            <p className="text-sm">
              Your financial journey starts here ✨
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};