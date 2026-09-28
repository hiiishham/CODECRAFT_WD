import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp, Star, Target, Users, Clock, Plus, Eye,
  RefreshCw, AlertCircle, BarChart2, ChevronRight,
} from 'lucide-react';
import { performanceService } from '../services/performanceService.js';
import { employeeService } from '../services/employeeService.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/performance.css';

const StarDisplay = ({ rating }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} className="star-icon" style={{ fontSize: '0.9rem' }}>
        {i <= Math.round(rating) ? '⭐' : '☆'}
      </span>
    );
  }
  return <span className="star-rating-display">{stars}</span>;
};

const StatusBadge = ({ status }) => {
  const map = {
    Draft: 'badge-draft',
    Submitted: 'badge-submitted',
    Reviewed: 'badge-reviewed',
  };
  return (
    <span className={`badge ${map[status] || 'badge-draft'}`} style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
      {status}
    </span>
  );
};

export default function PerformancePage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ search: '', employee: 'All', status: 'All', page: 1, limit: 10 });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, reviewsRes, empsRes] = await Promise.all([
        performanceService.getPerformanceStats(),
        performanceService.getPerformances(filters),
        employeeService.getEmployees({ limit: 200 }),
      ]);
      setStats(statsRes.data);
      setReviews(reviewsRes.data || []);
      setPagination(reviewsRes.pagination || { total: 0, totalPages: 1 });
      let empList = empsRes.data || empsRes.employees || [];
      if (user?.role === 'manager' && user.department) {
        empList = empList.filter((e) => {
          const deptId = e.department?._id || e.department;
          return deptId?.toString() === user.department?.toString();
        });
      }
      setEmployees(empList);
    } catch (err) {
      setError(err.message || 'Failed to load performance data');
      showToast('error', 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  }, [filters, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const getInitials = (name = '') =>
    name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);

  if (loading && !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader />
      </div>
    );
  }

  return (
    <div className="performance-page">
      {/* Header */}
      <div className="performance-header">
        <div className="performance-header-left">
          <h1>Performance Management</h1>
          <p>Track employee performance reviews and ratings</p>
        </div>
        <div className="performance-header-actions">
          <Link to="/performance/goals" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={16} /> Goals
          </Link>
          <Link to="/performance/reviews/add" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> New Review
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={fetchData} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'inherit', fontSize: '0.82rem' }}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="performance-kpi-grid">
        <div className="perf-kpi-card blue">
          <div className="perf-kpi-icon"><Users size={22} /></div>
          <div className="perf-kpi-content">
            <div className="perf-kpi-value">{stats?.employeesReviewed ?? '—'}</div>
            <div className="perf-kpi-label">Employees Reviewed</div>
          </div>
        </div>
        <div className="perf-kpi-card amber">
          <div className="perf-kpi-icon"><Star size={22} /></div>
          <div className="perf-kpi-content">
            <div className="perf-kpi-value">{stats?.avgRating ? `${stats.avgRating}⭐` : '—'}</div>
            <div className="perf-kpi-label">Average Rating</div>
          </div>
        </div>
        <div className="perf-kpi-card green">
          <div className="perf-kpi-icon"><Target size={22} /></div>
          <div className="perf-kpi-content">
            <div className="perf-kpi-value">{stats?.goalsCompleted ?? '—'}</div>
            <div className="perf-kpi-label">Goals Completed</div>
          </div>
        </div>
        <div className="perf-kpi-card rose">
          <div className="perf-kpi-icon"><Clock size={22} /></div>
          <div className="perf-kpi-content">
            <div className="perf-kpi-value">{stats?.pendingReviews ?? '—'}</div>
            <div className="perf-kpi-label">Pending Reviews</div>
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="performance-table-section">
        <div className="performance-table-header">
          <span className="performance-table-title">
            <BarChart2 size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Performance Reviews ({pagination.total})
          </span>
          <button onClick={fetchData} className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="performance-filters">
          <input
            type="text"
            placeholder="Search employee or period..."
            className="perf-search-input"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            id="perf-search"
          />
          <select
            className="perf-filter-select"
            value={filters.employee}
            onChange={(e) => handleFilterChange('employee', e.target.value)}
            id="perf-filter-employee"
          >
            <option value="All">All Employees</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>{emp.fullName}</option>
            ))}
          </select>
          <select
            className="perf-filter-select"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            id="perf-filter-status"
          >
            <option value="All">All Status</option>
            <option>Draft</option>
            <option>Submitted</option>
            <option>Reviewed</option>
          </select>
        </div>

        {/* Table */}
        <div className="performance-table-wrapper">
          {loading ? (
            <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><Loader /></div>
          ) : reviews.length === 0 ? (
            <div className="perf-empty-state">
              <div className="empty-icon">📊</div>
              <h3>No performance reviews yet</h3>
              <p>Create the first performance review to get started.</p>
              <Link to="/performance/reviews/add" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={16} /> Create Review
              </Link>
            </div>
          ) : (
            <table className="performance-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Review Period</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Reviewed By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review._id}>
                    <td>
                      <div className="perf-employee-cell">
                        <div className="perf-avatar">
                          {review.employee?.profileImage ? (
                            <img src={review.employee.profileImage} alt="" />
                          ) : (
                            getInitials(review.employee?.fullName)
                          )}
                        </div>
                        <div>
                          <div className="perf-employee-name">{review.employee?.fullName || '—'}</div>
                          <div className="perf-employee-id">{review.employee?.employeeId || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td>{review.employee?.department?.name || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{review.reviewPeriod}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <StarDisplay rating={review.overallRating} />
                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{review.overallRating}/5</span>
                      </div>
                    </td>
                    <td><StatusBadge status={review.status} /></td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>{review.reviewedBy?.name || '—'}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--slate-400)' }}>
                      {review.reviewedAt ? new Date(review.reviewedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/performance/${review._id}`)}
                        className="btn btn-sm btn-outline"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        title="View Details"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--slate-100)' }}>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => handleFilterChange('page', filters.page - 1)}
              disabled={filters.page <= 1}
            >Prev</button>
            <span style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>
              Page {filters.page} of {pagination.totalPages}
            </span>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => handleFilterChange('page', filters.page + 1)}
              disabled={filters.page >= pagination.totalPages}
            >Next</button>
          </div>
        )}
      </div>

      {/* Quick Link to Goals */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--slate-200)', borderRadius: 16, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--slate-900)', marginBottom: '0.2rem' }}>
            <Target size={16} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'middle' }} />
            Goals Management
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
            {stats ? `${stats.goalsCompleted} completed · ${stats.goalsInProgress} in progress` : 'View and manage all employee goals'}
          </div>
        </div>
        <Link to="/performance/goals" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Manage Goals <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}
