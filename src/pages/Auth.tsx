import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { FinanceLogo } from '@/components/ui/finance-logo';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User
} from 'lucide-react';

interface AuthProps {
  onAuthSuccess: () => void;
}

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-poppins">
      {/* Static Finance Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(45deg, hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(-45deg, hsl(var(--accent)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Subtle Static Finance Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-20 left-20 w-32 h-32 border border-primary/30 rounded-full" />
        <div className="absolute top-40 right-32 w-24 h-24 border border-accent/30 rounded-lg" />
        <div className="absolute bottom-32 left-40 w-28 h-28 border border-primary/30 rounded-full" />
        <div className="absolute bottom-20 right-20 w-36 h-36 border border-accent/30 rounded-lg" />
        <div className="absolute top-1/2 left-1/4 w-20 h-20 border border-primary/30 rounded-full" />
        <div className="absolute top-1/3 right-1/3 w-26 h-26 border border-accent/30 rounded-lg" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* App Logo Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <FinanceLogo className="w-20 h-20" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent font-poppins tracking-tight">
              Xpenzy
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Smart Finance Management
            </p>
          </div>

          {/* Clean Auth Card */}
          <div className="rounded-2xl p-8 bg-card/90 backdrop-blur-sm border border-border shadow-xl">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 bg-muted">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                <TabsTrigger value="reset">Reset</TabsTrigger>
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
                        className="pl-10"
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
                        className="pl-10 pr-10"
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
                    className="w-full" 
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
                        className="pl-10"
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
                        className="pl-10"
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
                        className="pl-10 pr-10"
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
                        className="pl-10 pr-10"
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
                        className="pl-10"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
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