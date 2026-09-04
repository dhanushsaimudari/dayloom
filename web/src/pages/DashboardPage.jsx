import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import MoodPicker from '../components/MoodPicker.jsx';
import HabitChecklist from '../components/HabitChecklist.jsx';
import { submitQuickCheckin, getJournalEntry, checkMissedDays, submitRetroactiveEntry } from '../services/api.js';
import { Sparkles, Calendar, CheckCircle2, Clock, HeartHandshake, Save, Feather, AlertCircle, Image as ImageIcon, Lock } from 'lucide-react';
import { compressImage } from '../utils/imageUtils.js';

export default function DashboardPage() {
  const { currentUser, userSettings } = useAuth();
  const navigate = useNavigate();

  const todayISO = new Date().toISOString().split('T')[0];
  const currentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const habits = userSettings?.habits || ["Gym 30m", "Yoga 15m", "Practice coding 20m", "Meditation 10m"];
  const displayName = currentUser?.displayName || userSettings?.displayName || 'Friend';

  const [selectedMood, setSelectedMood] = useState('happy');
  const [tasksState, setTasksState] = useState({});
  const [reflectionText, setReflectionText] = useState('');
  const [existingReflection, setExistingReflection] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [savedToday, setSavedToday] = useState(false);
  const [missedData, setMissedData] = useState(null);
  const [retroReason, setRetroReason] = useState('');
  const [showRetroModal, setShowRetroModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  // Greeting helper based on hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    async function loadTodayData() {
      try {
        const res = await getJournalEntry(todayISO);
        if (res.found && res.entry) {
          setSelectedMood(res.entry.mood || 'happy');
          setTasksState(res.entry.tasks || {});
          setExistingReflection(res.entry.text || '');
          setReflectionText(''); // Starts blank so new notes can be cleanly appended without overwriting existing
          if (Array.isArray(res.entry.imageURLs) && res.entry.imageURLs.length > 0) {
            setSelectedPhotos(res.entry.imageURLs);
          }
          setSavedToday(true);
        }
      } catch (err) {
        console.warn('Load today entry notice:', err.message);
      }
    }

    async function loadMissedCheck() {
      try {
        const res = await checkMissedDays();
        if (res.missedYesterday) {
          setMissedData(res);
        }
      } catch (err) {
        console.warn('Missed day check notice:', err.message);
      }
    }

    loadTodayData();
    loadMissedCheck();
  }, [todayISO]);

  const handleToggleHabit = (habitName) => {
    setTasksState(prev => ({
      ...prev,
      [habitName]: !prev[habitName]
    }));
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 900, 900, 0.72);
        setSelectedPhotos(prev => [...prev, compressed]);
      } catch (err) {
        console.error('Photo compression error:', err);
      }
      e.target.value = '';
    }
  };

  const handleSaveCheckin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFeedbackMsg({ type: '', text: '' });

    try {
      await submitQuickCheckin({
        entryDate: todayISO,
        mood: selectedMood,
        tasks: tasksState,
        text: reflectionText.trim(),
        timezone: timeZone,
        time: currentTimeStr,
        imageURLs: selectedPhotos
      });

      if (reflectionText.trim()) {
        setExistingReflection(prev => prev ? `${prev}\n\n${reflectionText.trim()}` : reflectionText.trim());
        setReflectionText('');
      }
      setSavedToday(true);
      setFeedbackMsg({
        type: 'success',
        text: (existingReflection && reflectionText.trim())
          ? 'New reflection paragraph appended to today\'s journal entry!'
          : 'Check-in saved to your Dayloom thread!'
      });
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Save failed: ' + (err.message || 'Please check connection.') });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRetroactive = async () => {
    if (!missedData) return;
    setLoading(true);
    try {
      await submitRetroactiveEntry({
        missedDate: missedData.yesterdayISO,
        reason: retroReason,
        mood: 'neutral',
        text: `Retroactive reflection: ${retroReason}`
      });

      setShowRetroModal(false);
      setMissedData(null);
      setFeedbackMsg({ type: 'success', text: 'Retroactive reflection recorded in your Diarium history.' });
      setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4000);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: 'Retroactive save failed: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', margin: '0 auto' }}>
      
      {/* Header & Date Status */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            <Clock size={16} />
            <span>{timeZone} | {currentTimeStr}</span>
          </div>
          <h1 style={{ fontSize: '2.1rem', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {getGreeting()}, {displayName} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={() => navigate('/chat')}>
            <Sparkles size={18} />
            <span>Ask Reflectra</span>
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/calendar')}>
            <Calendar size={18} />
            <span>Diarium</span>
          </button>
        </div>
      </div>

      {/* Gentle Missed-Day Prompt Banner */}
      {missedData && missedData.missedYesterday && (
        <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid var(--warning-color)', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <HeartHandshake size={24} style={{ color: 'var(--warning-color)' }} />
            <div>
              <h4 style={{ color: 'var(--warning-color)', fontSize: '1rem' }}>Yesterday is still waiting for you</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                "Yesterday ({missedData.yesterdayISO}) is still open in your thread. Want to add anything you remember?"
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => setShowRetroModal(true)}>
              Add Retroactive Note
            </button>
            <button className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }} onClick={() => setMissedData(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Quick Daily Check-In (~10s) */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem' }}>Quick Daily Check-In (~10 sec)</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Capture your day's mood and routine habits in seconds.</p>
          </div>

          {savedToday && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success-color)', fontSize: '0.875rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.12)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-full)' }}>
              <CheckCircle2 size={16} />
              <span>Checked in today</span>
            </div>
          )}
        </div>

        {feedbackMsg.text && (
          <div style={{
            padding: '0.75rem 1rem',
            background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedbackMsg.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'}`,
            borderRadius: 'var(--radius-md)',
            color: feedbackMsg.type === 'success' ? 'var(--success-color)' : 'var(--danger-color)',
            fontSize: '0.875rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {feedbackMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveCheckin}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              How are you feeling today?
            </label>
            <MoodPicker selectedMood={selectedMood} onSelectMood={setSelectedMood} />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Today's little things:
            </label>
            <HabitChecklist habits={habits} tasksState={tasksState} onToggleHabit={handleToggleHabit} />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            {/* Display existing journal reflection as read-only / protected */}
            {existingReflection && (
              <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', background: 'var(--surface-border)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary-accent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <Lock size={13} />
                    <span>Today's Logged Journal (Protected - Read-Only)</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--success-color)', fontWeight: 500 }}>
                    ✓ Saved & safe
                  </span>
                </div>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>
                  {existingReflection}
                </p>
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              <Feather size={16} className="text-indigo-400" />
              <span>{existingReflection ? 'Add New Paragraph / Reflection Note' : 'Brain Dump / Reflection Note (Optional)'}</span>
            </label>
            <textarea
              rows={3}
              value={reflectionText}
              onChange={e => setReflectionText(e.target.value)}
              placeholder={existingReflection ? "Add an evening update, new paragraph, or further thoughts..." : "Brain Dump: What made today notable? Write quick unstructured thoughts..."}
              style={{ width: '100%', resize: 'vertical' }}
            />

            {/* Hidden file input for photo memories */}
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />

            {/* Photo Memory Adding Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.825rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon size={16} className="text-indigo-400" />
                <span>Add Photo Memory (Memento)</span>
              </button>

              {selectedPhotos.length > 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {selectedPhotos.length} photo {selectedPhotos.length === 1 ? 'memory' : 'memories'} attached
                </span>
              )}
            </div>

            {/* Photo Memory Thumbnails */}
            {selectedPhotos.length > 0 && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {selectedPhotos.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', width: 72, height: 72, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--surface-border)' }}>
                    <img src={url} alt="Memento memory" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => setSelectedPhotos(prev => prev.filter((_, i) => i !== idx))}
                      title="Remove photo"
                      style={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        background: 'rgba(0, 0, 0, 0.65)',
                        border: 'none',
                        color: '#fff',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '11px',
                        lineHeight: 1
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/chat')}>
              <Sparkles size={18} className="text-indigo-400" />
              <span>Talk to Reflectra</span>
            </button>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={18} />
              <span>{loading ? 'Saving...' : (existingReflection ? 'Save & Append to Entry' : (savedToday ? 'Update Today\'s Check-in' : 'Check In'))}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Retroactive Reason Modal */}
      {showRetroModal && missedData && (
        <div className="modal-overlay" onClick={() => setShowRetroModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Retroactive Reflection for {missedData.yesterdayISO}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              "No pressure — want to add anything you remember from yesterday?"
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
              {["Busy with work", "Had an exam / test", "Traveled all day", "Feeling unwell / resting", "Forgot to log", "Quiet peaceful day"].map(opt => (
                <button
                  key={opt}
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                  onClick={() => setRetroReason(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={retroReason}
              onChange={e => setRetroReason(e.target.value)}
              placeholder="Or type your reflection..."
              style={{ width: '100%', marginBottom: '1.25rem' }}
            />

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowRetroModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveRetroactive} disabled={loading || !retroReason.trim()}>
                Save Retroactive Note
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
