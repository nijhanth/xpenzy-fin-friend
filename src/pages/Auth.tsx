import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { hasSupabaseConfig, supabase } from '@/integrations/supabase/client';
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
  | 'signup-otp'
  | 'forgot-email'
  | 'forgot-otp'
  | 'forgot-reset'
  | 'forgot-success';

const EMAIL_OTP_LENGTH = 6;

interface AuthProps {
  onAuthSuccess: () => void;
}

const AuthShell = ({ children, onHome }: { children: React.ReactNode; onHome: () => void }) => (
  <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_hsl(var(--primary)/.16),_transparent_42%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--secondary)/.55))] font-poppins">
    <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <button type="button" onClick={onHome} className="inline-flex flex-col items-center justify-center hover:opacity-80 transition-opacity">
            <FinanceLogo className="w-14 h-14 mb-2" />
            <span className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent tracking-tight">Xpenzy</span>
          </button>
          <p className="text-muted-foreground mt-2">Your money, made clearer. <span className="text-primary font-medium">Free, always.</span></p>
        </div>
        <div className="auth-card rounded-3xl p-6 sm:p-8 bg-card border border-border shadow-2xl shadow-primary/5">{children}</div>
        <p className="text-center mt-5 text-xs text-muted-foreground">Secure account access · No payment details needed</p>
      </div>
    </div>
  </div>
);

export const Auth = ({ onAuthSuccess }: AuthProps) => {
  const [searchParams] = useSearchParams();
  const requestedView = searchParams.get('mode');
  const [view, setView] = useState<View>(requestedView === 'signup' ? 'signup' : requestedView === 'signin' ? 'signin' : 'entry');

  // Sign in / sign up fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
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
  const requireSupabaseConfig = (field: string) => {
    if (hasSupabaseConfig) return true;
    const message = import.meta.env.DEV
      ? 'Supabase is not connected yet. Add your project URL and publishable key to .env.local, then restart the dev server.'
      : 'Supabase is not configured for this Lovable deployment. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the project environment, then rebuild and publish.';
    setErrors({ [field]: message });
    return false;
  };

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

  const startCooldown = (seconds = 120) => {
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
    if (!requireSupabaseConfig('form')) return;
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
          ? 'Invalid email or password. Please try again.'
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
    if (!requireSupabaseConfig('form')) return;
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
    try {
      const { error, user: signupUser, session } = await signUp(email.trim(), password, displayName.trim());
      const isExistingSignup = Boolean(
        error?.message.toLowerCase().includes('user already registered') || signupUser?.identities?.length === 0,
      );

      if (error && !isExistingSignup) {
        const code = 'code' in error ? String(error.code) : '';
        const friendly = code === 'email_address_not_authorized'
          ? 'Supabase blocked delivery to this address. Configure custom SMTP in Supabase Auth settings.'
          : code === 'over_email_send_rate_limit'
            ? 'Supabase email limit reached. Wait before requesting another code, or configure custom SMTP.'
            : error.message.includes('User already registered')
              ? 'An account with this email already exists'
              : error.message;
        setErrors({ form: friendly });
        toast({ variant: 'destructive', title: 'Sign Up Failed', description: friendly });
        return;
      }

      if (session) {
        toast({ title: 'Account created', description: 'Your email is verified and your account is ready.' });
        return;
      }

      if (isExistingSignup) {
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: email.trim(),
          options: { emailRedirectTo: window.location.origin + '/?confirmed=1' },
        });
        if (resendError) {
          const code = 'code' in resendError ? String(resendError.code) : '';
          const isConfirmed = resendError.message.toLowerCase().includes('already confirmed');
          const friendly = isConfirmed
            ? 'This email is already confirmed. Sign in or reset your password.'
            : code === 'over_email_send_rate_limit'
              ? 'A code was requested recently. Wait a while before trying again.'
              : resendError.message;
          setErrors({ form: friendly });
        toast({ variant: 'destructive', title: 'Could not resend code', description: friendly });
          return;
        }

        setSignupOtp('');
        startCooldown(120);
        goTo('signup-otp');
        toast({ title: 'Check your email', description: 'If this signup is still unverified, a new code has been sent.' });
        return;
      }

      if (!signupUser) {
        const friendly = 'We could not start signup. Please try again.';
        setErrors({ form: friendly });
        toast({ variant: 'destructive', title: 'Sign Up Failed', description: friendly });
        return;
      }

      setSignupOtp('');
      startCooldown(120);
      toast({ title: 'Check your email', description: `Enter the ${EMAIL_OTP_LENGTH}-digit code we emailed you to finish signing up.` });
      goTo('signup-otp');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Check your connection and try again.';
      setErrors({ form: message });
      toast({ variant: 'destructive', title: 'Sign Up Failed', description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupOtp.length !== EMAIL_OTP_LENGTH) {
      setErrors({ signupOtp: `Enter the ${EMAIL_OTP_LENGTH}-digit code from your email.` });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: signupOtp, type: 'email' });
      if (error) {
        setErrors({ signupOtp: 'That code is invalid or expired. Request a new code and try again.' });
        toast({ variant: 'destructive', title: 'Email verification failed', description: error.message });
        return;
      }
      toast({ title: 'Email verified', description: 'Your account is ready.' });
      onAuthSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Check your connection and try again.';
      setErrors({ signupOtp: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendSignupOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true);
    setErrors({});
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin + '/?confirmed=1' },
      });
      if (error) {
        setErrors({ signupOtp: error.message });
        toast({ variant: 'destructive', title: 'Could not resend code', description: error.message });
        return;
      }
      startCooldown(120);
      toast({ title: 'New code sent', description: 'Check your inbox and spam folder.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Check your connection and try again.';
      setErrors({ signupOtp: message });
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- Forgot Password: Send OTP ----------
  const sendResetOtp = async (emailToUse: string) => {
    if (!requireSupabaseConfig('resetEmail')) return false;
    const emailRes = emailSchema.safeParse(emailToUse);
    if (!emailRes.success) {
      setErrors({ resetEmail: emailRes.error.errors[0].message });
      return false;
    }

    setIsLoading(true);
    setErrors({});
    try {
      const { data: accountCheck, error: accountCheckError } = await supabase.functions.invoke('check-reset-account', {
        body: { email: emailToUse.trim() },
      });
      if (accountCheckError || typeof accountCheck?.exists !== 'boolean') {
        const message = 'We could not verify this account, so no code was sent. Please try again in a moment.';
        setErrors({ resetEmail: message });
        toast({ variant: 'destructive', title: 'Could not verify email', description: message });
        return false;
      }
      if (!accountCheck.exists) {
        const message = 'No account was found for this email address. Check the address or create an account.';
        setErrors({ resetEmail: message });
        toast({ variant: 'destructive', title: 'Account not found', description: message });
        return false;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(emailToUse.trim(), {
        redirectTo: window.location.origin + '/auth',
      });
      if (error) {
        const code = 'code' in error ? String(error.code) : '';
        const message = code === 'email_address_not_authorized'
          ? 'This Supabase project only sends email to organization members. Configure custom SMTP in Supabase Auth settings to email other users.'
          : code === 'over_email_send_rate_limit'
            ? 'Too many reset emails were requested. Wait a while before trying again.'
            : error.message;
        setErrors({ resetEmail: message });
        toast({ variant: 'destructive', title: 'Could not send reset email', description: message });
        return false;
      }

      startCooldown(120);
      toast({ title: 'Reset code sent', description: `Check your inbox and spam folder for the ${EMAIL_OTP_LENGTH}-digit code.` });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Check your connection and try again.';
      setErrors({ resetEmail: message });
      toast({ variant: 'destructive', title: 'Could not send reset email', description: message });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await sendResetOtp(resetEmail);
    if (ok) {
      setOtp('');
      goTo('forgot-otp');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    await sendResetOtp(resetEmail);
  };

  // ---------- Forgot Password: Verify OTP ----------
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== EMAIL_OTP_LENGTH) {
      setErrors({ otp: `Enter the ${EMAIL_OTP_LENGTH}-digit code` });
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

  // Stable layout component prevents form remounts while typing.
  const BackButton = ({ to }: { to: View }) => (
    <button
      type="button"
      onClick={() => (to === 'entry' ? navigate('/') : goTo(to))}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
    >
      <ArrowLeft className="h-4 w-4" /> Back
    </button>
  );

  // ---------- Views ----------
  if (view === 'entry') {
    return (
      <AuthShell onHome={() => navigate('/') }>
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
      </AuthShell>
    );
  }

  if (view === 'signin') {
    return (
      <AuthShell onHome={() => navigate('/')}>
        <BackButton to="entry" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Welcome back</h2>
        <p className="text-sm text-muted-foreground mb-6">Sign in to pick up where you left off.</p>
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
      </AuthShell>
    );
  }

  if (view === 'signup') {
    return (
      <AuthShell onHome={() => navigate('/')}>
        <BackButton to="entry" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Create your free account</h2>
        <p className="text-sm text-muted-foreground mb-6">Start organizing your finances in just a minute.</p>
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
            {isLoading ? 'Creating Account...' : 'Create free account'}
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
      </AuthShell>
    );
  }

  if (view === 'signup-otp') {
    return (
      <AuthShell onHome={() => navigate('/')}>
        <BackButton to="signup" />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2 text-center">Enter your email code</h2>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          We sent an {EMAIL_OTP_LENGTH}-digit verification code to <span className="font-medium text-foreground">{email}</span>. Enter it below to finish creating your account.
        </p>
        <form onSubmit={handleVerifySignupOtp} className="space-y-5" noValidate>
          <div className="flex justify-center">
            <InputOTP maxLength={EMAIL_OTP_LENGTH} value={signupOtp} onChange={setSignupOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
                <InputOTPSlot index={6} />
                <InputOTPSlot index={7} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {errors.signupOtp && <p className="text-sm text-destructive text-center">{errors.signupOtp}</p>}
          <Button type="submit" className="w-full" disabled={isLoading || signupOtp.length !== EMAIL_OTP_LENGTH}>
            {isLoading ? 'Verifying...' : 'Verify email and continue'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">Didn't get a code?{' '}
            <button type="button" onClick={handleResendSignupOtp} disabled={resendCooldown > 0 || isLoading} className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline">
              {resendCooldown > 0 ? 'Resend in ' + resendCooldown + 's' : 'Resend code'}
            </button>
          </p>
        </form>
      </AuthShell>
    );
  }

  if (view === 'forgot-email') {
    return (
      <AuthShell onHome={() => navigate('/')}>
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
      </AuthShell>
    );
  }

  if (view === 'forgot-otp') {
    return (
      <AuthShell onHome={() => navigate('/')}>
        <BackButton to="forgot-email" />
        <h2 className="text-2xl font-semibold text-foreground mb-2">Enter reset code</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Enter the {EMAIL_OTP_LENGTH}-digit code sent to <span className="font-medium text-foreground">{resetEmail}</span>.
        </p>
        <form onSubmit={handleVerifyOtp} className="space-y-5" noValidate>
          <div className="flex justify-center">
            <InputOTP maxLength={EMAIL_OTP_LENGTH} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
                <InputOTPSlot index={6} />
                <InputOTPSlot index={7} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {errors.otp && (
            <p className="text-sm text-destructive text-center">{errors.otp}</p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading || otp.length !== EMAIL_OTP_LENGTH}>
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
      </AuthShell>
    );
  }

  if (view === 'forgot-reset') {
    return (
      <AuthShell onHome={() => navigate('/')}>
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
      </AuthShell>
    );
  }

  if (view === 'forgot-success') {
    return (
      <AuthShell onHome={() => navigate('/')}>
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
      </AuthShell>
    );
  }

  return null;
};
