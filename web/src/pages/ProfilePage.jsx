import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { updateUserSettings, deleteUserAccount } from '../services/api.js';
import { getAvailableThemes } from '../services/themeConfig.js';
import ReAuthModal from '../components/ReAuthModal.jsx';
import { User, Settings, Palette, Shield, Trash2, Save, Plus, Moon, Sun, CheckCircle2, AlertCircle } from 'lucide-react';

import { useToast } from '../context/ToastContext.jsx';

export default function ProfilePage() {
  const { currentUser, userSettings, setUserSettings, logout, refreshProfile } = useAuth();
  const { theme, setTheme, wallpaper, changeWallpaper } = useTheme();
  const { showToast } = useToast();

  const [habits, setHabits] = useState(userSettings?.habits || ["Gym 30m", "Yoga 15m", "Practice coding 20m", "Meditation 10m"]);
  const [newHabit, setNewHabit] = useState('');
  const [prefTime, setPrefTime] = useState(userSettings?.prefTime || '21:00');
  const [language, setLanguage] = useState(userSettings?.language || 'en');
  const [displayName, setDisplayName] = useState(currentUser?.displayName || userSettings?.displayName || 'Personal Journaler');
  const [gender, setGender] = useState(userSettings?.gender || '');
  
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const availableThemes = getAvailableThemes();

  useEffect(() => {
    if (userSettings) {
      if (userSettings.habits) setHabits(userSettings.habits);
      if (userSettings.prefTime) setPrefTime(userSettings.prefTime);
      if (userSettings.language) setLanguage(userSettings.language);
      if (userSettings.displayName) setDisplayName(userSettings.displayName);
      if (userSettings.gender) setGender(userSettings.gender);
    }
  }, [userSettings]);

  const handleAddHabit = (e) => {
    e.preventDefault();
    if (newHabit.trim() && !habits.includes(newHabit.trim())) {
      setHabits([...habits, newHabit.trim()]);
      setNewHabit('');
    }
  };

  const handleRemoveHabit = (habitToRemove) => {
    setHabits(habits.filter(h => h !== habitToRemove));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const newSettings = {
        habits,
        prefTime,
        language,
        theme,
        wallpaperURL: wallpaper,
        displayName,
        gender
      };

      await updateUserSettings(newSettings);
      setUserSettings(prev => ({ ...prev, ...newSettings }));
      await refreshProfile();
      showToast('Profile & Dayloom preferences updated successfully!', 'success');
    } catch (err) {
      showToast('Save failed: ' + (err.message || 'Check your connection and try again.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccountConfirmed = async () => {
    try {
      showToast('Deleting account & purging personal data...', 'info');
      await deleteUserAccount();
      showToast('Account deleted successfully.', 'success');
      await logout();
    } catch (err) {
      showToast('Account deletion failed: ' + err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', margin: '0 auto' }}>
      
      {/* Header Profile Card */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.6rem', fontWeight: 700, boxShadow: 'var(--shadow-glow)' }}>
          {displayName ? displayName.charAt(0).toUpperCase() : 'D'}
        </div>
        <div>
          <h2 style={{ fontSize: '1.5rem' }}>{displayName}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{currentUser?.email}</p>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Section 1: Account & Regional */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--primary-accent)' }}>
            <User size={20} />
            <h3 style={{ fontSize: '1.2rem' }}>Account & Profile</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Gender (Optional)
              </label>
              <input
                type="text"
                value={gender}
                onChange={e => setGender(e.target.value)}
                placeholder="Prefer not to say"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Journaling Language
              </label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="en">English</option>
                <option value="es">Spanish (Español)</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="fr">French (Français)</option>
                <option value="de">German (Deutsch)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Preferred Journaling Time
              </label>
              <input
                type="time"
                value={prefTime}
                onChange={e => setPrefTime(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Habit Manager */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--secondary-accent)' }}>
            <Settings size={20} />
            <h3 style={{ fontSize: '1.2rem' }}>Habits Manager</h3>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {habits.map(h => (
              <span key={h} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.85rem', background: 'rgba(20, 184, 166, 0.15)', border: '1px solid var(--secondary-accent)', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                {h}
                <button type="button" onClick={() => handleRemoveHabit(h)} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={newHabit}
              onChange={e => setNewHabit(e.target.value)}
              placeholder="Add new habit (e.g. Read 20 mins)"
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-secondary" onClick={handleAddHabit}>
              <Plus size={16} /> Add
            </button>
          </div>
        </div>

        {/* Section 3: Theme Atmosphere Gallery */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--warning-color)' }}>
            <Palette size={20} />
            <h3 style={{ fontSize: '1.2rem' }}>Theme Atmosphere & Appearance</h3>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Appearance Mode
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', maxWidth: '360px' }}>
              <button
                type="button"
                className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={() => setTheme('dark')}
              >
                <Moon size={16} /> Dark
              </button>
              <button
                type="button"
                className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={() => setTheme('light')}
              >
                <Sun size={16} /> Light
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Atmosphere Wallpapers (9 Ambient Themes • Minimalist Neutral)
            </label>
            <div className="theme-gallery-grid">
              {availableThemes.map(wp => {
                const isActive = wallpaper === wp.id;
                return (
                  <div
                    key={wp.id}
                    className={`theme-card ${isActive ? 'active' : ''}`}
                    onClick={() => changeWallpaper(wp.id)}
                  >
                    {wp.imageURL ? (
                      <img src={wp.imageURL} alt={wp.name} className="theme-preview-img" />
                    ) : (
                      <div className="theme-preview-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Plain Neutral
                      </div>
                    )}
                    <div className="theme-card-body">
                      <div className="theme-card-title">
                        <span>{wp.name}</span>
                        {isActive && <CheckCircle2 size={16} color="var(--primary-accent)" />}
                      </div>
                      <p className="theme-card-desc">{wp.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={18} />
            <span>{loading ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* Security & Account Deletion */}
      <div className="glass-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--danger-color)' }}>
          <Shield size={20} />
          <h3 style={{ fontSize: '1.2rem' }}>Security & Account Deletion</h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Permanently delete your user account, profile, entries, and media files. This action cannot be undone.
        </p>
        
        <button type="button" className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>
          <Trash2 size={16} />
          <span>Delete Account & Purge Data</span>
        </button>
      </div>

      {/* ReAuth Confirmation Modal */}
      <ReAuthModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccountConfirmed}
        title="Confirm Account Deletion"
        message="This will permanently delete your authentication record, Firestore journal entries, habits, and media. Please re-authenticate your password."
      />

    </div>
  );
}
