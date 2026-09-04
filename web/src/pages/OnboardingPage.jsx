import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { saveOnboarding } from '../services/api.js';
import { getAvailableThemes } from '../services/themeConfig.js';
import { Sparkles, Check, Clock, Globe, Palette, ArrowRight, SkipForward, CheckCircle2 } from 'lucide-react';

const PRESET_HABITS = [
  "Gym 30m",
  "Yoga 15m",
  "Practice coding 20m",
  "Read 15 pages",
  "Meditation 10m",
  "Walk 5,000 steps",
  "Journaling reflection"
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [selectedHabits, setSelectedHabits] = useState(["Gym 30m", "Practice coding 20m", "Meditation 10m"]);
  const [customHabit, setCustomHabit] = useState('');
  const [prefTime, setPrefTime] = useState('21:00');
  const [language, setLanguage] = useState('en');
  const [selectedTheme, setSelectedTheme] = useState('dark');
  const [selectedWallpaper, setSelectedWallpaper] = useState('theme_5_vintage_ephemera');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { refreshProfile } = useAuth();
  const { setTheme, changeWallpaper } = useTheme();
  const navigate = useNavigate();

  const availableThemes = getAvailableThemes();

  const toggleHabit = (h) => {
    setSelectedHabits(prev => 
      prev.includes(h) ? prev.filter(item => item !== h) : [...prev, h]
    );
  };

  const addCustomHabit = (e) => {
    e.preventDefault();
    if (customHabit.trim() && !selectedHabits.includes(customHabit.trim())) {
      setSelectedHabits([...selectedHabits, customHabit.trim()]);
      setCustomHabit('');
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await saveOnboarding({
        habits: selectedHabits,
        prefTime,
        language,
        theme: selectedTheme,
        wallpaperURL: selectedWallpaper,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      }).catch(e => console.warn('Background onboarding save warning:', e.message));

      sessionStorage.removeItem('dayloom_new_signup');
      await refreshProfile();
      navigate('/dashboard');
    } catch (err) {
      console.error('Skip onboarding error:', err);
      sessionStorage.removeItem('dayloom_new_signup');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      setTheme(selectedTheme);
      changeWallpaper(selectedWallpaper);

      await saveOnboarding({
        habits: selectedHabits,
        prefTime,
        language,
        theme: selectedTheme,
        wallpaperURL: selectedWallpaper,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      });

      sessionStorage.removeItem('dayloom_new_signup');
      await refreshProfile();
      navigate('/dashboard');
    } catch (err) {
      console.error('Onboarding save error:', err);
      setErrorMessage(err.message || 'Could not save onboarding preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: '1.5rem auto', width: '100%' }}>
      <div className="glass-card">
        
        {/* Step Indicator Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-accent)', fontWeight: 600 }}>
            <Sparkles size={20} />
            <span>Dayloom Welcome (Step {step} of 4)</span>
          </div>
          <button
            onClick={handleSkip}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            <span>Skip setup</span>
            <SkipForward size={16} />
          </button>
        </div>

        {errorMessage && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger-color)', color: '#fca5a5', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {errorMessage}
          </div>
        )}

        {/* Step 1: Habits & Goals */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>What daily habits do you track?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Select habits or add custom routines you want to monitor over time.
            </p>

            <div className="habits-grid">
              {Array.from(new Set([...PRESET_HABITS, ...selectedHabits])).map(h => {
                const isChecked = selectedHabits.includes(h);
                return (
                  <div key={h} className={`habit-chip ${isChecked ? 'checked' : ''}`} onClick={() => toggleHabit(h)}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6,
                      border: isChecked ? 'none' : '2px solid var(--surface-border)',
                      background: isChecked ? 'var(--secondary-accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
                    }}>
                      {isChecked && <Check size={14} strokeWidth={3} />}
                    </div>
                    <span>{h}</span>
                  </div>
                );
              })}
            </div>

            <form onSubmit={addCustomHabit} style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
              <input
                type="text"
                value={customHabit}
                onChange={e => setCustomHabit(e.target.value)}
                placeholder="+ Add custom habit (e.g. Read research paper)"
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-secondary">Add</button>
            </form>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-primary" onClick={() => setStep(2)}>
                Next: Preferences <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Time & Language */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Reflection Preferences</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Set your preferred daily reflection window & regional language.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <Clock size={18} /> Preferred Journaling Time
              </label>
              <input
                type="time"
                value={prefTime}
                onChange={e => setPrefTime(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <Globe size={18} /> Primary Journaling Language
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

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>
                Next: Atmosphere <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Atmosphere & Themes */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Visual Atmosphere</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Personalize your Dayloom journal environment with theme atmospheres.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <Palette size={18} /> Appearance Mode
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  type="button"
                  className={`btn ${selectedTheme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => setSelectedTheme('dark')}
                >
                  Dark Mode
                </button>
                <button
                  type="button"
                  className={`btn ${selectedTheme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => setSelectedTheme('light')}
                >
                  Light Mode
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Atmosphere Theme
              </label>
              <div className="theme-gallery-grid">
                {availableThemes.map(wp => {
                  const isActive = selectedWallpaper === wp.id;
                  return (
                    <div
                      key={wp.id}
                      className={`theme-card ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedWallpaper(wp.id)}
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

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary" onClick={() => setStep(4)}>
                Next: My Era <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: My Era & Welcome */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Ready to Begin!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              "Your days are threads. Your life is the pattern."
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--surface-border)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>1</div>
                <p style={{ fontSize: '0.925rem' }}><strong>Quick Check-In or Brain Dump:</strong> Log habits quickly (~10s) or write unstructured thoughts.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--secondary-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>2</div>
                <p style={{ fontSize: '0.925rem' }}><strong>Ask Reflectra:</strong> Talk it through, speak, or attach Memento photo memories.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--warning-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>3</div>
                <p style={{ fontSize: '0.925rem' }}><strong>Diarium & Insights:</strong> Discover your behavioral patterns across your era.</p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={() => setStep(3)}>Back</button>
              <button className="btn btn-primary" onClick={handleFinish} disabled={loading}>
                {loading ? 'Saving Setup...' : 'Enter Dayloom'} <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
