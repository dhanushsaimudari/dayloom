import React, { useState, useEffect } from 'react';
import { getMonthlyReport } from '../services/api.js';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement 
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { BarChart3, Sparkles, TrendingUp, CheckCircle2, AlertTriangle, RefreshCw, Calendar, Clock } from 'lucide-react';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement
);

export default function AnalyticsPage() {
  const currentMonthId = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [monthId, setMonthId] = useState(currentMonthId);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReportData = async (mId, forceRecalc = false) => {
    setLoading(true);
    try {
      const res = await getMonthlyReport(mId, forceRecalc);
      setReport(res.report || null);
    } catch (err) {
      console.warn('Fetch monthly report error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData(monthId);
  }, [monthId]);

  // Habit Data for Chart
  const habitLabels = report?.habitBreakdown ? Object.keys(report.habitBreakdown) : ['Gym 30m', 'Practice coding', 'Meditation'];
  const habitCounts = report?.habitBreakdown ? Object.values(report.habitBreakdown) : [0, 0, 0];

  const barData = {
    labels: habitLabels,
    datasets: [
      {
        label: 'Days Completed',
        data: habitCounts,
        backgroundColor: 'rgba(99, 102, 241, 0.75)',
        borderColor: '#6366f1',
        borderWidth: 1,
        borderRadius: 8
      }
    ]
  };

  // Mood Distribution Pie Data
  const moodDist = report?.moodDistribution || { happy: 0, neutral: 0, sad: 0 };
  const pieData = {
    labels: Object.keys(moodDist).map(k => k.replace('_', ' ').toUpperCase()),
    datasets: [
      {
        data: Object.values(moodDist),
        backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'],
        borderWidth: 1
      }
    ]
  };

  const changePercent = report?.monthOverMonthChange || 0;
  const isPositiveChange = changePercent >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', margin: '0 auto' }}>
      
      {/* Header Bar */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BarChart3 size={26} className="text-indigo-400" />
          <div>
            <h2 style={{ fontSize: '1.6rem' }}>Insights</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Deterministic behavioral pattern analytics & grounded Reflectra reflection</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <input
            type="month"
            value={monthId}
            onChange={e => setMonthId(e.target.value)}
          />

          <button className="btn btn-secondary" onClick={() => fetchReportData(monthId, true)} title="Recalculate Backend Stats" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Calculating...' : 'Recalculate'}</span>
          </button>
        </div>
      </div>

      {/* Key Headline Summary */}
      <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(20, 184, 166, 0.1) 100%)', borderColor: 'var(--primary-accent)' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--primary-accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          MONTHLY HIGHLIGHT SUMMARY
        </span>
        <h2 style={{ fontSize: '1.75rem', margin: '0.5rem 0' }}>
          {isPositiveChange ? 'You showed up more consistently this month.' : 'Your reflection rhythm continued this month.'}
        </h2>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {report?.entryCount || 0} <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>journal days</span>
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 600, color: isPositiveChange ? 'var(--success-color)' : 'var(--warning-color)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <TrendingUp size={18} />
            {isPositiveChange ? `+${changePercent}% from previous month` : `${changePercent}% from previous month`}
          </span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            ({report?.consistencyPercent || 0}% month consistency)
          </span>
        </div>
      </div>

      {/* Your Rhythm (Weekday vs Weekend & Time-of-Day) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--secondary-accent)' }}>
            <Calendar size={20} />
            <h3 style={{ fontSize: '1.1rem' }}>Your Rhythm</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <span>Weekdays</span>
                <strong>{report?.weekdayVsWeekend?.weekdayCount || 0} days ({report?.weekdayVsWeekend?.weekdayPercent || 0}%)</strong>
              </div>
              <div style={{ height: 8, background: 'var(--surface-border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${report?.weekdayVsWeekend?.weekdayPercent || 0}%`, height: '100%', background: 'var(--secondary-accent)' }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                <span>Weekends</span>
                <strong>{report?.weekdayVsWeekend?.weekendCount || 0} days ({report?.weekdayVsWeekend?.weekendPercent || 0}%)</strong>
              </div>
              <div style={{ height: 8, background: 'var(--surface-border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${report?.weekdayVsWeekend?.weekendPercent || 0}%`, height: '100%', background: 'var(--warning-color)' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary-accent)' }}>
            <Clock size={20} />
            <h3 style={{ fontSize: '1.1rem' }}>Time-of-Day Pattern</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ background: 'var(--surface-border)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Morning (5-12)</span>
              <h4 style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>{report?.timeOfDayPattern?.morning || 0}</h4>
            </div>
            <div style={{ background: 'var(--surface-border)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Afternoon (12-17)</span>
              <h4 style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>{report?.timeOfDayPattern?.afternoon || 0}</h4>
            </div>
            <div style={{ background: 'var(--surface-border)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Evening (17-22)</span>
              <h4 style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>{report?.timeOfDayPattern?.evening || 0}</h4>
            </div>
            <div style={{ background: 'var(--surface-border)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Night (22-5)</span>
              <h4 style={{ fontSize: '1.4rem', color: 'var(--text-primary)' }}>{report?.timeOfDayPattern?.night || 0}</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Habit Growth Comparison Cards */}
      {report?.habitComparison && Object.keys(report.habitComparison).length > 0 && (
        <div className="glass-card">
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Habit Growth Comparison</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {Object.entries(report.habitComparison).map(([habitName, stats]) => (
              <div key={habitName} style={{ background: 'var(--surface-border)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border)' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{habitName}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.4rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary-accent)' }}>
                    {stats.current} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>vs {stats.previous} prev</span>
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: stats.growthPercent >= 0 ? 'var(--success-color)' : 'var(--warning-color)' }}>
                    {stats.growthPercent >= 0 ? `+${stats.growthPercent}%` : `${stats.growthPercent}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Habit Breakdown</h3>
          <div style={{ height: '250px' }}>
            <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Mood Trajectory</h3>
          <div style={{ height: '250px', display: 'flex', justifyContent: 'center' }}>
            <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Reflectra Grounded Narrative Summary */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-accent)', marginBottom: '1rem' }}>
          <Sparkles size={22} />
          <h3 style={{ fontSize: '1.35rem' }}>Reflectra's Reflection</h3>
        </div>

        <div style={{ background: 'var(--surface-border)', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
          <p style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
            {report?.summaryText || `In ${monthId}, you completed ${report?.entryCount || 0} reflections. Keep building your daily momentum!`}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div>
            <h4 style={{ fontSize: '1rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <CheckCircle2 size={18} /> Observed Highlights
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(report?.positiveHighlights || [
                `Logged ${report?.entryCount || 0} entries out of the month`,
                "Consistent habit tracking recorded"
              ]).map((hl, idx) => (
                <li key={idx} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
                  • {hl}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: '1rem', color: 'var(--warning-color)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={18} /> Areas for Gentle Focus
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(report?.areasForGrowth || [
                "Consider setting a gentle reminder for weekend days to capture full-week momentum"
              ]).map((ag, idx) => (
                <li key={idx} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'rgba(245, 158, 11, 0.1)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
                  • {ag}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>

    </div>
  );
}
