import React from 'react';
import { Check } from 'lucide-react';

export default function HabitChecklist({ habits = [], tasksState = {}, onToggleHabit }) {
  if (!habits.length) {
    return <p className="text-muted text-sm" style={{ color: 'var(--text-muted)' }}>No habits configured. You can add habits in your Profile settings.</p>;
  }

  return (
    <div className="habits-grid">
      {habits.map((habit) => {
        const isChecked = Boolean(tasksState[habit]);
        return (
          <div
            key={habit}
            className={`habit-chip ${isChecked ? 'checked' : ''}`}
            onClick={() => onToggleHabit(habit)}
          >
            <div style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              border: isChecked ? 'none' : '2px solid var(--surface-border)',
              background: isChecked ? 'var(--secondary-accent)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              transition: 'all 0.2s ease'
            }}>
              {isChecked && <Check size={14} strokeWidth={3} />}
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{habit}</span>
          </div>
        );
      })}
    </div>
  );
}
