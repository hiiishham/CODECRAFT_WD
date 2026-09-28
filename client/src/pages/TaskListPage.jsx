import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { taskService } from '../services/taskService.js';
import { departmentService } from '../services/departmentService.js';
import { employeeService } from '../services/employeeService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import DeleteModal from '../components/common/DeleteModal.jsx';
import { useUrlFilters } from '../hooks/useUrlFilters.js';
import { AdvancedFilters, FilterSelect } from '../components/common/AdvancedFilters.jsx';
import '../styles/tasks.css';

export const TaskListPage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  });

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Filter & Pagination State (URL Sync)
  const { filters, setFilter, setFilters, clearFilters, activeCount } = useUrlFilters({
    search: '',
    department: 'All',
    employee: 'All',
    priority: 'All',
    status: 'All',
    page: '1',
    limit: '10'
  });

  const { search, department: selectedDept, employee: selectedEmp, priority: selectedPriority, status: selectedStatus } = filters;
  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 10;
  
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Debounce search input
  const debounceTimer = useRef(null);
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setFilter('search', val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
      setFilter('page', '1');
    }, 350);
  };

  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load dropdown resources
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [deptRes, empRes] = await Promise.all([
          departmentService.getDepartments({ limit: 100 }),
          employeeService.getEmployees({ limit: 200 }),
        ]);

        if (deptRes.success) setDepartments(deptRes.departments || []);
        if (empRes.success) setEmployees(empRes.employees || []);
      } catch (err) {
        console.error('Failed to load filter dropdown lists:', err);
      }
    };
    loadDropdownData();
  }, []);

  // Fetch tasks and stats
  const fetchTasksData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, statsRes] = await Promise.all([
        taskService.getTasks({
          search: debouncedSearch,
          department: selectedDept,
          employee: selectedEmp,
          priority: selectedPriority,
          status: selectedStatus,
          page,
          limit,
        }),
        taskService.getTaskStats(),
      ]);

      if (tasksRes.success) {
        setTasks(tasksRes.tasks || []);
        setTotalPages(tasksRes.totalPages || 1);
        setTotalRecords(tasksRes.totalRecords || 0);
      } else {
        showError(tasksRes.message || 'Failed to load tasks');
      }

      if (statsRes.success && statsRes.stats) {
        setStats(statsRes.stats);
      }
    } catch (err) {
      showError(err.message || 'Error fetching task data');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedDept, selectedEmp, selectedPriority, selectedStatus, page, limit, showError]);

  useEffect(() => {
    fetchTasksData();
  }, [fetchTasksData]);

  // Handle task deletion
  const handleDeleteClick = (task) => {
    setTaskToDelete(task);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!taskToDelete) return;
    setDeleting(true);
    try {
      const res = await taskService.deleteTask(taskToDelete._id);
      if (res.success) {
        showSuccess('Task deleted successfully');
        setDeleteModalOpen(false);
        // If deleting the last item on page > 1, step back
        if (tasks.length === 1 && page > 1) {
          setFilter('page', String(page - 1));
        } else {
          fetchTasksData();
        }
      } else {
        throw new Error(res.message);
      }
    } catch (err) {
      showError(err.message || 'Error deleting task');
    } finally {
      setDeleting(false);
    }
  };

  const handleClearFilters = () => {
    clearFilters();
    setDebouncedSearch('');
  };

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
            <span>Task Management</span>
          </h1>
          <p className="dashboard-subtitle">
            Create, assign, monitor, and manage employee tasks across all departments.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchTasksData}
            className="btn-secondary"
            title="Refresh Tasks"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 0.85rem' }}
          >
            <RefreshCw size={16} />
          </button>

          <Link
            to="/tasks/add"
            className="btn-primary"
            id="create-task-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            <span>Create Task</span>
          </Link>
        </div>
      </div>

      {/* 1. Real Task Statistics Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
        {/* Total Tasks */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Tasks</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)' }}>
              <Layers size={20} />
            </div>
          </div>
          <div className="stat-card-value">{stats.total}</div>
          <p className="stat-card-subtitle">All managed deliverables</p>
        </div>

        {/* Assigned */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Assigned</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--primary-600)' }}>{stats.assigned}</div>
          <p className="stat-card-subtitle">Awaiting kickoff (0%)</p>
        </div>

        {/* In Progress */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">In Progress</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
              <RefreshCw size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#0284c7' }}>{stats.inProgress}</div>
          <p className="stat-card-subtitle">Active development</p>
        </div>

        {/* Completed */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Completed</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#15803d' }}>{stats.completed}</div>
          <p className="stat-card-subtitle">100% finished tasks</p>
        </div>

        {/* Overdue */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Overdue</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: stats.overdue > 0 ? '#dc2626' : 'inherit' }}>
            {stats.overdue}
          </div>
          <p className="stat-card-subtitle">Past due date</p>
        </div>
      </div>

      {/* 2. Controls Bar (Search & Multi-Filters) */}
      <AdvancedFilters onClear={handleClearFilters} activeCount={activeCount}>
        <div className="task-search-box" style={{ gridColumn: '1 / -1', maxWidth: '400px' }}>
          <Search className="task-search-icon" size={16} />
          <input
            type="text"
            className="task-search-input"
            placeholder="Search by task title or employee name..."
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <FilterSelect
          label="Department"
          value={selectedDept}
          onChange={(val) => setFilter('department', val)}
          options={departments.map(d => ({ label: d.name, value: d._id }))}
        />

        <FilterSelect
          label="Employee"
          value={selectedEmp}
          onChange={(val) => setFilter('employee', val)}
          options={employees.map(e => ({ label: e.fullName, value: e._id }))}
        />

        <FilterSelect
          label="Priority"
          value={selectedPriority}
          onChange={(val) => setFilter('priority', val)}
          options={[
            { label: 'Low', value: 'Low' },
            { label: 'Medium', value: 'Medium' },
            { label: 'High', value: 'High' },
            { label: 'Urgent', value: 'Urgent' }
          ]}
        />

        <FilterSelect
          label="Status"
          value={selectedStatus}
          onChange={(val) => setFilter('status', val)}
          options={[
            { label: 'Assigned', value: 'Assigned' },
            { label: 'In Progress', value: 'In Progress' },
            { label: 'Completed', value: 'Completed' },
            { label: 'Cancelled', value: 'Cancelled' }
          ]}
        />
        
        <FilterSelect
          label="Per Page"
          value={String(limit)}
          onChange={(val) => setFilter('limit', val)}
          placeholder="10 per page"
          options={[
            { label: '10 per page', value: '10' },
            { label: '20 per page', value: '20' },
            { label: '50 per page', value: '50' }
          ]}
        />
      </AdvancedFilters>

      {/* 3. Tasks Table */}
      {loading ? (
        <Loader message="Loading tasks database..." />
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
          <CheckSquare size={42} color="var(--slate-400)" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)', margin: '0 0 0.4rem' }}>
            No tasks found
          </h3>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
            {search || selectedDept !== 'All' || selectedStatus !== 'All' || selectedPriority !== 'All'
              ? 'No tasks match your selected filter criteria. Try resetting filters.'
              : 'Get started by creating your team’s first task assignment.'}
          </p>
          <Link to="/tasks/add" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} />
            <span>Create Task</span>
          </Link>
        </div>
      ) : (
        <>
          <div className="task-table-wrapper">
            <table className="task-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Assigned To</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Start Date</th>
                  <th>Due Date</th>
                  <th style={{ minWidth: 140 }}>Progress</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task._id}>
                    {/* Task Title & Hours */}
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>
                        <Link
                          to={`/tasks/${task._id}`}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                          onMouseOver={(e) => (e.target.style.color = 'var(--primary-600)')}
                          onMouseOut={(e) => (e.target.style.color = 'inherit')}
                        >
                          {task.title}
                        </Link>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.15rem' }}>
                        Est: {task.estimatedHours || 0} hrs
                      </div>
                    </td>

                    {/* Assigned To */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary-100)',
                            color: 'var(--primary-700)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            overflow: 'hidden',
                          }}
                        >
                          {task.assignedTo?.profileImage ? (
                            <img
                              src={task.assignedTo.profileImage}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            task.assignedTo?.fullName?.charAt(0) || 'E'
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--slate-800)', fontSize: '0.85rem' }}>
                            {task.assignedTo?.fullName || 'Unassigned'}
                          </div>
                          <div style={{ fontSize: '0.725rem', color: 'var(--slate-500)' }}>
                            {task.assignedTo?.employeeId || '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td>
                      <span style={{ fontSize: '0.85rem', color: 'var(--slate-700)' }}>
                        {task.department?.name || 'General'}
                      </span>
                    </td>

                    {/* Priority */}
                    <td>
                      <span className={`badge-priority ${getPriorityBadgeClass(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>

                    {/* Start Date */}
                    <td>
                      <span style={{ fontSize: '0.825rem', color: 'var(--slate-600)' }}>
                        {formatDate(task.startDate)}
                      </span>
                    </td>

                    {/* Due Date + Overdue indicator */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.825rem', color: task.isOverdue ? '#dc2626' : 'var(--slate-700)', fontWeight: task.isOverdue ? 700 : 500 }}>
                          {formatDate(task.dueDate)}
                        </span>
                        {task.isOverdue && (
                          <span className="badge-overdue">OVERDUE</span>
                        )}
                      </div>
                    </td>

                    {/* Progress Bar */}
                    <td>
                      <div className="task-progress-container">
                        <div className="task-progress-track">
                          <div
                            className={`task-progress-fill ${task.progress === 100 ? 'completed' : ''}`}
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                        <span className="task-progress-label">{task.progress || 0}%</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`badge-status ${getStatusBadgeClass(task.status)}`}>
                        {task.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Link
                          to={`/tasks/${task._id}`}
                          className="action-btn"
                          title="View Details"
                          style={{
                            padding: '0.35rem',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--slate-600)',
                            display: 'inline-flex',
                          }}
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          to={`/tasks/${task._id}/edit`}
                          className="action-btn"
                          title="Edit Task"
                          style={{
                            padding: '0.35rem',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--primary-600)',
                            display: 'inline-flex',
                          }}
                        >
                          <Edit2 size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(task)}
                          className="action-btn"
                          title="Delete Task"
                          style={{
                            padding: '0.35rem',
                            borderRadius: 'var(--radius-md)',
                            color: '#dc2626',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              padding: '0.5rem 0',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalRecords)} of {totalRecords} tasks
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setFilter('page', String(Math.max(1, page - 1)))}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', padding: '0 0.5rem' }}>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setFilter('page', String(Math.min(totalPages, page + 1)))}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Task?"
        message="Are you sure you want to delete this task? This action cannot be undone."
        itemName={taskToDelete?.title || ''}
        itemLabel="Task"
        confirmText="Delete Task"
        isDeleting={deleting}
      />
    </div>
  );
};

export default TaskListPage;
