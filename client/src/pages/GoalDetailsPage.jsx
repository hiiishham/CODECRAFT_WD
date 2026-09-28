import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, User, Calendar, Pencil, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { goalService } from '../services/goalService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/performance.css';

const ProgressBar = ({ value }) => {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct === 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
        <span style={{ color: 'var(--slate-600)', fontWeight: 500 }}>Progress</span>
        <span style={{ fontWeight: 800, color: 'var(--slate-900)', fontSize: '1.1rem' }}>{pct}%</span>
      </div>
      <div style={{ height: 10, background: 'var(--slate-200)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
};

export default function GoalDetailsPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchGoal = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await goalService.getGoalById(id);
      setGoal(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load goal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGoal(); }, [id]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete goal "${goal.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await goalService.deleteGoal(id);
      showToast('success', 'Goal deleted');
      navigate('/performance/goals');
    } catch (err) {
      showToast('error', err.message || 'Failed to delete goal');
    } finally {
      setDeleting(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  const getStatusInfo = (goal) => {
    if (!goal) return { label: '—', cls: '' };
    if (goal.progress === 100) return { label: 'Completed', cls: 'badge-completed' };
    const now = new Date();
    if (goal.dueDate && new Date(goal.dueDate) < now && goal.progress < 100)
      return { label: 'Overdue', cls: 'badge-overdue' };
    if (goal.progress > 0) return { label: 'In Progress', cls: 'badge-in-progress' };
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
        <Link to="/performance/goals" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--slate-500)', fontSize: '0.875rem', textDecoration: 'none', marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to Goals
        </Link>
        <div className="perf-empty-state">
          <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h3>Failed to load goal</h3>
          <p>{error}</p>
          <button onClick={fetchGoal} className="btn btn-outline" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const status = getStatusInfo(goal);
  const emp = goal.employee || {};

  return (
    <div className="goal-detail-page">
      {/* Back & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link to="/performance/goals" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--slate-500)', fontSize: '0.875rem', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back to Goals
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to={`/performance/goals/${id}/edit`} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Pencil size={15} /> Edit
          </Link>
          <button
            className="btn"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 size={15} /> {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="goal-detail-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={22} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Goal</div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Performance objective</div>
            </div>
          </div>
          <span className={`badge ${status.cls}`} style={{ padding: '0.4rem 1rem', borderRadius: 999, fontSize: '0.82rem', fontWeight: 700 }}>
            {status.label}
          </span>
        </div>
        <div className="goal-detail-title">{goal.title}</div>
        {goal.description && (
          <div style={{ fontSize: '0.9rem', opacity: 0.75, marginTop: '0.75rem', lineHeight: 1.6 }}>{goal.description}</div>
        )}
        <div style={{ marginTop: '1.5rem' }}>
          <ProgressBar value={goal.progress} />
        </div>
      </div>

      {/* Info Cards */}
      <div className="goal-detail-grid">
        <div className="goal-detail-card">
          <h3><User size={14} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} /> Employee</h3>
          <div className="goal-info-row">
            <span className="goal-info-label">Name</span>
            <span className="goal-info-value">{emp.fullName || '—'}</span>
          </div>
          <div className="goal-info-row">
            <span className="goal-info-label">Employee ID</span>
            <span className="goal-info-value">{emp.employeeId || '—'}</span>
          </div>
          <div className="goal-info-row">
            <span className="goal-info-label">Department</span>
            <span className="goal-info-value">{emp.department?.name || '—'}</span>
          </div>
          <div className="goal-info-row">
            <span className="goal-info-label">Assigned By</span>
            <span className="goal-info-value">{goal.assignedBy?.name || '—'}</span>
          </div>
        </div>
        <div className="goal-detail-card">
          <h3><Calendar size={14} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} /> Timeline & Details</h3>
          <div className="goal-info-row">
            <span className="goal-info-label">Priority</span>
            <span className={`badge priority-${goal.priority?.toLowerCase()}`} style={{ padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
              {goal.priority}
            </span>
          </div>
          <div className="goal-info-row">
            <span className="goal-info-label">Start Date</span>
            <span className="goal-info-value">{fmtDate(goal.startDate)}</span>
          </div>
          <div className="goal-info-row">
            <span className="goal-info-label">Due Date</span>
            <span className="goal-info-value" style={{ color: goal.isOverdue ? '#ef4444' : 'inherit' }}>
              {fmtDate(goal.dueDate)}
              {goal.isOverdue && <span style={{ fontSize: '0.72rem', marginLeft: '0.4rem', fontWeight: 600 }}>OVERDUE</span>}
            </span>
          </div>
          <div className="goal-info-row">
            <span className="goal-info-label">Progress</span>
            <span className="goal-info-value">{goal.progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
