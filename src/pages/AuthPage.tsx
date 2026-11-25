import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user, loading, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard';

  // Redirect to target or dashboard if authenticated
  React.useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [loading, user, from, navigate]);

  // Show loading indicator while auth is initializing
  if (loading && !user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300">Loading JUPEB Orbit...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      if (isForgotPassword) {
        await resetPassword(email);
        setMessage('Password reset email sent! Please check your inbox.');
      } else if (isSignUp) {
        if (!username.trim()) {
          setError('Please enter your full name or nickname.');
          setSubmitting(false);
          return;
        }
        await signUpWithEmail(email, password, username);
        navigate('/onboarding');
      } else {
        await signInWithEmail(email, password);
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else if (e.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please log in.');
      } else if (e.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(e.message || 'Authentication failed. Please check your network.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-[2.5rem] shadow-2xl p-6 sm:p-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-display font-black text-lg shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              JO
            </div>
            <span className="font-display font-black text-xl text-slate-900 dark:text-white">
              JUPEB <span className="text-brand-600 dark:text-brand-400">ORBIT</span>
            </span>
          </Link>

          <h2 className="font-display font-black text-2xl text-slate-900 dark:text-white">
            {isForgotPassword 
              ? 'Reset Password' 
              : isSignUp 
                ? 'Create Candidate Account' 
                : 'Welcome Back'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isForgotPassword
              ? 'Enter your email to receive recovery instructions'
              : isSignUp
                ? 'Begin your structured route to 16 points'
                : 'Enter your credentials to enter your cockpit'}
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 flex items-start gap-3 text-rose-700 dark:text-rose-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 flex items-start gap-3 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && !isForgotPassword && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name / Nickname
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. David Adeleke"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@orbit.edu.ng"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {!isForgotPassword && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setError(''); setMessage(''); }}
                    className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isForgotPassword ? (
              'Send Recovery Link'
            ) : isSignUp ? (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Enter Cockpit</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer switch */}
        <div className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
          {isForgotPassword ? (
            <button
              onClick={() => { setIsForgotPassword(false); setError(''); setMessage(''); }}
              className="font-bold text-brand-600 dark:text-brand-400 hover:underline"
            >
              Back to Sign In
            </button>
          ) : isSignUp ? (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => { setIsSignUp(false); setError(''); }}
                className="font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => { setIsSignUp(true); setError(''); }}
                className="font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Create One
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

