import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { FinanceLogo } from '@/components/ui/finance-logo';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { z } from 'zod';

// Validation schemas
const emailSchema = z.string().trim().email('Invalid email format').max(255);
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters');
const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters');

type View =
  | 'entry'
  | 'signin'
  | 'signup'
  | 'forgot-email'
  | 'forgot-otp'
  | 'forgot-reset'
  | 'forgot-success';

interface AuthProps {
  onAuthSuccess: () => void;
}

export const Auth = ({ onAuthSuccess }: AuthProps) => {
  const [view, setView] = useState<View>('entry');

  // Sign in / sign up fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Inline errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<number | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signUp, signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && view !== 'forgot-reset' && view !== 'forgot-success') {
      onAuthSuccess();
    }
  }, [user, view, onAuthSuccess]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) window.clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = (seconds = 45) => {
    setResendCooldown(seconds);
    if (cooldownRef.current) window.clearInterval(cooldownRef.current);
    cooldownRef.current = window.setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          if (cooldownRef.current) window.clearInterval(cooldownRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const goTo = (next: View) => {
    setErrors({});
    setView(next);
  };

  // ---------- Sign In ----------
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors: Record<string, string> = {};
    const emailRes = emailSchema.safeParse(email);
    if (!emailRes.success) fieldErrors.email = emailRes.error.errors[0].message;
    if (!password) fieldErrors.password = 'Password is required';
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;

    setIsLoading(true);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      const msg = error.message || '';
      const friendly =
        msg.toLowerCase().includes('invalid')
          ? 'Incorrect email or password'
          : msg;
      setErrors({ form: friendly });
      toast({ variant: 'destructive', title: 'Sign In Failed', description: friendly });
    } else {
      toast({ title: 'Welcome back!', description: 'You have successfully signed in.' });
    }
    setIsLoading(false);
  };

  // ---------- Sign Up ----------
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors: Record<string, string> = {};
    const nameRes = nameSchema.safeParse(displayName);
    const emailRes = emailSchema.safeParse(email);
    const passRes = passwordSchema.safeParse(password);
    if (!nameRes.success) fieldErrors.name = nameRes.error.errors[0].message;
    if (!emailRes.success) fieldErrors.email = emailRes.error.errors[0].message;
    if (!passRes.success) fieldErrors.password = passRes.error.errors[0].message;
    if (password !== confirmPassword) fieldErrors.confirmPassword = 'Passwords do not match';
    if (!acceptTerms) fieldErrors.terms = 'You must accept the terms';
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;

    setIsLoading(true);
    const { error } = await signUp(email.trim(), password, displayName.trim());
    if (error) {
      const friendly = error.message.includes('User already registered')
        ? 'An account with this email already exists'
        : error.message;
      setErrors({ form: friendly });
      toast({ variant: 'destructive', title: 'Sign Up Failed', description: friendly });
    } else {
      toast({
        title: 'Account Created!',
        description: 'Check your email to verify your account.',
      });
      goTo('signin');
    }
    setIsLoading(false);
  };

  // ---------- Forgot Password: Send OTP ----------
  const sendResetOtp = async (emailToUse: string) => {
    const emailRes = emailSchema.safeParse(emailToUse);
    if (!emailRes.success) {
      setErrors({ resetEmail: emailRes.error.errors[0].message });
      return false;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(emailToUse.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    setIsLoading(false);
    if (error) {
      setErrors({ resetEmail: error.message });
      toast({ variant: 'destructive', title: 'Could not send code', description: error.message });
      return false;
    }
    startCooldown(45);
    toast({
      title: 'Verification code sent',
      description: 'Check your email for the 6-digit code.',
    });
    return true;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await sendResetOtp(resetEmail);
    if (ok) goTo('forgot-otp');
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    await sendResetOtp(resetEmail);
  };

  // ---------- Forgot Password: Verify OTP ----------
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setErrors({ otp: 'Enter the 6-digit code' });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: resetEmail.trim(),
      token: otp,
      type: 'recovery',
    });
    setIsLoading(false);
    if (error) {
      setErrors({ otp: 'Invalid or expired code' });
      toast({ variant: 'destructive', title: 'Verification failed', description: error.message });
      return;
    }
    goTo('forgot-reset');
  };

  // ---------- Forgot Password: Set New Password ----------
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const fieldErrors: Record<string, string> = {};
    const passRes = passwordSchema.safeParse(newPassword);
    if (!passRes.success) fieldErrors.newPassword = passRes.error.errors[0].message;
    if (newPassword !== confirmNewPassword)
      fieldErrors.confirmNewPassword = 'Passwords do not match';
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsLoading(false);
    if (error) {
      setErrors({ form: error.message });
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
      return;
    }
    // Sign out so user logs in fresh with new password
    await supabase.auth.signOut();
    setOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
    goTo('forgot-success');
  };

  // ---------- Layout helpers ----------
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-poppins">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(45deg, hsl(var(--primary)) 1px, transparent 1px), linear-gradient(-45deg, hsl(var(--accent)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <button
              onClick={() => navigate('/')}
              className="inline-flex flex-col items-center justify-center mb-4 hover:opacity-80 transition-opacity"
            >
              <FinanceLogo className="w-20 h-20 mb-2" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent tracking-tight">
                Xpenzy
              </h1>
            </button>
            <p className="text-muted-foreground mt-2 text-lg">Smart Finance Management</p>
          </div>

          <div className="rounded-2xl p-8 bg-card/90 backdrop-blur-sm border border-border shadow-xl">
            {children}
          </div>

          <div className="text-center mt-6 text-muted-foreground">
            <p className="text-sm">Your financial journey starts here ✨</p>
          </div>
        </div>
      </div>
    </div>
  );

  const BackButton = ({ to }: { to: View }) => (
    <button
      type="button"
      onClick={() => goTo(to)}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
    >
      <ArrowLeft className="h-4 w-4" /> Back
    </button>
  );

  // ---------- Views ----------
  if (view === 'entry') {
    return (
      <Shell>
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-center text-foreground">Welcome</h2>
          <p className="text-center text-muted-foreground text-sm">
            Sign in or create an account to continue
          </p>
          <Button className="w-full mt-6" onClick={() => goTo('signin')}>
            Sign In
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => goTo('signup')}
          >
            Sign Up
          </Button>
        </div>
      </Shell>
    );
  }

  if (view === 'signin') {
    return (
      <Shell>
        <BackButton to="entry" />
        <h2 className="text-2xl font-semibold text-foreground mb-6">Sign In</h2>
        <form onSubmit={handleSignIn} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="login-password">Password</Label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  goTo('forgot-email');
                }}
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="pl-10 pr-10"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="keep-signed"
              checked={keepSignedIn}
              onCheckedChange={(c) => setKeepSignedIn(!!c)}
            />
            <Label htmlFor="keep-signed" className="text-sm text-muted-foreground cursor-pointer">
              Keep me signed in
            </Label>
          </div>

          {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => goTo('signup')}
              className="text-primary hover:underline font-medium"
            >
              Sign up
            </button>
          </p>
        </form>
      </Shell>
    );
  }

  if (view === 'signup') {
    return (
      <Shell>
        <BackButton to="entry" />
        <h2 className="text-2xl font-semibold text-foreground mb-6">Create Account</h2>
        <form onSubmit={handleSignUp} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="signup-name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="pl-10 pr-10"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="pl-10 pr-10"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="flex items-start gap-2 pt-1">
            <Checkbox
              id="terms"
              checked={acceptTerms}
              onCheckedChange={(c) => setAcceptTerms(!!c)}
            />
            <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer leading-tight">
              I agree to the Terms & Conditions and Privacy Policy
            </Label>
          </div>
          {errors.terms && <p className="text-sm text-destructive">{errors.terms}</p>}
          {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => goTo('signin')}
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </button>
          </p>
        </form>
      </Shell>
    );
  }

  if (view === 'forgot-email') {
    return (
      <Shell>
        <BackButton to="signin" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Forgot Password</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your email and we'll send you a verification code.
        </p>
        <form onSubmit={handleSendOtp} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="you@example.com"
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            {errors.resetEmail && (
              <p className="text-sm text-destructive">{errors.resetEmail}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send OTP'}
          </Button>
        </form>
      </Shell>
    );
  }

  if (view === 'forgot-otp') {
    return (
      <Shell>
        <BackButton to="forgot-email" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Verify Code</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Enter the 6-digit code sent to{' '}
          <span className="text-foreground font-medium">{resetEmail}</span>
        </p>
        <form onSubmit={handleVerifyOtp} className="space-y-5" noValidate>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {errors.otp && (
            <p className="text-sm text-destructive text-center">{errors.otp}</p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
            {isLoading ? 'Verifying...' : 'Verify Code'}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Didn't get a code?{' '}
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0 || isLoading}
              className="text-primary hover:underline font-medium disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      </Shell>
    );
  }

  if (view === 'forgot-reset') {
    return (
      <Shell>
        <div className="flex items-center gap-2 mb-4 text-primary">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-sm font-medium">Code verified</span>
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Set New Password</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Choose a strong password you haven't used before.
        </p>
        <form onSubmit={handleSetNewPassword} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="pl-10 pr-10"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-sm text-destructive">{errors.newPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-new-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Re-enter password"
                className="pl-10 pr-10"
                disabled={isLoading}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.confirmNewPassword && (
              <p className="text-sm text-destructive">{errors.confirmNewPassword}</p>
            )}
          </div>

          {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </Shell>
    );
  }

  if (view === 'forgot-success') {
    return (
      <Shell>
        <div className="text-center space-y-4 py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">
            Password updated successfully
          </h2>
          <p className="text-sm text-muted-foreground">
            You can now sign in with your new password.
          </p>
          <Button
            className="w-full mt-2"
            onClick={() => {
              setPassword('');
              goTo('signin');
            }}
          >
            Go to Login
          </Button>
        </div>
      </Shell>
    );
  }

  return null;
};
