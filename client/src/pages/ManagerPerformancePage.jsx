import { useState, useEffect } from 'react';
import { Target, TrendingUp, Award, BarChart2, CheckCircle, Clock } from 'lucide-react';
import managerService from '../services/managerService.js';
import Loader from '../components/common/Loader.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Link, useLocation } from 'react-router-dom';

const ManagerPerformancePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const employeeFilter = queryParams.get('employee') || '';

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const res = await managerService.getTeamPerformance();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      showToast('error', 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;
  if (!data) return null;

  // Filter reviews and goals if a specific employee was passed
  let reviews = data.reviews || [];
  let goals = data.goals || [];

  if (employeeFilter) {
    reviews = reviews.filter(r => (r.employee?._id || r.employee) === employeeFilter);
    goals = goals.filter(g => (g.employee?._id || g.employee) === employeeFilter);
  }

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>Team Performance</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.5rem', fontSize: '0.875rem' }}>Overview of team reviews and active goals.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/performance/goals" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Target size={16} /> Manage Goals
          </Link>
          <Link to="/performance/reviews/add" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <Award size={16} /> Create Review
          </Link>
        </div>
      </div>

      {!employeeFilter && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'var(--primary-50)', color: 'var(--primary-600)', borderRadius: '50%' }}><Target size={24} /></div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', margin: 0, fontWeight: 500 }}>Active Goals</p>
              <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700 }}>{data.totalGoals || 0}</h2>
            </div>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '50%' }}><Award size={24} /></div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', margin: 0, fontWeight: 500 }}>Total Reviews</p>
              <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700 }}>{data.totalReviews || 0}</h2>
            </div>
          </div>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: '#f3e8ff', color: '#7e22ce', borderRadius: '50%' }}><TrendingUp size={24} /></div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', margin: 0, fontWeight: 500 }}>Average Rating</p>
              <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700 }}>{data.avgRating ? data.avgRating.toFixed(1) : '0.0'}/5.0</h2>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--slate-800)', marginBottom: '1rem' }}>Team Performance Reviews</h2>
      <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Employee</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Review Period</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Review Date</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Rating</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                    No reviews found.
                  </td>
                </tr>
              ) : (
                reviews.map((rev) => (
                  <tr key={rev._id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                    <td style={{ padding: '1rem' }}>
                      <p style={{ margin: 0, fontWeight: 500, color: 'var(--slate-900)' }}>{rev.employee?.fullName || '—'}</p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{rev.employee?.employeeId}</span>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--slate-600)' }}>
                      {rev.reviewPeriod || '—'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--slate-600)' }}>
                      {rev.reviewedAt ? new Date(rev.reviewedAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: rev.overallRating >= 4 ? '#10b981' : (rev.overallRating >= 3 ? '#f59e0b' : '#ef4444') }}>
                          {rev.overallRating}/5 ⭐
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--slate-600)', maxWidth: 280 }}>
                      <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rev.managerFeedback || (Array.isArray(rev.strengths) ? rev.strengths.join(', ') : rev.strengths) || 'N/A'}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Goals Section */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--slate-800)', marginBottom: '1rem' }}>Team Goals</h2>
      <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Goal</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Employee</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Priority</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Progress</th>
                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {goals.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                    No goals found.
                  </td>
                </tr>
              ) : (
                goals.map((g) => (
                  <tr key={g._id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                    <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--slate-900)' }}>
                      {g.title}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--slate-600)' }}>
                      {g.employee?.fullName || '—'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge priority-${g.priority?.toLowerCase()}`} style={{ padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
                        {g.priority}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--slate-200)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${g.progress}%`, height: '100%', background: g.progress === 100 ? '#10b981' : '#f59e0b', borderRadius: 999 }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-600)' }}>{g.progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: 999,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: g.status === 'Completed' ? '#dcfce7' : (g.status === 'In Progress' ? '#fef3c7' : '#f1f5f9'),
                        color: g.status === 'Completed' ? '#166534' : (g.status === 'In Progress' ? '#b45309' : '#475569')
                      }}>
                        {g.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagerPerformancePage;
