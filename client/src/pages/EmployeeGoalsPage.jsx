import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { goalService } from '../services/goalService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/performance.css';

const GoalStatusBadge = ({ goal }) => {
  const now = new Date();
  const isOverdue = goal.dueDate && new Date(goal.dueDate) < now && goal.progress < 100;
  if (goal.progress === 100) return <span className="badge badge-completed" style={{ padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>Completed</span>;
  if (isOverdue) return <span className="badge badge-overdue" style={{ padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>Overdue</span>;
  if (goal.progress > 0) return <span className="badge badge-in-progress" style={{ padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>In Progress</span>;
  return <span className="badge badge-not-started" style={{ padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>Not Started</span>;
};

export default function EmployeeGoalsPage() {
  const { showToast } = useToast();
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, inProgress: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');

  const fetchGoals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await goalService.getMyGoals();
      setGoals(res.data || []);
      setStats(res.stats || { total: 0, completed: 0, inProgress: 0, overdue: 0 });
    } catch (err) {
      setError(err.message || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGoals(); }, []);

  const filtered = filter === 'All'
    ? goals
    : goals.filter((g) => {
        if (filter === 'Completed') return g.progress === 100;
        const now = new Date();
        const isOverdue = g.dueDate && new Date(g.dueDate) < now && g.progress < 100;
        if (filter === 'Overdue') return isOverdue;
        if (filter === 'In Progress') return g.progress > 0 && g.progress < 100 && !isOverdue;
        if (filter === 'Not Started') return g.progress === 0 && !isOverdue;
        return true;
      });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader />
      </div>
    );
  }

  return (
    <div className="performance-page">
      <div className="performance-header">
        <div className="performance-header-left">
          <h1>My Goals</h1>
          <p>Track your performance objectives and progress</p>
        </div>
        <div className="performance-header-actions">
          <Link to="/employee/performance" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            ← Performance
          </Link>
          <button onClick={fetchGoals} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="performance-kpi-grid">
        <div className="perf-kpi-card blue">
          <div className="perf-kpi-icon"><Target size={22} /></div>
          <div className="perf-kpi-content">
            <div className="perf-kpi-value">{stats.total}</div>
            <div className="perf-kpi-label">Total Goals</div>
          </div>
        </div>
        <div className="perf-kpi-card green">
          <div className="perf-kpi-icon"><span style={{ fontSize: '1.2rem' }}>✅</span></div>
          <div className="perf-kpi-content">
            <div className="perf-kpi-value">{stats.completed}</div>
            <div className="perf-kpi-label">Completed</div>
          </div>
        </div>
        <div className="perf-kpi-card amber">
          <div className="perf-kpi-icon"><span style={{ fontSize: '1.2rem' }}>⚙️</span></div>
          <div className="perf-kpi-content">
            <div className="perf-kpi-value">{stats.inProgress}</div>
            <div className="perf-kpi-label">In Progress</div>
          </div>
        </div>
        <div className="perf-kpi-card rose">
          <div className="perf-kpi-icon"><AlertCircle size={22} /></div>
          <div className="perf-kpi-content">
            <div className="perf-kpi-value">{stats.overdue}</div>
            <div className="perf-kpi-label">Overdue</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {['All', 'Not Started', 'In Progress', 'Completed', 'Overdue'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            id={`goal-filter-tab-${f.replace(' ', '-').toLowerCase()}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={18} />
          {error}
          <button onClick={fetchGoals} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* Goal Cards */}
      {filtered.length === 0 ? (
        <div className="perf-empty-state">
          <div className="empty-icon">🎯</div>
          <h3>No goals {filter !== 'All' ? `with status "${filter}"` : 'assigned'}</h3>
          <p>
            {filter !== 'All'
              ? 'Try a different filter to see more goals.'
              : 'Your manager will assign performance goals here.'}
          </p>
        </div>
      ) : (
        <div className="goal-cards-grid">
          {filtered.map((goal) => {
            const now = new Date();
            const isOverdue = goal.dueDate && new Date(goal.dueDate) < now && goal.progress < 100;
            const progressColor = goal.progress === 100 ? '#10b981' : goal.progress >= 50 ? '#f59e0b' : 'var(--primary-600)';
            return (
              <Link
                key={goal._id}
                to={`/employee/performance/goals/${goal._id}`}
                className={`goal-card ${isOverdue ? 'overdue' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="goal-card-header">
                  <div className="goal-card-title">{goal.title}</div>
                  <span className={`badge priority-${goal.priority?.toLowerCase()}`} style={{ padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600, flexShrink: 0 }}>
                    {goal.priority}
                  </span>
                </div>

                {goal.description && (
                  <div className="goal-card-description">{goal.description}</div>
                )}

                <div className="goal-card-progress">
                  <div className="goal-card-progress-header">
                    <span className="goal-card-progress-label">Progress</span>
                    <span className="goal-card-progress-value">{goal.progress}%</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--slate-200)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${goal.progress}%`, height: '100%', background: progressColor, borderRadius: 999, transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                <div className="goal-card-footer">
                  <div>
                    <GoalStatusBadge goal={goal} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: isOverdue ? '#ef4444' : 'var(--slate-400)' }}>
                    {goal.dueDate && (
                      <>
                        Due {new Date(goal.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </>
                    )}
                    <ChevronRight size={15} style={{ color: 'var(--slate-400)' }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
