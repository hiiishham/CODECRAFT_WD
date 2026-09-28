import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Target, Plus, Eye, Pencil, Trash2, RefreshCw, AlertCircle,
} from 'lucide-react';
import { goalService } from '../services/goalService.js';
import { employeeService } from '../services/employeeService.js';
import { departmentService } from '../services/departmentService.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/performance.css';

const ProgressBar = ({ value }) => {
  const pct = Math.min(100, Math.max(0, value));
  const colorClass = pct === 100 ? 'complete' : pct >= 50 ? 'high' : pct > 0 ? 'medium' : 'low';
  return (
    <div className="progress-bar-wrapper">
      <div className="progress-bar-track">
        <div className={`progress-bar-fill ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-bar-label">{pct}%</span>
    </div>
  );
};

const GoalStatusBadge = ({ goal }) => {
  const now = new Date();
  const isOverdue = goal.dueDate && new Date(goal.dueDate) < now && goal.progress < 100;
  if (goal.progress === 100) return <span className="badge badge-completed" style={{ padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>Completed</span>;
  if (isOverdue) return <span className="badge badge-overdue" style={{ padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>Overdue</span>;
  if (goal.progress > 0) return <span className="badge badge-in-progress" style={{ padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>In Progress</span>;
  return <span className="badge badge-not-started" style={{ padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>Not Started</span>;
};

export default function GoalListPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [goals, setGoals] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [filters, setFilters] = useState({ search: '', employee: 'All', department: 'All', priority: 'All', status: 'All', page: 1, limit: 10 });
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, goalsRes, empsRes, deptsRes] = await Promise.all([
        goalService.getGoalStats(),
        goalService.getGoals(filters),
        employeeService.getEmployees({ limit: 200 }),
        departmentService.getDepartments({ limit: 100 }),
      ]);
      setStats(statsRes.data);
      setGoals(goalsRes.data || []);
      setPagination(goalsRes.pagination || { total: 0, totalPages: 1 });
      let empList = empsRes.data || empsRes.employees || [];
      if (user?.role === 'manager' && user.department) {
        empList = empList.filter((e) => {
          const deptId = e.department?._id || e.department;
          return deptId?.toString() === user.department?.toString();
        });
      }
      setEmployees(empList);
      setDepartments(deptsRes.data || deptsRes.departments || []);
    } catch (err) {
      setError(err.message || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, [filters, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleDelete = async (goal) => {
    if (!window.confirm(`Delete goal "${goal.title}"? This cannot be undone.`)) return;
    setDeleting(goal._id);
    try {
      await goalService.deleteGoal(goal._id);
      showToast('success', 'Goal deleted');
      fetchData();
    } catch (err) {
      showToast('error', err.message || 'Failed to delete goal');
    } finally {
      setDeleting(null);
    }
  };

  const getInitials = (name = '') =>
    name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);

  if (loading && !goals.length && !stats) {
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
          <h1>
            <Target size={24} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle', color: 'var(--primary-600)' }} />
            Performance Goals
          </h1>
          <p>Assign and track employee performance goals</p>
        </div>
        <div className="performance-header-actions">
          <Link to="/performance" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            ← Performance
          </Link>
          <Link to="/performance/goals/add" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> New Goal
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="performance-kpi-grid">
        <div className="perf-kpi-card blue">
          <div className="perf-kpi-icon"><Target size={22} /></div>
          <div className="perf-kpi-content">
            <div className="perf-kpi-value">{stats?.total ?? '—'}</div>
            <div className="perf-kpi-label">Total Goals</div>
          </div>
        </div>
        <div className="perf-kpi-card green">
          <div className="perf-kpi-icon"><span style={{ fontSize: '1.2rem' }}>✅</span></div>
          <div className="perf-kpi-content">
            <div className="perf-kpi-value">{stats?.completed ?? '—'}</div>
            <div className="perf-kpi-label">Completed</div>
          </div>
        </div>
        <div className="perf-kpi-card amber">
          <div className="perf-kpi-icon"><span style={{ fontSize: '1.2rem' }}>⚙️</span></div>
          <div className="perf-kpi-content">
            <div className="perf-kpi-value">{stats?.inProgress ?? '—'}</div>
            <div className="perf-kpi-label">In Progress</div>
          </div>
        </div>
        <div className="perf-kpi-card rose">
          <div className="perf-kpi-icon"><AlertCircle size={22} /></div>
          <div className="perf-kpi-content">
            <div className="perf-kpi-value">{stats?.overdue ?? '—'}</div>
            <div className="perf-kpi-label">Overdue</div>
          </div>
        </div>
      </div>

      {/* Goals Table */}
      <div className="performance-table-section">
        <div className="performance-table-header">
          <span className="performance-table-title">Goals ({pagination.total})</span>
          <button onClick={fetchData} className="btn btn-sm btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="performance-filters">
          <input
            type="text"
            placeholder="Search goals or employees..."
            className="perf-search-input"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            id="goal-search"
          />
          <select className="perf-filter-select" value={filters.employee} onChange={(e) => handleFilterChange('employee', e.target.value)} id="goal-filter-employee">
            <option value="All">All Employees</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>{emp.fullName}</option>
            ))}
          </select>
          <select className="perf-filter-select" value={filters.department} onChange={(e) => handleFilterChange('department', e.target.value)} id="goal-filter-dept">
            <option value="All">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
          <select className="perf-filter-select" value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)} id="goal-filter-priority">
            <option value="All">All Priorities</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
          <select className="perf-filter-select" value={filters.status} onChange={(e) => handleFilterChange('status', e.target.value)} id="goal-filter-status">
            <option value="All">All Status</option>
            <option>Not Started</option>
            <option>In Progress</option>
            <option>Completed</option>
            <option>Overdue</option>
          </select>
        </div>

        {/* Table */}
        <div className="performance-table-wrapper">
          {loading ? (
            <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><Loader /></div>
          ) : error ? (
            <div className="perf-empty-state">
              <AlertCircle size={36} style={{ color: '#ef4444' }} />
              <h3>Failed to load goals</h3>
              <p>{error}</p>
              <button onClick={fetchData} className="btn btn-outline" style={{ marginTop: '1rem' }}>Retry</button>
            </div>
          ) : goals.length === 0 ? (
            <div className="perf-empty-state">
              <div className="empty-icon">🎯</div>
              <h3>No goals match your filters</h3>
              <p>Try changing your search or create a new goal.</p>
              <Link to="/performance/goals/add" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={16} /> New Goal
              </Link>
            </div>
          ) : (
            <table className="performance-table">
              <thead>
                <tr>
                  <th>Goal</th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {goals.map((goal) => (
                  <tr key={goal._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--slate-900)', maxWidth: 220 }}>{goal.title}</div>
                    </td>
                    <td>
                      <div className="perf-employee-cell">
                        <div className="perf-avatar">{getInitials(goal.employee?.fullName)}</div>
                        <div>
                          <div className="perf-employee-name">{goal.employee?.fullName || '—'}</div>
                          <div className="perf-employee-id">{goal.employee?.employeeId || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--slate-500)' }}>
                      {goal.employee?.department?.name || '—'}
                    </td>
                    <td>
                      <span className={`badge priority-${goal.priority?.toLowerCase()}`}
                        style={{ padding: '0.2rem 0.65rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600 }}>
                        {goal.priority}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: goal.isOverdue ? '#ef4444' : 'var(--slate-500)', fontWeight: goal.isOverdue ? 600 : 400 }}>
                      {goal.dueDate ? new Date(goal.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ minWidth: 140 }}><ProgressBar value={goal.progress} /></td>
                    <td><GoalStatusBadge goal={goal} /></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => navigate(`/performance/goals/${goal._id}`)}
                          className="btn btn-sm btn-outline"
                          title="View"
                          style={{ padding: '0.3rem 0.6rem' }}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => navigate(`/performance/goals/${goal._id}/edit`)}
                          className="btn btn-sm btn-outline"
                          title="Edit"
                          style={{ padding: '0.3rem 0.6rem' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(goal)}
                          className="btn btn-sm"
                          title="Delete"
                          disabled={deleting === goal._id}
                          style={{ padding: '0.3rem 0.6rem', background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                          {deleting === goal._id ? '...' : <Trash2 size={14} />}
                        </button>
                      </div>
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
            <button className="btn btn-sm btn-outline" onClick={() => handleFilterChange('page', filters.page - 1)} disabled={filters.page <= 1}>Prev</button>
            <span style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>Page {filters.page} of {pagination.totalPages}</span>
            <button className="btn btn-sm btn-outline" onClick={() => handleFilterChange('page', filters.page + 1)} disabled={filters.page >= pagination.totalPages}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
