import React from 'react';

const MOOD_OPTIONS = [
  { id: 'very_happy', label: 'Very Happy', emoji: '😄', color: '#10b981' },
  { id: 'happy', label: 'Good', emoji: '🙂', color: '#3b82f6' },
  { id: 'neutral', label: 'Neutral', emoji: '😐', color: '#8b5cf6' },
  { id: 'sad', label: 'Down', emoji: '😔', color: '#f59e0b' },
  { id: 'anxious', label: 'Anxious', emoji: '😰', color: '#ec4899' },
  { id: 'stressed', label: 'Stressed', emoji: '😫', color: '#ef4444' },
];

export default function MoodPicker({ selectedMood, onSelectMood }) {
  return (
    <div className="mood-picker-grid">
      {MOOD_OPTIONS.map(mood => (
        <button
          key={mood.id}
          type="button"
          className={`mood-btn ${selectedMood === mood.id ? 'selected' : ''}`}
          onClick={() => onSelectMood(mood.id)}
        >
          <span className="mood-emoji">{mood.emoji}</span>
          <span className="mood-label">{mood.label}</span>
        </button>
      ))}
    </div>
  );
}
