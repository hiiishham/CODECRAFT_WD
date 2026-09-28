import { useState, useEffect } from 'react';
import { Search, Filter, Edit2, Eye, CheckSquare, Clock, AlertTriangle, Trash2, Plus, RefreshCw } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import managerService from '../services/managerService.js';
import { taskService } from '../services/taskService.js';
import Loader from '../components/common/Loader.jsx';
import DeleteModal from '../components/common/DeleteModal.jsx';
import { useToast } from '../context/ToastContext.jsx';

const ManagerTasksPage = () => {
  const { showSuccess, showError } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialEmployee = queryParams.get('employee') || '';

  const [filters, setFilters] = useState({ search: '', status: 'All', priority: 'All' });
  const [searchTerm, setSearchTerm] = useState('');

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchTerm }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await managerService.getTeamTasks({
        search: filters.search,
        status: filters.status,
        priority: filters.priority,
      });
      if (res.success) {
        let fetchedTasks = res.tasks || [];
        if (initialEmployee) {
          fetchedTasks = fetchedTasks.filter((t) => t.assignedTo?._id === initialEmployee);
        }
        setTasks(fetchedTasks);
      } else {
        showError(res.message || 'Failed to load team tasks');
      }
    } catch (err) {
      showError(err.message || 'Failed to load team tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filters]);

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
        setTaskToDelete(null);
        fetchTasks();
      } else {
        showError(res.message || 'Failed to delete task');
      }
    } catch (err) {
      showError(err.message || 'Failed to delete task');
    } finally {
      setDeleting(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent':
        return '#dc2626';
      case 'High':
        return '#ea580c';
      case 'Medium':
        return '#d97706';
      case 'Low':
        return '#16a34a';
      default:
        return '#64748b';
    }
  };

  const getStatusBadge = (status, isOverdue) => {
    let bg = '#f1f5f9';
    let text = '#475569';

    switch (status) {
      case 'Assigned':
        bg = 'var(--primary-50)';
        text = 'var(--primary-700)';
        break;
      case 'In Progress':
        bg = '#e0f2fe';
        text = '#0369a1';
        break;
      case 'Completed':
        bg = '#dcfce7';
        text = '#15803d';
        break;
      case 'Cancelled':
        bg = '#fee2e2';
        text = '#b91c1c';
        break;
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '0.2rem 0.6rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: bg,
            color: text,
            width: 'fit-content',
          }}
        >
          {status}
        </span>
        {isOverdue && (
          <span
            style={{
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              fontSize: '0.65rem',
              fontWeight: 800,
              background: '#fee2e2',
              color: '#dc2626',
            }}
          >
            OVERDUE
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>Team Tasks</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.4rem', fontSize: '0.875rem' }}>
            Monitor, assign, and manage deliverables assigned to your department team.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={fetchTasks}
            className="btn-secondary"
            title="Refresh"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem' }}
          >
            <RefreshCw size={16} />
          </button>
          <Link
            to="/tasks/add"
            className="btn-primary"
            style={{
              padding: '0.55rem 1.1rem',
              color: 'white',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Plus size={16} />
            <span>Assign Task</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
          <input
            type="text"
            placeholder="Search team tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.625rem 1rem 0.625rem 2.5rem', border: '1px solid var(--slate-300)', borderRadius: '0.5rem', outline: 'none' }}
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          style={{ padding: '0.625rem 1rem', border: '1px solid var(--slate-300)', borderRadius: '0.5rem', outline: 'none', background: 'white', fontSize: '0.875rem' }}
        >
          <option value="All">All Statuses</option>
          <option value="Assigned">Assigned</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Overdue">Overdue</option>
        </select>

        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          style={{ padding: '0.625rem 1rem', border: '1px solid var(--slate-300)', borderRadius: '0.5rem', outline: 'none', background: 'white', fontSize: '0.875rem' }}
        >
          <option value="All">All Priorities</option>
          <option value="Urgent">Urgent</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {loading ? (
        <Loader message="Loading team tasks..." />
      ) : (
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Task Details</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Assigned To</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Priority</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Progress</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Due Date</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                      <CheckSquare size={36} color="var(--slate-300)" style={{ margin: '0 auto 0.75rem' }} />
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--slate-700)' }}>No tasks found</p>
                      <span style={{ fontSize: '0.85rem' }}>No team tasks match your current criteria.</span>
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task._id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                      <td style={{ padding: '1rem' }}>
                        <Link
                          to={`/tasks/${task._id}`}
                          style={{ margin: 0, fontWeight: 600, color: 'var(--slate-900)', textDecoration: 'none' }}
                          onMouseOver={(e) => (e.target.style.color = 'var(--primary-600)')}
                          onMouseOut={(e) => (e.target.style.color = 'var(--slate-900)')}
                        >
                          {task.title}
                        </Link>
                        {task.department?.name && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.15rem' }}>
                            {task.department.name}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600 }}>
                            {task.assignedTo?.profileImage ? (
                              <img src={task.assignedTo.profileImage} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              task.assignedTo?.fullName?.charAt(0) || 'U'
                            )}
                          </div>
                          <div>
                            <span style={{ fontSize: '0.875rem', color: 'var(--slate-700)', fontWeight: 500, display: 'block' }}>
                              {task.assignedTo?.fullName || 'Unassigned'}
                            </span>
                            {task.assignedTo?.employeeId && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                                {task.assignedTo.employeeId}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {getStatusBadge(task.status, task.isOverdue)}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: getPriorityColor(task.priority), fontWeight: 600 }}>
                          {(task.priority === 'High' || task.priority === 'Urgent') && <AlertTriangle size={12} />}
                          {task.priority}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '60px', height: '6px', background: 'var(--slate-200)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${task.progress || 0}%`, height: '100%', background: task.progress === 100 ? '#10b981' : 'var(--primary-500)' }}></div>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--slate-600)', fontVariantNumeric: 'tabular-nums' }}>{task.progress || 0}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: task.isOverdue ? '#dc2626' : 'var(--slate-600)', fontWeight: task.isOverdue ? 600 : 400 }}>
                        {new Date(task.dueDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Link
                            to={`/tasks/${task._id}`}
                            title="View Task Details"
                            style={{ display: 'inline-flex', alignItems: 'center', padding: '0.35rem 0.5rem', color: 'var(--slate-600)', borderRadius: '4px', textDecoration: 'none' }}
                          >
                            <Eye size={16} />
                          </Link>
                          <Link
                            to={`/tasks/${task._id}/edit`}
                            title="Edit Task"
                            style={{ display: 'inline-flex', alignItems: 'center', padding: '0.35rem 0.5rem', color: 'var(--primary-600)', borderRadius: '4px', textDecoration: 'none' }}
                          >
                            <Edit2 size={16} />
                          </Link>
                          <button
                            type="button"
                            title="Delete Task"
                            onClick={() => handleDeleteClick(task)}
                            style={{ display: 'inline-flex', alignItems: 'center', padding: '0.35rem 0.5rem', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Team Task?"
        message="Are you sure you want to delete this task? This cannot be undone."
        itemName={taskToDelete?.title || ''}
        itemLabel="Task"
        confirmText="Confirm Delete"
        isDeleting={deleting}
      />
    </div>
  );
};

export default ManagerTasksPage;
