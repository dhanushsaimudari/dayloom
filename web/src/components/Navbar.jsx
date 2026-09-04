import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Sparkles, LayoutDashboard, MessageSquareText, Calendar, BarChart3, User, Moon, Sun, LogOut } from 'lucide-react';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const isOnboarding = location.pathname === '/onboarding';
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <Link to={isOnboarding ? "/onboarding" : "/dashboard"} className="nav-brand">
        <Sparkles className="w-6 h-6 text-indigo-400" />
        <span>Dayloom</span>
      </Link>

      <div className="nav-links">
        {!isOnboarding && (
          <>
            <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Home</span>
            </Link>

            <Link to="/chat" className={`nav-link ${isActive('/chat') ? 'active' : ''}`}>
              <MessageSquareText size={18} />
              <span>Reflectra</span>
            </Link>

            <Link to="/calendar" className={`nav-link ${isActive('/calendar') ? 'active' : ''}`}>
              <Calendar size={18} />
              <span>Diarium</span>
            </Link>

            <Link to="/analytics" className={`nav-link ${isActive('/analytics') ? 'active' : ''}`}>
              <BarChart3 size={18} />
              <span>Insights</span>
            </Link>

            <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`}>
              <User size={18} />
              <span>Profile</span>
            </Link>
          </>
        )}

        <button onClick={toggleTheme} className="nav-link" title="Toggle Light/Dark Theme" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
          {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-400" />}
        </button>

        <button onClick={() => { logout(); navigate('/auth'); }} className="nav-link text-red-400" title="Logout" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
}
