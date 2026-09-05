import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Navbar from './components/Navbar.jsx';
import AuthPage from './pages/AuthPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import { Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import { isFirebaseConfigured } from './services/firebase.js';

function FirebaseConfigWarning() {
  return (
    <div className="loading-screen" style={{ padding: '2rem', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-card" style={{ maxWidth: '540px', margin: '0 auto', padding: '2.5rem', textAlign: 'left', border: '1px solid rgba(239, 68, 68, 0.35)', background: 'var(--bg-card, rgba(255, 255, 255, 0.95))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#ef4444' }}>
          <AlertTriangle size={28} />
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            Firebase Configuration Missing
          </h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Dayloom’s web client was built without Firebase credentials (<code>VITE_FIREBASE_API_KEY</code>).
          Because Vite compiles environment variables into the static bundle at build time, client authentication cannot start.
        </p>
        <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: '8px', padding: '1rem', fontSize: '0.85rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
          <strong>How to fix:</strong>
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li>Compile the frontend locally with your <code>web/.env</code> file (<code>npm run build</code> inside <code>web/</code>).</li>
            <li>Re-deploy your container using Docker / Cloud Run without layer cache (<code>--no-cache</code>).</li>
          </ul>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => window.location.reload()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={16} />
          <span>Reload Dayloom</span>
        </button>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Dayloom ErrorBoundary caught]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="loading-screen" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="glass-card" style={{ maxWidth: '480px', margin: '0 auto', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Something went sideways</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Dayloom ran into a small hiccup. Your data is safe.
            </p>
            <button 
              className="btn btn-primary" 
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/dashboard'; }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={16} />
              <span>Reload Dayloom</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }) {
  const { currentUser, loading, userSettings } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          <Sparkles size={18} className="text-indigo-400" />
          <span>Weaving your Dayloom thread...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  const isOnboarded = userSettings?.onboardingCompleted === true;
  const isOnboardingPath = location.pathname === '/onboarding';

  // If user has not completed onboarding and is not yet on /onboarding, redirect to /onboarding
  if (userSettings && !isOnboarded && !isOnboardingPath) {
    return <Navigate to="/onboarding" replace />;
  }

  // If user has completed onboarding and attempts to visit /onboarding, redirect to /dashboard
  if (isOnboarded && isOnboardingPath) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function PublicAuthRoute() {
  const { currentUser, loading, userSettings } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (currentUser) {
    const isOnboarded = userSettings?.onboardingCompleted === true;
    if (userSettings && !isOnboarded) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <AuthPage />;
}

export default function App() {
  if (!isFirebaseConfigured) {
    return <FirebaseConfigWarning />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
              <div className="app-container">
                <Navbar />
                <Routes>
                  <Route path="/auth" element={<PublicAuthRoute />} />
                  <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                  <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                  <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
                  <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
