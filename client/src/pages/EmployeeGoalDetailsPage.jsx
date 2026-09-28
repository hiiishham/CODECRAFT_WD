import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Target, Calendar, User, AlertCircle, RefreshCw, Save,
} from 'lucide-react';
import { goalService } from '../services/goalService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/performance.css';

const QUICK_VALUES = [0, 25, 50, 75, 100];

export default function EmployeeGoalDetailsPage() {
  const { id } = useParams();
  const { showToast } = useToast();

  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchGoal = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await goalService.getGoalById(id);
      setGoal(res.data);
      setProgress(res.data.progress ?? 0);
    } catch (err) {
      setError(err.message || 'Failed to load goal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGoal(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await goalService.updateGoalProgress(id, progress);
      setGoal(res.data);
      setProgress(res.data.progress ?? progress);
      showToast('success', res.message || 'Progress updated!');
    } catch (err) {
      showToast('error', err.message || 'Failed to update progress');
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  const getStatusInfo = () => {
    if (!goal) return { label: '—', cls: '' };
    if (progress === 100) return { label: 'Completed', cls: 'badge-completed' };
    const now = new Date();
    if (goal.dueDate && new Date(goal.dueDate) < now && progress < 100)
      return { label: 'Overdue', cls: 'badge-overdue' };
    if (progress > 0) return { label: 'In Progress', cls: 'badge-in-progress' };
    return { label: 'Not Started', cls: 'badge-not-started' };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader />
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div style={{ padding: '2rem' }}>
        <Link to="/employee/performance/goals" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--slate-500)', fontSize: '0.875rem', textDecoration: 'none', marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to My Goals
        </Link>
        <div className="perf-empty-state">
          <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h3>Failed to load goal</h3>
          <p>{error}</p>
          <button onClick={fetchGoal} className="btn btn-outline" style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo();
  const progressColor = progress === 100 ? '#10b981' : progress >= 50 ? '#f59e0b' : 'var(--primary-600)';
  const hasChanged = progress !== (goal.progress ?? 0);

  return (
    <div className="goal-detail-page">
      {/* Back */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/employee/performance/goals" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--slate-500)', fontSize: '0.875rem', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back to My Goals
        </Link>
      </div>

      {/* Hero */}
      <div className="goal-detail-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={22} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>My Goal</div>
              <span className={`badge ${statusInfo.cls}`} style={{ padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700 }}>
                {statusInfo.label}
              </span>
            </div>
          </div>
          <span className={`badge priority-${goal.priority?.toLowerCase()}`} style={{ padding: '0.3rem 0.85rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700 }}>
            {goal.priority} Priority
          </span>
        </div>

        <div className="goal-detail-title">{goal.title}</div>
        {goal.description && (
          <div style={{ fontSize: '0.9rem', opacity: 0.75, marginTop: '0.75rem', lineHeight: 1.6 }}>{goal.description}</div>
        )}

        {/* Progress display */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.82rem', opacity: 0.7 }}>Current Progress</span>
            <span style={{ fontWeight: 800, fontSize: '1.5rem', color: '#fbbf24', lineHeight: 1 }}>{goal.progress}%</span>
          </div>
          <div style={{ height: 10, background: 'rgba(255,255,255,0.15)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${goal.progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
              borderRadius: 999,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Progress Control */}
      <div className="progress-control">
        <h3>Update My Progress</h3>

        <div className="progress-slider-wrapper">
          <div className="progress-slider-header">
            <span className="progress-slider-label">Drag to set your progress</span>
            <span className="progress-slider-value" style={{ color: progressColor }}>{progress}%</span>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="progress-slider"
            id="goal-progress-slider"
            style={{ '--progress-color': progressColor }}
          />

          {/* Quick select */}
          <div className="progress-quick-btns">
            {QUICK_VALUES.map((v) => (
              <button
                key={v}
                className={`progress-quick-btn ${progress === v ? 'active' : ''}`}
                onClick={() => setProgress(v)}
                id={`progress-quick-${v}`}
              >
                {v}%
              </button>
            ))}
          </div>

          {/* Status preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--slate-500)', paddingTop: '0.5rem' }}>
            <span>Status will become:</span>
            <span className={`badge ${statusInfo.cls}`} style={{ padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
              {statusInfo.label}
            </span>
          </div>

          {/* Save */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !hasChanged}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'center' }}
              id="goal-save-progress-btn"
            >
              {saving ? <Loader size="sm" /> : <Save size={16} />}
              {saving ? 'Saving...' : hasChanged ? 'Save Progress' : 'No Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Read-only Details */}
      <div className="goal-detail-grid">
        <div className="goal-detail-card">
          <h3><User size={14} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} /> Assignment</h3>
          <div className="goal-info-row">
            <span className="goal-info-label">Assigned By</span>
            <span className="goal-info-value">{goal.assignedBy?.name || '—'}</span>
          </div>
          <div className="goal-info-row">
            <span className="goal-info-label">Priority</span>
            <span className={`badge priority-${goal.priority?.toLowerCase()}`} style={{ padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
              {goal.priority}
            </span>
          </div>
        </div>
        <div className="goal-detail-card">
          <h3><Calendar size={14} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} /> Timeline</h3>
          <div className="goal-info-row">
            <span className="goal-info-label">Start Date</span>
            <span className="goal-info-value">{fmtDate(goal.startDate)}</span>
          </div>
          <div className="goal-info-row">
            <span className="goal-info-label">Due Date</span>
            <span className="goal-info-value" style={{ color: goal.isOverdue ? '#ef4444' : 'inherit' }}>
              {fmtDate(goal.dueDate)}
              {goal.isOverdue && <span style={{ fontSize: '0.7rem', fontWeight: 700, marginLeft: '0.4rem' }}>OVERDUE</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Read-only notice */}
      <div style={{ background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: '0.875rem 1.25rem', fontSize: '0.82rem', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <AlertCircle size={15} />
        You can only update your progress. Goal details, priority, and dates are managed by your manager.
      </div>
    </div>
  );
}
