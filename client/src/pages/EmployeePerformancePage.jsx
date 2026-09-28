import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Target, CheckCircle, AlertCircle,
  Star, RefreshCw, Calendar, ChevronRight,
} from 'lucide-react';
import { performanceService } from '../services/performanceService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/performance.css';

const StarDisplay = ({ rating, size = '1.1rem' }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} style={{ fontSize: size }}>{i <= Math.round(rating) ? '⭐' : '☆'}</span>
    );
  }
  return <span style={{ display: 'inline-flex', gap: '0.1rem' }}>{stars}</span>;
};

const ProgressBar = ({ value, color }) => {
  const pct = Math.min(100, Math.max(0, value || 0));
  const bg = color || (pct === 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e');
  return (
    <div style={{ height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: bg, borderRadius: 999, transition: 'width 0.6s ease' }} />
    </div>
  );
};

const GoalStatusBadge = ({ goal }) => {
  const now = new Date();
  const isOverdue = goal.dueDate && new Date(goal.dueDate) < now && goal.progress < 100;
  if (goal.progress === 100) return <span className="badge badge-completed" style={{ padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>Completed</span>;
  if (isOverdue) return <span className="badge badge-overdue" style={{ padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>Overdue</span>;
  if (goal.progress > 0) return <span className="badge badge-in-progress" style={{ padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>In Progress</span>;
  return <span className="badge badge-not-started" style={{ padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>Not Started</span>;
};

export default function EmployeePerformancePage() {
  const { showToast } = useToast();
  const [summary, setSummary] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await performanceService.getMyPerformanceSummary();
      setSummary(res.data);
      setGoals(res.data?.activeGoals || []);
    } catch (err) {
      setError(err.message || 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="performance-page">
        <div className="perf-empty-state">
          <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h3>Unable to load performance data</h3>
          <p>{error}</p>
          <button onClick={fetchData} className="btn btn-outline" style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const latestReview = summary?.latestReview;
  const reviews = summary?.reviewHistory || [];
  const taskStats = summary?.taskStats || {};
  const goalStats = summary?.goalStats || {};
  const attendanceStats = summary?.attendanceStats || {};

  return (
    <div className="performance-page">
      {/* Header */}
      <div className="performance-header">
        <div className="performance-header-left">
          <h1>My Performance</h1>
          <p>Track your goals, ratings, and manager feedback</p>
        </div>
        <button onClick={fetchData} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Hero: Rating */}
      <div className="perf-hero-section">
        <div className="perf-hero-grid">
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.65, marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Overall Performance Rating
            </div>
            {latestReview ? (
              <>
                <div className="perf-hero-rating">{latestReview.overallRating} / 5</div>
                <div className="perf-hero-stars">
                  <StarDisplay rating={latestReview.overallRating} size="1.6rem" />
                </div>
                <div className="perf-hero-label">{latestReview.reviewPeriod}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>— / 5</div>
                <div className="perf-hero-label">No reviews yet</div>
              </>
            )}
          </div>
          <div className="perf-hero-stats">
            <div className="perf-hero-stat">
              <div className="perf-hero-stat-value">
                {taskStats.completionRate != null ? `${taskStats.completionRate}%` : '—'}
              </div>
              <div className="perf-hero-stat-label">Task Completion</div>
            </div>
            <div className="perf-hero-stat">
              <div className="perf-hero-stat-value">
                {attendanceStats.attendanceRate != null ? `${attendanceStats.attendanceRate}%` : '—'}
              </div>
              <div className="perf-hero-stat-label">Attendance Rate</div>
            </div>
            <div className="perf-hero-stat">
              <div className="perf-hero-stat-value">
                {goalStats.completionRate != null ? `${goalStats.completionRate}%` : '—'}
              </div>
              <div className="perf-hero-stat-label">Goals Completed</div>
            </div>
            <div className="perf-hero-stat">
              <div className="perf-hero-stat-value">{reviews.length}</div>
              <div className="perf-hero-stat-label">Total Reviews</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="perf-summary-grid">
        {/* Tasks */}
        <div className="perf-summary-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={22} color="var(--primary-600)" />
            </div>
          </div>
          <div className="perf-summary-value" style={{ color: 'var(--primary-600)' }}>
            {taskStats.completionRate != null ? `${taskStats.completionRate}%` : '—'}
          </div>
          <div className="perf-summary-label">Task Completion</div>
          <div className="perf-summary-sublabel">
            {taskStats.completed ?? 0} / {taskStats.total ?? 0} tasks done
          </div>
        </div>

        {/* Attendance */}
        <div className="perf-summary-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={22} color="#10b981" />
            </div>
          </div>
          <div className="perf-summary-value" style={{ color: '#10b981' }}>
            {attendanceStats.attendanceRate != null ? `${attendanceStats.attendanceRate}%` : '—'}
          </div>
          <div className="perf-summary-label">Attendance Rate</div>
          <div className="perf-summary-sublabel">
            {attendanceStats.attendanceRate != null
              ? `${attendanceStats.late ?? 0} late day${attendanceStats.late !== 1 ? 's' : ''}`
              : 'Data unavailable'}
          </div>
        </div>

        {/* Goals */}
        <div className="perf-summary-card">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={22} color="#f59e0b" />
            </div>
          </div>
          <div className="perf-summary-value" style={{ color: '#f59e0b' }}>
            {goalStats.completionRate != null ? `${goalStats.completionRate}%` : '—'}
          </div>
          <div className="perf-summary-label">Goals Completion</div>
          <div className="perf-summary-sublabel">
            {goalStats.completed ?? 0} / {goalStats.total ?? 0} goals done
          </div>
        </div>
      </div>

      {/* Manager Feedback */}
      {latestReview?.managerFeedback && (
        <div className="perf-feedback-section">
          <div className="perf-section-title">
            <Star size={17} color="var(--primary-500)" /> Latest Manager Feedback
          </div>
          <div className="perf-feedback-text">"{latestReview.managerFeedback}"</div>
          <div className="perf-feedback-meta">
            — {latestReview.reviewedBy?.name || 'Your Manager'}, {fmtDate(latestReview.reviewedAt)}
            <span style={{ marginLeft: '1rem' }}>
              Period: <strong>{latestReview.reviewPeriod}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Strengths */}
      {latestReview?.strengths && (
        <div className="perf-feedback-section">
          <div className="perf-section-title"><CheckCircle size={17} color="#10b981" /> Strengths</div>
          <div className="perf-feedback-text">{latestReview.strengths}</div>
        </div>
      )}

      {/* Areas for Improvement */}
      {latestReview?.areasForImprovement && (
        <div className="perf-feedback-section">
          <div className="perf-section-title"><TrendingUp size={17} color="#f59e0b" /> Areas for Improvement</div>
          <div className="perf-feedback-text">{latestReview.areasForImprovement}</div>
        </div>
      )}

      {/* Active Goals */}
      <div className="performance-table-section">
        <div className="performance-table-header">
          <span className="performance-table-title">
            <Target size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            My Active Goals
          </span>
          <Link to="/employee/performance/goals" className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            View All <ChevronRight size={14} />
          </Link>
        </div>

        {goals.length === 0 ? (
          <div className="perf-empty-state">
            <div className="empty-icon">🎯</div>
            <h3>No active goals</h3>
            <p>Your manager will assign performance goals here.</p>
          </div>
        ) : (
          <div style={{ padding: '0.5rem 0' }}>
            {goals.map((goal) => (
              <Link
                key={goal._id}
                to={`/employee/performance/goals/${goal._id}`}
                style={{ display: 'block', textDecoration: 'none', padding: '1rem 1.5rem', borderBottom: '1px solid var(--slate-100)', transition: 'background 0.15s' }}
                className="goal-row-link"
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--slate-50)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{goal.title}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`badge priority-${goal.priority?.toLowerCase()}`} style={{ padding: '0.2rem 0.6rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>
                      {goal.priority}
                    </span>
                    <GoalStatusBadge goal={goal} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ flex: 1, height: 7, background: 'var(--slate-200)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{
                      width: `${goal.progress}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: goal.progress === 100 ? '#10b981' : goal.progress >= 50 ? '#f59e0b' : 'var(--primary-600)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-600)', minWidth: 34 }}>{goal.progress}%</span>
                  <ChevronRight size={16} style={{ color: 'var(--slate-400)', flexShrink: 0 }} />
                </div>
                {goal.dueDate && (
                  <div style={{ fontSize: '0.75rem', color: goal.isOverdue ? '#ef4444' : 'var(--slate-400)', marginTop: '0.4rem' }}>
                    Due: {new Date(goal.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {goal.isOverdue && <span style={{ fontWeight: 700, marginLeft: '0.3rem' }}>— OVERDUE</span>}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Review History */}
      <div className="perf-feedback-section">
        <div className="perf-section-title">
          <Star size={17} color="var(--primary-500)" /> Performance Review History
          {reviews.length > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--slate-400)', fontWeight: 400 }}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>}
        </div>

        {reviews.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-400)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
            <div style={{ fontSize: '0.875rem' }}>No performance reviews yet.</div>
          </div>
        ) : (
          <div className="review-history">
            {reviews.map((review) => (
              <div key={review._id} className="review-history-item">
                <div className="review-dot" />
                <div className="review-history-content">
                  <div className="review-period">{review.reviewPeriod}</div>
                  <div className="review-rating-row">
                    <span className="review-rating-value">{review.overallRating}/5</span>
                    <StarDisplay rating={review.overallRating} size="0.9rem" />
                    <span className={`badge ${review.status === 'Reviewed' ? 'badge-reviewed' : 'badge-submitted'}`}
                      style={{ padding: '0.15rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600 }}>
                      {review.status}
                    </span>
                  </div>
                  {review.managerFeedback && (
                    <div className="review-feedback-snippet">"{review.managerFeedback}"</div>
                  )}
                  <div className="review-date">
                    {fmtDate(review.reviewedAt)} · Reviewed by {review.reviewedBy?.name || 'Manager'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
