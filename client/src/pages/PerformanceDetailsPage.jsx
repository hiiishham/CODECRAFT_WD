import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Star, Target, User, Calendar, TrendingUp,
  CheckCircle, Clock, AlertCircle, RefreshCw, Plus,
} from 'lucide-react';
import { performanceService } from '../services/performanceService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/performance.css';

const StarDisplay = ({ rating, size = '1rem' }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} style={{ fontSize: size }}>{i <= Math.round(rating) ? '⭐' : '☆'}</span>
    );
  }
  return <span style={{ display: 'inline-flex', gap: '0.1rem' }}>{stars}</span>;
};

const ProgressBar = ({ value }) => {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct === 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
      <div style={{ flex: 1, height: 7, background: 'var(--slate-200)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-600)', minWidth: 34 }}>{pct}%</span>
    </div>
  );
};

export default function PerformanceDetailsPage() {
  const { id } = useParams();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await performanceService.getPerformanceById(id);
      setReview(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load performance review');
      showToast('error', 'Failed to load review details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReview(); }, [id]);

  const getInitials = (name = '') =>
    name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  const getGoalStatusClass = (goal) => {
    if (goal.progress === 100) return 'badge-completed';
    const now = new Date();
    if (goal.dueDate && new Date(goal.dueDate) < now && goal.progress < 100) return 'badge-overdue';
    if (goal.progress > 0) return 'badge-in-progress';
    return 'badge-not-started';
  };

  const getGoalStatusLabel = (goal) => {
    if (goal.progress === 100) return 'Completed';
    const now = new Date();
    if (goal.dueDate && new Date(goal.dueDate) < now && goal.progress < 100) return 'Overdue';
    if (goal.progress > 0) return 'In Progress';
    return 'Not Started';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div style={{ padding: '2rem' }}>
        <Link to="/performance" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--slate-500)', fontSize: '0.875rem', textDecoration: 'none', marginBottom: '1.5rem' }}>
          <ArrowLeft size={16} /> Back to Performance
        </Link>
        <div className="perf-empty-state">
          <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h3>Unable to load performance review</h3>
          <p>{error}</p>
          <button onClick={fetchReview} className="btn btn-outline" style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const emp = review.employee || {};
  const goals = review.goals || [];

  return (
    <div className="performance-page">
      {/* Back */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/performance" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--slate-500)', fontSize: '0.875rem', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back to Performance
        </Link>
        <Link
          to="/performance/reviews/add"
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} /> New Review
        </Link>
      </div>

      {/* Hero */}
      <div className="perf-hero-section" style={{ marginBottom: '1.5rem' }}>
        <div className="perf-hero-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div className="perf-avatar" style={{ width: 64, height: 64, fontSize: '1.2rem', borderRadius: 16, background: 'rgba(255,255,255,0.15)', color: 'white', flexShrink: 0 }}>
                {emp.profileImage ? <img src={emp.profileImage} alt="" /> : getInitials(emp.fullName)}
              </div>
              <div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.2 }}>{emp.fullName || '—'}</div>
                <div style={{ fontSize: '0.82rem', opacity: 0.7 }}>{emp.designation || ''} · {emp.department?.name || ''}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.55, marginTop: '0.2rem' }}>{emp.employeeId || ''}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.25rem' }}>Review Period</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{review.reviewPeriod}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.25rem' }}>Overall Rating</div>
            <div className="perf-hero-rating">{review.overallRating}/5</div>
            <div className="perf-hero-stars">
              <StarDisplay rating={review.overallRating} size="1.5rem" />
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="goal-detail-grid">
        {/* Review Info */}
        <div className="goal-detail-card">
          <h3><Star size={14} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} /> Review Details</h3>
          <div className="goal-info-row">
            <span className="goal-info-label">Status</span>
            <span className={`badge ${review.status === 'Reviewed' ? 'badge-reviewed' : review.status === 'Submitted' ? 'badge-submitted' : 'badge-draft'}`}
              style={{ padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
              {review.status}
            </span>
          </div>
          <div className="goal-info-row">
            <span className="goal-info-label">Rating</span>
            <span className="goal-info-value">
              {review.overallRating}/5 <StarDisplay rating={review.overallRating} size="0.85rem" />
            </span>
          </div>
          <div className="goal-info-row">
            <span className="goal-info-label">Reviewed By</span>
            <span className="goal-info-value">{review.reviewedBy?.name || '—'}</span>
          </div>
          <div className="goal-info-row">
            <span className="goal-info-label">Review Date</span>
            <span className="goal-info-value">{fmtDate(review.reviewedAt)}</span>
          </div>
        </div>

        {/* Employee Info */}
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
            <span className="goal-info-label">Designation</span>
            <span className="goal-info-value">{emp.designation || '—'}</span>
          </div>
        </div>
      </div>

      {/* Feedback Sections */}
      {review.strengths && (
        <div className="perf-feedback-section">
          <div className="perf-section-title">
            <CheckCircle size={17} color="#10b981" /> Strengths
          </div>
          <div className="perf-feedback-text">{review.strengths}</div>
        </div>
      )}
      {review.areasForImprovement && (
        <div className="perf-feedback-section">
          <div className="perf-section-title">
            <TrendingUp size={17} color="#f59e0b" /> Areas for Improvement
          </div>
          <div className="perf-feedback-text">{review.areasForImprovement}</div>
        </div>
      )}
      {review.managerFeedback && (
        <div className="perf-feedback-section">
          <div className="perf-section-title">
            <Star size={17} color="var(--primary-500)" /> Manager Feedback
          </div>
          <div className="perf-feedback-text">"{review.managerFeedback}"</div>
          <div className="perf-feedback-meta">— {review.reviewedBy?.name || 'Manager'}, {fmtDate(review.reviewedAt)}</div>
        </div>
      )}

      {/* Goals */}
      <div className="performance-table-section">
        <div className="performance-table-header">
          <span className="performance-table-title">
            <Target size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Employee Goals ({goals.length})
          </span>
          <Link to="/performance/goals/add" className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={14} /> Add Goal
          </Link>
        </div>
        {goals.length === 0 ? (
          <div className="perf-empty-state">
            <div className="empty-icon">🎯</div>
            <h3>No goals assigned</h3>
            <p>Assign goals to this employee to track their objectives.</p>
          </div>
        ) : (
          <div className="performance-table-wrapper">
            <table className="performance-table">
              <thead>
                <tr>
                  <th>Goal</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {goals.map((goal) => (
                  <tr key={goal._id}>
                    <td style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{goal.title}</td>
                    <td>
                      <span className={`badge priority-${goal.priority?.toLowerCase()}`}
                        style={{ padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
                        {goal.priority}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
                      {goal.dueDate ? new Date(goal.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ minWidth: 140 }}><ProgressBar value={goal.progress} /></td>
                    <td>
                      <span className={`badge ${getGoalStatusClass(goal)}`}
                        style={{ padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
                        {getGoalStatusLabel(goal)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
