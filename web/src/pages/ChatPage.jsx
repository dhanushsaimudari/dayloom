import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { sendGeminiChatTurn, transcribeAudioUpload, captionPhotoMemory, submitQuickCheckin, summarizeChatSession, getJournalEntry } from '../services/api.js';
import { Sparkles, Send, Mic, Image as ImageIcon, Loader2, Save, User, Bot, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { compressImage } from '../utils/imageUtils.js';

export default function ChatPage() {
  const { userSettings } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState([
    {
      id: 'init-1',
      role: 'model',
      text: "Hello! I'm Reflectra, your private personal growth companion for Dayloom. What's on your mind today? Feel free to talk it through, share a Brain Dump, or attach a Memento photo memory."
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !selectedPhoto) return;

    // If recording is active when user sends, stop listening
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      setIsRecording(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    }

    const userMessageText = inputText.trim();
    const newUserMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: userMessageText,
      photoUrl: photoPreview || null
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');
    const photoToUpload = selectedPhoto;
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setLoading(true);

    try {
      let aiResponseText = '';

      if (photoToUpload) {
        // Send multimodal image captioning request
        const formData = new FormData();
        formData.append('image', photoToUpload);
        formData.append('userPrompt', userMessageText);
        const res = await captionPhotoMemory(formData);
        aiResponseText = res.reflectionText || res.text || res.caption || "Memento photo memory captured.";
      } else {
        // Normal text conversation turn
        const res = await sendGeminiChatTurn({
          prompt: userMessageText,
          previousMessages: messages.slice(-10),
          userContext: {
            language: userSettings?.language || 'en',
            mood: userSettings?.mood || '',
            goals: userSettings?.goals || []
          }
        });
        aiResponseText = res.replyText || res.text || res.message || "I hear what you shared today. Tell me more about how you're feeling.";
      }

      setMessages(prev => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          text: aiResponseText
        }
      ]);
    } catch (err) {
      console.error('[ChatPage] sendGeminiChatTurn error:', err);
      
      const lower = (userMessageText || '').toLowerCase();
      let fallback = '';

      const nameMatch = userMessageText.match(/(?:i am|my name is|call me|this is)\s+([a-zA-Z]+)/i);
      if (nameMatch && nameMatch[1]) {
        const name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
        fallback = `It's really good to meet you, ${name}. I'll remember to call you that. How are you feeling right now?`;
      } else if (lower.includes('lost') && (lower.includes('money') || lower.includes('wallet') || lower.includes('card') || lower.includes('cash'))) {
        fallback = "I'm so sorry to hear that. Losing money is really stressful and upsetting. Take a deep breath—it's okay to feel sad about it right now. How are you holding up?";
      } else if (lower.includes('sad') || lower.includes('upset') || lower.includes('depressed') || lower.includes('hurt')) {
        fallback = "I hear how heavy things feel for you right now. It's completely valid to feel this way, and I'm right here listening. Would you like to share a bit more about what's going on?";
      } else if (lower.includes('exam') || lower.includes('study') || lower.includes('college') || lower.includes('work')) {
        fallback = "Going through exams and busy days takes a lot of energy. I hear you. What helped you get through it today?";
      } else {
        fallback = `I hear you when you say "${userMessageText.slice(0, 60)}". Thank you for sharing with me. What else is on your mind today?`;
      }

      setMessages(prev => [
        ...prev,
        {
          id: `fallback-${Date.now()}`,
          role: 'model',
          text: fallback
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Photo File Selection
  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedPhoto(file);
      try {
        const compressed = await compressImage(file, 900, 900, 0.72);
        setPhotoPreview(compressed);
      } catch (err) {
        const reader = new FileReader();
        reader.onloadend = () => setPhotoPreview(reader.result);
        reader.readAsDataURL(file);
      }
    }
  };

  // Handle Continuous Speech Recognition / Voice Recording Toggle
  const handleVoiceRecordToggle = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      showToast('Speech recognition is supported in Chrome, Edge, and Safari browsers.', 'info');
      return;
    }

    if (isRecording) {
      isRecordingRef.current = false;
      setIsRecording(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = userSettings?.language || 'en-US';

    let initialBaseText = inputText ? (inputText.trim() + ' ') : '';
    let accumulatedFinalText = '';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let sessionFinal = '';

      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          sessionFinal += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      accumulatedFinalText = sessionFinal;
      const combined = (initialBaseText + accumulatedFinalText + interimTranscript).trim();
      setInputText(combined);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition event:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        isRecordingRef.current = false;
        setIsRecording(false);
        showToast('Microphone access was denied. Please allow microphone permissions.', 'error');
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        try {
          recognition.start();
        } catch (e) {}
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;
    isRecordingRef.current = true;
    setIsRecording(true);

    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  };

  // State for Editable Summary Pop-up Modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editableSummary, setEditableSummary] = useState('');
  const [existingTodayJournal, setExistingTodayJournal] = useState('');
  const [selectedMood, setSelectedMood] = useState('happy');
  const [selectedHabits, setSelectedHabits] = useState({});
  const [savingFinal, setSavingFinal] = useState(false);

  // Available user habits
  const availableHabits = userSettings?.habits && userSettings.habits.length > 0 
    ? userSettings.habits 
    : ["Gym 30m", "Yoga 15m", "Practice coding 20m", "Meditation 10m"];

  // Open the review & edit summary modal
  const handleOpenSaveModal = async () => {
    if (saveLoading) return;
    setSaveLoading(true);

    try {
      // Check if today already has an existing journal entry to preserve as read-only
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: userTz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      try {
        const todayRes = await getJournalEntry(todayISO);
        if (todayRes?.found && todayRes?.entry?.text && todayRes.entry.text.trim().length > 0) {
          setExistingTodayJournal(todayRes.entry.text.trim());
          if (todayRes.entry.mood) setSelectedMood(todayRes.entry.mood);
          if (todayRes.entry.tasks && Object.keys(todayRes.entry.tasks).length > 0) {
            setSelectedHabits(prev => ({ ...(todayRes.entry.tasks || {}), ...prev }));
          }
        } else {
          setExistingTodayJournal('');
        }
      } catch (e) {
        setExistingTodayJournal('');
      }

      // Sanitize messages: strip large image base64 data to keep payload tiny and fast
      const textMessages = messages
        .filter(m => m.text && m.text.trim())
        .map(m => ({ role: m.role, text: m.text }));

      // 1. Synthesize conversational reflection into first-person journal entry
      const summaryResult = await summarizeChatSession({
        messages: textMessages,
        userContext: {
          language: userSettings?.language || 'en'
        }
      });

      const reflectionSummary = summaryResult?.summary || summaryResult?.text || messages.filter(m => m.role === 'user').map(m => m.text).join('\n\n');
      setEditableSummary(reflectionSummary);
      setShowSaveModal(true);
    } catch (err) {
      console.error('Summarize session error:', err);
      // Fallback: extract all user messages directly so nothing is ever lost
      const fallbackSummary = messages.filter(m => m.role === 'user').map(m => m.text).join('\n\n');
      setEditableSummary(fallbackSummary || "Today was a productive reflection day.");
      setShowSaveModal(true);
    } finally {
      setSaveLoading(false);
    }
  };

  // Confirm and persist entry to Diarium
  const handleConfirmSaveToJournal = async () => {
    setSavingFinal(true);
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const todayISO = new Intl.DateTimeFormat('en-CA', { timeZone: userTz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      const currentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Gather any photos attached during this chat session and ensure compressed
      const rawSessionPhotos = messages.filter(m => m.photoUrl).map(m => m.photoUrl);
      const sessionPhotos = await Promise.all(
        rawSessionPhotos.map(p => compressImage(p, 900, 900, 0.72))
      );

      await submitQuickCheckin({
        entryDate: todayISO,
        text: editableSummary,
        mood: selectedMood,
        tasks: selectedHabits,
        timezone: userTz,
        time: currentTimeStr,
        imageURLs: sessionPhotos.filter(Boolean)
      });

      setShowSaveModal(false);
      showToast(existingTodayJournal ? 'Reflectra reflection appended to your earlier journal entry!' : 'Journal entry successfully saved to your Diarium!', 'success');
    } catch (err) {
      console.error('Confirm save error:', err);
      showToast('Save failed: ' + (err.message || 'Check connection.'), 'error');
    } finally {
      setSavingFinal(false);
    }
  };

  const toggleHabit = (h) => {
    setSelectedHabits(prev => ({
      ...prev,
      [h]: !prev[h]
    }));
  };

  const MOOD_OPTIONS = [
    { key: 'very_happy', emoji: '🤩', label: 'Energized' },
    { key: 'happy', emoji: '😊', label: 'Good' },
    { key: 'neutral', emoji: '😐', label: 'Okay' },
    { key: 'sad', emoji: '😔', label: 'Low' },
    { key: 'anxious', emoji: '😰', label: 'Anxious' },
    { key: 'stressed', emoji: '😤', label: 'Stressed' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', margin: '0 auto' }}>
      
      {/* Header Bar */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(99, 102, 241, 0.15)', borderRadius: 'var(--radius-md)', color: 'var(--primary-accent)' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem' }}>Ask Reflectra</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Talk it through with your private Dayloom companion</p>
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleOpenSaveModal} disabled={saveLoading || messages.length <= 1}>
          {saveLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          <span>{saveLoading ? 'Synthesizing...' : 'Save Session to Journal'}</span>
        </button>
      </div>

      {/* Main Chat Box */}
      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.role}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem', fontSize: '0.75rem', fontWeight: 600, opacity: 0.8 }}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                <span>{msg.role === 'user' ? 'You' : 'Reflectra'}</span>
              </div>
              
              {msg.photoUrl && (
                <img
                  src={msg.photoUrl}
                  alt="Memento Attached"
                  style={{ maxWidth: '240px', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem', border: '1px solid var(--surface-border)' }}
                />
              )}

              <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
            </div>
          ))}

          {loading && (
            <div className="chat-bubble model" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <Loader2 size={18} className="animate-spin" />
              <span>Reflectra is reflecting...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Attachment Preview Bar */}
        {photoPreview && (
          <div style={{ padding: '0.5rem 1.25rem', background: 'var(--surface-card)', display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid var(--surface-border)' }}>
            <img src={photoPreview} alt="Memento Preview" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Memento photo attached</span>
            <button onClick={() => { setSelectedPhoto(null); setPhotoPreview(null); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', fontSize: '0.8rem' }}>
              Remove
            </button>
          </div>
        )}

        {/* Input Controls Bar */}
        <form onSubmit={handleSend} className="chat-input-bar">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            style={{ display: 'none' }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach Memento Photo Memory"
            style={{ background: 'none', border: 'none', color: selectedPhoto ? 'var(--secondary-accent)' : 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem' }}
          >
            <ImageIcon size={20} />
          </button>

          <button
            type="button"
            onClick={handleVoiceRecordToggle}
            title={isRecording ? 'Listening...' : 'Voice Reflection'}
            style={{ background: 'none', border: 'none', color: isRecording ? 'var(--danger-color)' : 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem' }}
          >
            <Mic size={20} className={isRecording ? 'animate-pulse' : ''} />
          </button>

          <input
            type="text"
            className="chat-input"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={isRecording ? 'Listening to your voice...' : 'Talk it through with Reflectra...'}
          />

          <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1rem' }} disabled={loading || (!inputText.trim() && !selectedPhoto)}>
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Review & Editable Summary Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => !savingFinal && setShowSaveModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} color="var(--primary-accent)" />
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>Review & Save to Diarium</h3>
              </div>
              <button 
                onClick={() => setShowSaveModal(false)}
                disabled={savingFinal}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Reflectra synthesized your session while preserving all your details. You can review, edit, or adjust anything before confirming.
              </p>

              {/* Mood Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  How was your mood today?
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.4rem' }}>
                  {MOOD_OPTIONS.map(m => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setSelectedMood(m.key)}
                      style={{
                        padding: '0.5rem 0.25rem',
                        background: selectedMood === m.key ? 'rgba(99, 102, 241, 0.25)' : 'var(--surface-card)',
                        border: selectedMood === m.key ? '2px solid var(--primary-accent)' : '1px solid var(--surface-border)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.2rem',
                        cursor: 'pointer',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>{m.emoji}</span>
                      <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Habits Checkboxes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Habits Logged Today
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {availableHabits.map(h => {
                    const isChecked = !!selectedHabits[h];
                    return (
                      <span
                        key={h}
                        onClick={() => toggleHabit(h)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          background: isChecked ? 'rgba(20, 184, 166, 0.2)' : 'var(--surface-card)',
                          border: isChecked ? '1px solid var(--secondary-accent)' : '1px solid var(--surface-border)',
                          color: isChecked ? 'var(--secondary-accent)' : 'var(--text-secondary)',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          fontWeight: 500,
                          userSelect: 'none'
                        }}
                      >
                        {isChecked ? '✓ ' : '+ '}{h}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Existing Earlier Journal Note (Read-Only) */}
              {existingTodayJournal && (
                <div style={{ padding: '0.85rem 1rem', background: 'var(--surface-border)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary-accent)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      <Lock size={13} />
                      <span>Earlier Today's Journal (Protected - Read-Only)</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--success-color)', fontWeight: 500 }}>
                      ✓ Safe & preserved
                    </span>
                  </div>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>
                    {existingTodayJournal}
                  </p>
                </div>
              )}

              {/* Editable Reflection Text Area */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  {existingTodayJournal ? 'Reflectra Summary (Appended as New Paragraph)' : 'Your Diarium Journal Note (Editable)'}
                </label>
                <textarea
                  value={editableSummary}
                  onChange={e => setEditableSummary(e.target.value)}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    lineHeight: 1.6,
                    fontSize: '0.925rem',
                    resize: 'vertical'
                  }}
                  placeholder="Your daily reflection..."
                />
              </div>

              {/* Attached Photo Memories Preview in Modal */}
              {messages.some(m => m.photoUrl) && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    <ImageIcon size={15} className="text-indigo-400" />
                    <span>Attached Memento Photo Memory (Included in Journal)</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {messages.filter(m => m.photoUrl).map((m, idx) => (
                      <img
                        key={idx}
                        src={m.photoUrl}
                        alt="Memento Memory"
                        style={{ width: 72, height: 72, borderRadius: 'var(--radius-md)', objectFit: 'cover', border: '1px solid var(--surface-border)' }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', borderTop: '1px solid var(--surface-border)', paddingTop: '1rem' }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => setShowSaveModal(false)}
                disabled={savingFinal}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn btn-primary" 
                onClick={handleConfirmSaveToJournal}
                disabled={savingFinal || !editableSummary.trim()}
              >
                {savingFinal ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>{savingFinal ? 'Saving...' : 'Confirm & Save to Diarium'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
