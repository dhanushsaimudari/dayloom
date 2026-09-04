import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Sparkles, Shield, HeartHandshake, BrainCircuit, ArrowRight, AlertCircle } from 'lucide-react';

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Forgot Password Flow States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  const { login, signup, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();

  const getFriendlyErrorMessage = (err) => {
    const msg = err.message || '';
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    if (msg.includes('auth/email-already-in-use')) {
      return 'This email address is already registered. Please sign in instead.';
    }
    if (msg.includes('auth/weak-password')) {
      return 'Password should be at least 6 characters long.';
    }
    if (msg.includes('auth/invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (msg.includes('auth/too-many-requests')) {
      return 'Too many attempts. Please wait a few moments and try again.';
    }
    if (msg.includes('auth/account-exists-with-different-credential')) {
      return "This email is registered with Google Sign-In. Please click 'Continue with Google' to sign in.";
    }
    if (msg.includes('auth/popup-closed-by-user') || msg.includes('auth/cancelled-popup-request')) {
      return 'Google sign-in popup was closed before completing. Please try again.';
    }
    if (msg.includes('auth/popup-blocked')) {
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
    }
    return msg || 'Authentication failed. Please check your connection and try again.';
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      if (!forgotEmail || !forgotEmail.trim()) {
        throw new Error('Please enter your email address.');
      }
      await resetPassword(forgotEmail.trim());
      setForgotSuccess(`Password reset email sent to ${forgotEmail.trim()}! Please check your inbox for instructions.`);
    } catch (err) {
      setForgotError(getFriendlyErrorMessage(err));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        sessionStorage.setItem('dayloom_new_signup', 'true');
        await signup(email, password);
        navigate('/onboarding');
      } else {
        sessionStorage.removeItem('dayloom_new_signup');
        await login(email, password);
        navigate('/dashboard');
      }
    } catch (err) {
      sessionStorage.removeItem('dayloom_new_signup');
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const res = await loginWithGoogle();
      const isNewGoogleUser = res.user?.metadata?.creationTime && res.user?.metadata?.lastSignInTime
        ? Math.abs(new Date(res.user.metadata.creationTime).getTime() - new Date(res.user.metadata.lastSignInTime).getTime()) < 3000
        : false;
      const isCompleted = res.profileData?.settings?.onboardingCompleted === true || res.profileData?.userData?.onboardingCompleted === true;

      if (isNewGoogleUser && !isCompleted) {
        sessionStorage.setItem('dayloom_new_signup', 'true');
        navigate('/onboarding');
      } else {
        sessionStorage.removeItem('dayloom_new_signup');
        navigate('/dashboard');
      }
    } catch (err) {
      sessionStorage.removeItem('dayloom_new_signup');
      setError(getFriendlyErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '85vh', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
      <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
        
        {/* Product Brand Vision Column */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 1rem', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid var(--primary-accent)', borderRadius: 'var(--radius-full)', color: 'var(--primary-accent)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.5rem' }}>
            <Sparkles size={16} />
            <span>Personal Growth Intelligence</span>
          </div>

          <h1 style={{ fontSize: '3rem', lineHeight: 1.15, marginBottom: '0.75rem', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Dayloom
          </h1>

          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6, fontStyle: 'italic' }}>
            "Your days are threads. Your life is the pattern."
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(99, 102, 241, 0.15)', borderRadius: 'var(--radius-md)', color: 'var(--primary-accent)' }}>
                <BrainCircuit size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Low Effort (~10s) Check-In & Brain Dump</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Quick daily check-ins, habit tracking, or raw Brain Dump free writing.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(20, 184, 166, 0.15)', borderRadius: 'var(--radius-md)', color: 'var(--secondary-accent)' }}>
                <HeartHandshake size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Grounded AI Companion (Reflectra)</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Reflectra strictly separates observed data from interpretation. No fabricated facts.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(245, 158, 11, 0.15)', borderRadius: 'var(--radius-md)', color: 'var(--warning-color)' }}>
                <Shield size={20} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Diarium History & Memento Memories</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Explore your memory map with 24-hour edit windows & audit versioning.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Form Glass Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--surface-border)', padding: '0.35rem', borderRadius: 'var(--radius-md)', marginBottom: '1.75rem' }}>
            <button
              type="button"
              className="btn"
              style={{ flex: 1, padding: '0.6rem', background: !isSignup ? 'var(--primary-gradient)' : 'transparent', color: !isSignup ? '#fff' : 'var(--text-secondary)' }}
              onClick={() => { setIsSignup(false); setError(''); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className="btn"
              style={{ flex: 1, padding: '0.6rem', background: isSignup ? 'var(--primary-gradient)' : 'transparent', color: isSignup ? '#fff' : 'var(--text-secondary)' }}
              onClick={() => { setIsSignup(true); setError(''); }}
            >
              Sign Up
            </button>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            {isSignup ? 'Create Your Dayloom Account' : 'Welcome Back to Dayloom'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {isSignup ? 'Start weaving your days into a meaningful life pattern.' : 'Sign in to access your Diarium history & Reflectra reflections.'}
          </p>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger-color)', borderRadius: 'var(--radius-md)', color: 'var(--danger-color)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-In Option */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="btn"
            style={{
              width: '100%',
              padding: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontWeight: 500,
              fontSize: '0.95rem',
              cursor: 'pointer',
              marginBottom: '1.25rem',
              transition: 'background 0.2s ease, border-color 0.2s ease'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--surface-border)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or with email</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--surface-border)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Password
                </label>
                {!isSignup && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotError('');
                      setForgotSuccess('');
                      setShowForgotModal(true);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-accent)', fontSize: '0.8rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', marginTop: '0.5rem' }} disabled={loading || googleLoading}>
              {loading ? 'Processing...' : (isSignup ? 'Create Dayloom Account' : 'Sign In')}
              <ArrowRight size={18} />
            </button>
          </form>
        </div>

      </div>

      {/* Forgot Password Modal Dialog */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary-accent)' }}>
                <Sparkles size={22} />
                <h3 style={{ fontSize: '1.25rem' }}>Reset Your Password</h3>
              </div>
              <button onClick={() => setShowForgotModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Enter your registered Dayloom email address below. We'll send you an official Firebase password reset link.
            </p>

            {forgotSuccess && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success-color)', borderRadius: 'var(--radius-md)', color: 'var(--success-color)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                {forgotSuccess}
              </div>
            )}

            {forgotError && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger-color)', borderRadius: 'var(--radius-md)', color: 'var(--danger-color)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                {forgotError}
              </div>
            )}

            {!forgotSuccess ? (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForgotModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={forgotLoading}>
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-primary" onClick={() => setShowForgotModal(false)}>
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
