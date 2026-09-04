import React, { useState, useEffect } from 'react';
import { getJournalEntriesList, getJournalEntry, updateJournalEntry, submitQuickCheckin } from '../services/api.js';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Edit3, Clock, Lock, CheckCircle2, History, X, AlertCircle, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

export default function CalendarPage() {
  const { showToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entriesMap, setEntriesMap] = useState({});
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editMood, setEditMood] = useState('happy');
  const [newParagraph, setNewParagraph] = useState('');
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    async function loadEntries() {
      try {
        const res = await getJournalEntriesList();
        const map = {};
        (res.entries || []).forEach(e => {
          map[e.entryDate] = e;
        });
        setEntriesMap(map);
      } catch (err) {
        console.warn('Diarium entries fetch error:', err);
      }
    }
    loadEntries();
  }, []);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Calendar Grid Calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  const handleDayClick = async (dayNumber) => {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(dayNumber).padStart(2, '0');
    const dateKey = `${year}-${monthStr}-${dayStr}`;

    const entry = entriesMap[dateKey] || {
      entryDate: dateKey,
      mood: 'neutral',
      text: '',
      tasks: {},
      tasksCount: 0,
      isEmpty: true
    };

    setSelectedEntry(entry);
    setEditText(entry.text || '');
    setNewParagraph('');
    setEditMood(entry.mood || 'neutral');
    setIsEditing(false);

    // Fetch authoritative entry document from server
    try {
      const res = await getJournalEntry(dateKey);
      if (res.found && res.entry) {
        setSelectedEntry(res.entry);
        setEditText(res.entry.text || '');
        setNewParagraph('');
        setEditMood(res.entry.mood || 'neutral');
      }
    } catch (e) {
      // Use cached map entry
    }
  };

  // Helper to determine if entry date is editable (within past 7 days from today, rejecting future dates)
  const isEditableDate = (dateStr) => {
    if (!dateStr) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr > todayStr) return false; // Reject future dates

    const entryTime = new Date(dateStr + 'T00:00:00').getTime();
    const todayTime = new Date(todayStr + 'T00:00:00').getTime();
    const diffDays = Math.floor((todayTime - entryTime) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  const handleSaveEdit = async () => {
    if (!selectedEntry) return;
    setLoading(true);

    try {
      const hasExisting = Boolean(selectedEntry.text && selectedEntry.text.trim());
      const incomingNote = hasExisting ? newParagraph.trim() : editText.trim();

      if (hasExisting && !incomingNote) {
        setIsEditing(false);
        setLoading(false);
        return;
      }

      if (selectedEntry.isEmpty) {
        await submitQuickCheckin({
          entryDate: selectedEntry.entryDate,
          text: incomingNote,
          mood: editMood,
          tasks: selectedEntry.tasks || {}
        });
      } else {
        await updateJournalEntry(selectedEntry.entryDate, {
          text: incomingNote,
          mood: editMood
        });
      }

      const updatedFullText = hasExisting
        ? `${selectedEntry.text.trim()}\n\n${incomingNote}`
        : incomingNote;

      showToast(hasExisting ? 'New reflection note appended to Diarium entry!' : 'Entry saved successfully in Diarium history!', 'success');
      setSelectedEntry(prev => ({ ...prev, text: updatedFullText, mood: editMood, isEmpty: false }));
      setEditText(updatedFullText);
      setNewParagraph('');
      setIsEditing(false);

      // Refresh map
      setEntriesMap(prev => ({
        ...prev,
        [selectedEntry.entryDate]: {
          ...prev[selectedEntry.entryDate],
          text: updatedFullText,
          mood: editMood,
          hasText: Boolean(updatedFullText.trim()),
          isEmpty: false
        }
      }));
    } catch (err) {
      showToast('Save rejected: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', margin: '0 auto' }}>
      
      {/* Diarium Header & Month Navigation */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CalendarIcon size={26} className="text-indigo-400" />
          <div>
            <h2 style={{ fontSize: '1.6rem' }}>Diarium</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Your historical journal memory map & reflection archive</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={prevMonth} style={{ padding: '0.5rem 0.75rem' }}>
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, minWidth: '140px', textAlign: 'center' }}>
            {monthName} {year}
          </span>
          <button className="btn btn-secondary" onClick={nextMonth} style={{ padding: '0.5rem 0.75rem' }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Diarium Calendar Grid */}
      <div className="glass-card">
        <div className="calendar-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="calendar-day-header">{d}</div>
          ))}

          {/* Empty Padding Cells */}
          {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
            <div key={`empty-${idx}`} style={{ opacity: 0.2 }} />
          ))}

          {/* Month Days */}
          {daysArray.map(dayNum => {
            const monthStr = String(month + 1).padStart(2, '0');
            const dayStr = String(dayNum).padStart(2, '0');
            const dateKey = `${year}-${monthStr}-${dayStr}`;
            const entry = entriesMap[dateKey];

            const hasEntry = Boolean(entry && !entry.isEmpty);
            const isRetro = Boolean(entry?.isRetroactive);

            return (
              <div
                key={dayNum}
                className={`calendar-day-cell ${hasEntry ? 'has-entry' : ''} ${isRetro ? 'is-retroactive' : ''}`}
                onClick={() => handleDayClick(dayNum)}
              >
                <span>{dayNum}</span>
                {hasEntry && (
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    <div className="status-dot" style={{ background: isRetro ? 'var(--warning-color)' : 'var(--primary-accent)' }} />
                    {entry.hasPhoto && <span style={{ fontSize: '0.65rem' }}>📷</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Inspector Modal */}
      {selectedEntry && (
        <div className="modal-overlay" onClick={() => setSelectedEntry(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={20} className="text-indigo-400" />
                <h3 style={{ fontSize: '1.25rem' }}>Diarium Entry: {selectedEntry.entryDate}</h3>
              </div>
              <button onClick={() => setSelectedEntry(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {!isEditing ? (
                <div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Mood:</span>
                    <span style={{ textTransform: 'capitalize', fontWeight: 700, color: 'var(--primary-accent)' }}>{selectedEntry.mood || 'Not recorded'}</span>
                    {selectedEntry.isRetroactive && (
                      <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--warning-color)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)' }}>
                        Retroactive Entry
                      </span>
                    )}
                    {selectedEntry.createdAt && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        Created: {new Date(selectedEntry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {selectedEntry.tasks && Object.keys(selectedEntry.tasks).length > 0 && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                        Daily Habits Logged:
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {Object.entries(selectedEntry.tasks).map(([habit, done]) => (
                          <span
                            key={habit}
                            style={{
                              fontSize: '0.8rem',
                              padding: '0.3rem 0.65rem',
                              borderRadius: 'var(--radius-sm)',
                              background: done ? 'rgba(20, 184, 166, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                              color: done ? 'var(--secondary-accent)' : 'var(--text-muted)',
                              border: `1px solid ${done ? 'var(--secondary-accent)' : 'var(--surface-border)'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontWeight: 500
                            }}
                          >
                            {done ? '✓' : '○'} {habit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginBottom: '1.5rem', background: 'var(--surface-border)', padding: '1rem', borderRadius: 'var(--radius-md)', minHeight: '100px' }}>
                    <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', color: selectedEntry.text ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {selectedEntry.text || 'No reflection text recorded for this date.'}
                    </p>
                    {selectedEntry.missedDayReason && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--warning-color)' }}>
                        <strong>Reason for Missed Day:</strong> {selectedEntry.missedDayReason}
                      </div>
                    )}
                  </div>

                  {/* Attached Photo Memories in Diarium */}
                  {selectedEntry.imageURLs && selectedEntry.imageURLs.length > 0 && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                        Attached Photo Memories ({selectedEntry.imageURLs.length}):
                      </span>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {selectedEntry.imageURLs.map((url, idx) => (
                          <div
                            key={idx}
                            style={{
                              width: 110,
                              height: 110,
                              borderRadius: 'var(--radius-md)',
                              overflow: 'hidden',
                              border: '1px solid var(--surface-border)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                            }}
                          >
                            <img
                              src={url}
                              alt="Diarium Memento"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {selectedEntry.text && (
                    <div style={{ marginBottom: '1.25rem', padding: '0.85rem 1rem', background: 'var(--surface-border)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary-accent)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          <Lock size={13} />
                          <span>Logged Journal Note (Protected - Read-Only)</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--success-color)', fontWeight: 500 }}>
                          ✓ Safe & preserved
                        </span>
                      </div>
                      <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>
                        {selectedEntry.text}
                      </p>
                    </div>
                  )}

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      {selectedEntry.text ? 'Add New Paragraph / Reflection Note' : 'Write Reflection Note (Past 7-Day Window)'}
                    </label>
                    {selectedEntry.text ? (
                      <textarea
                        rows={4}
                        value={newParagraph}
                        onChange={e => setNewParagraph(e.target.value)}
                        placeholder="Type new thoughts or notes to append to this day's entry..."
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <textarea
                        rows={5}
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        placeholder="Write your reflection for this day..."
                        style={{ width: '100%' }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid var(--surface-border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <History size={14} />
                <span>7-Day Edit Policy</span>
              </div>

              {!isEditing ? (
                isEditableDate(selectedEntry.entryDate) ? (
                  <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                    <Edit3 size={16} />
                    <span>{selectedEntry.isEmpty || !selectedEntry.text ? 'Write Entry' : 'Add to Entry'}</span>
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem 0.85rem', background: 'var(--surface-border)', borderRadius: 'var(--radius-md)' }}>
                    <Lock size={14} />
                    <span>{selectedEntry.entryDate > new Date().toISOString().split('T')[0] ? 'Future Date (Locked)' : 'Past 7-Day Window Expired (Locked)'}</span>
                  </div>
                )
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSaveEdit} disabled={loading}>
                    {loading ? 'Saving...' : (selectedEntry.text ? 'Save & Append Note' : 'Save Entry')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
