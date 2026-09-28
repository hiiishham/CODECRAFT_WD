import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  FolderCheck,
  Send,
} from 'lucide-react';
import { taskService } from '../services/taskService.js';
import { submissionService } from '../services/submissionService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import { useUrlFilters } from '../hooks/useUrlFilters.js';
import { AdvancedFilters, FilterSelect } from '../components/common/AdvancedFilters.jsx';
import '../styles/tasks.css';

export const MyTasksPage = () => {
  const { showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [submissionsMap, setSubmissionsMap] = useState({});
  const [summary, setSummary] = useState({
    total: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  });

  // Filter State
  const { filters, setFilter, clearFilters, activeCount } = useUrlFilters({
    status: 'All',
    priority: 'All',
    search: '',
  });

  const { status: statusFilter, priority: priorityFilter, search } = filters;

  const fetchMyTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taskService.getMyTasks({
        status: statusFilter,
        priority: priorityFilter,
        search,
      });

      if (res.success) {
        setTasks(res.tasks || []);
        if (res.summary) setSummary(res.summary);

        // Also fetch employee submissions to link status
        try {
          const subRes = await submissionService.getMySubmissions();
          if (subRes.success && subRes.submissions) {
            const map = {};
            subRes.submissions.forEach((s) => {
              const taskId = s.task?._id || s.task;
              if (taskId) map[taskId] = s;
            });
            setSubmissionsMap(map);
          }
        } catch (subErr) {
          console.error('Error loading submissions:', subErr);
        }
      } else {
        showError(res.message || 'Failed to load your tasks');
      }
    } catch (err) {
      showError(err.message || 'Error fetching tasks');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, search, showError]);

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'Low':
        return 'badge-priority-low';
      case 'Medium':
        return 'badge-priority-medium';
      case 'High':
        return 'badge-priority-high';
      case 'Urgent':
        return 'badge-priority-urgent';
      default:
        return 'badge-priority-medium';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Assigned':
        return 'badge-status-assigned';
      case 'In Progress':
        return 'badge-status-in-progress';
      case 'Completed':
        return 'badge-status-completed';
      case 'Cancelled':
        return 'badge-status-cancelled';
      default:
        return 'badge-status-assigned';
    }
  };

  return (
    <div className="task-page animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckSquare size={26} color="var(--primary-600)" />
            <span>My Tasks</span>
          </h1>
          <p className="dashboard-subtitle">
            Track your assigned work deliverables, milestones, and daily progress.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={fetchMyTasks}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 0.85rem' }}
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 1. Top Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
        {/* Total Tasks */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Tasks</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)' }}>
              <Layers size={20} />
            </div>
          </div>
          <div className="stat-card-value">{summary.total}</div>
          <p className="stat-card-subtitle">Assigned to you</p>
        </div>

        {/* Assigned */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Assigned</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--primary-600)' }}>{summary.assigned}</div>
          <p className="stat-card-subtitle">Not yet started</p>
        </div>

        {/* In Progress */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">In Progress</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#0284c7' }}>{summary.inProgress}</div>
          <p className="stat-card-subtitle">Currently active</p>
        </div>

        {/* Completed */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Completed</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#15803d' }}>{summary.completed}</div>
          <p className="stat-card-subtitle">Successfully delivered</p>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <AdvancedFilters onClear={clearFilters} activeCount={activeCount}>
        <div className="task-search-box" style={{ gridColumn: '1 / -1', maxWidth: '400px' }}>
          <Search className="task-search-icon" size={16} />
          <input
            type="text"
            placeholder="Search tasks..."
            className="task-search-input"
            value={search}
            onChange={(e) => setFilter('search', e.target.value)}
          />
        </div>

        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={(val) => setFilter('status', val)}
          options={[
            { label: 'Assigned', value: 'Assigned' },
            { label: 'In Progress', value: 'In Progress' },
            { label: 'Completed', value: 'Completed' },
            { label: 'Cancelled', value: 'Cancelled' }
          ]}
        />

        <FilterSelect
          label="Priority"
          value={priorityFilter}
          onChange={(val) => setFilter('priority', val)}
          options={[
            { label: 'Low', value: 'Low' },
            { label: 'Medium', value: 'Medium' },
            { label: 'High', value: 'High' },
            { label: 'Urgent', value: 'Urgent' }
          ]}
        />
      </AdvancedFilters>

      {/* 3. Task Cards Grid */}
      {loading ? (
        <Loader message="Loading your assigned tasks..." />
      ) : tasks.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3.5rem 1rem',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            border: '1px dashed var(--slate-300)',
          }}
        >
          <CheckSquare size={40} color="var(--slate-400)" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)', margin: '0 0 0.35rem' }}>
            No tasks assigned yet.
          </h3>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem', margin: 0 }}>
            {search || statusFilter !== 'All' || priorityFilter !== 'All'
              ? 'No tasks match your selected filter criteria.'
              : 'You have no pending deliverables right now. Good job staying caught up!'}
          </p>
        </div>
      ) : (
        <div className="employee-task-grid">
          {tasks.map((task) => (
            <div
              key={task._id}
              className={`employee-task-card ${task.isOverdue ? 'is-overdue' : ''} ${task.status === 'Completed' ? 'is-completed' : ''}`}
            >
              {/* Card Top */}
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.65rem' }}>
                  <span className={`badge-priority ${getPriorityBadgeClass(task.priority)}`}>
                    {task.priority} Priority
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    {task.isOverdue && <span className="badge-overdue">OVERDUE</span>}
                    <span className={`badge-status ${getStatusBadgeClass(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                </div>

                <h3
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: 'var(--slate-900)',
                    margin: '0 0 0.4rem',
                    lineHeight: 1.4,
                  }}
                >
                  <Link
                    to={`/employee/tasks/${task._id}`}
                    style={{ color: 'inherit', textDecoration: 'none' }}
                    onMouseOver={(e) => (e.target.style.color = 'var(--primary-600)')}
                    onMouseOut={(e) => (e.target.style.color = 'inherit')}
                  >
                    {task.title}
                  </Link>
                </h3>

                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--slate-500)',
                    margin: '0 0 1rem',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    lineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.5,
                  }}
                >
                  {task.description}
                </p>
              </div>

              {/* Card Middle: Timeline & Department */}
              <div style={{ padding: '0.75rem 0', borderTop: '1px solid var(--slate-100)', borderBottom: '1px solid var(--slate-100)', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--slate-600)', marginBottom: '0.35rem' }}>
                  <span>Department:</span>
                  <strong style={{ color: 'var(--slate-800)' }}>{task.department?.name || 'Engineering'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--slate-600)' }}>
                  <span>Due Date:</span>
                  <strong style={{ color: task.isOverdue ? '#dc2626' : 'var(--slate-800)' }}>
                    {formatDate(task.dueDate)}
                  </strong>
                </div>
              </div>

              {/* Card Bottom: Progress Bar & Action */}
              <div>
                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-600)', marginBottom: '0.25rem' }}>
                    <span>Progress</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div className="task-progress-container">
                    <div className="task-progress-track">
                      <div
                        className={`task-progress-fill ${task.progress === 100 ? 'completed' : ''}`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <Link
                    to={`/employee/tasks/${task._id}`}
                    className="btn-secondary"
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      fontSize: '0.825rem',
                      padding: '0.55rem',
                    }}
                  >
                    <span>View Task</span>
                    <ArrowRight size={13} />
                  </Link>

                  {submissionsMap[task._id] ? (
                    <Link
                      to={`/employee/submissions/${submissionsMap[task._id]._id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        backgroundColor:
                          submissionsMap[task._id].status === 'Approved'
                            ? '#dcfce7'
                            : submissionsMap[task._id].status === 'Changes Requested'
                            ? '#fee2e2'
                            : '#fef3c7',
                        color:
                          submissionsMap[task._id].status === 'Approved'
                            ? '#15803d'
                            : submissionsMap[task._id].status === 'Changes Requested'
                            ? '#b91c1c'
                            : '#b45309',
                      }}
                    >
                      <FolderCheck size={14} />
                      <span>{submissionsMap[task._id].status}</span>
                    </Link>
                  ) : (
                    task.status === 'Completed' && (
                      <Link
                        to={`/employee/tasks/${task._id}/submit`}
                        className="btn-primary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          fontSize: '0.825rem',
                          padding: '0.55rem 0.75rem',
                        }}
                      >
                        <Send size={13} />
                        <span>Submit Work</span>
                      </Link>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTasksPage;
