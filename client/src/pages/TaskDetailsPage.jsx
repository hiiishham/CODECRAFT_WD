import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  ArrowLeft,
  Edit2,
  Trash2,
  Clock,
  Calendar,
  Building2,
  User,
  ShieldCheck,
  AlertCircle,
  FileText,
  Layers,
  CheckCircle2,
  FolderCheck,
  ExternalLink,
} from 'lucide-react';
import { taskService } from '../services/taskService.js';
import { submissionService } from '../services/submissionService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import DeleteModal from '../components/common/DeleteModal.jsx';
import '../styles/tasks.css';

export const TaskDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [task, setTask] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true);
      try {
        const res = await taskService.getTaskById(id);
        if (res.success && res.task) {
          setTask(res.task);
          // Also fetch submission status for this task
          try {
            const subRes = await submissionService.getSubmissionByTaskId(id);
            if (subRes.success && subRes.submission) {
              setSubmission(subRes.submission);
            }
          } catch (e) {
            console.error('Error fetching task submission:', e);
          }
        } else {
          showError(res.message || 'Task not found');
        }
      } catch (err) {
        showError(err.message || 'Failed to fetch task details');
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [id, showError]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await taskService.deleteTask(id);
      if (res.success) {
        showSuccess('Task deleted successfully');
        navigate('/tasks');
      } else {
        showError(res.message || 'Failed to delete task');
      }
    } catch (err) {
      showError(err.message || 'Error deleting task');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <Loader message="Loading task details..." />;
  }

  if (!task) {
    return (
      <div className="task-page" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <CheckSquare size={48} color="var(--slate-400)" style={{ margin: '0 auto 1rem' }} />
        <h2>Task Not Found</h2>
        <p style={{ color: 'var(--slate-500)', marginBottom: '1.5rem' }}>
          The requested task could not be located or may have been removed.
        </p>
        <Link to="/tasks" className="btn-primary">
          Back to Tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="task-page animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Breadcrumb Navigation */}
      <div className="task-breadcrumb">
        <Link to="/tasks" className="breadcrumb-link">
          Tasks
        </Link>
        <span>/</span>
        <span>{task.title}</span>
      </div>

      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '1.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
            <h1 className="dashboard-title" style={{ margin: 0 }}>
              {task.title}
            </h1>
            <span
              className={`badge-priority ${
                task.priority === 'Low'
                  ? 'badge-priority-low'
                  : task.priority === 'Medium'
                  ? 'badge-priority-medium'
                  : task.priority === 'High'
                  ? 'badge-priority-high'
                  : 'badge-priority-urgent'
              }`}
            >
              {task.priority} Priority
            </span>
            <span
              className={`badge-status ${
                task.status === 'Assigned'
                  ? 'badge-status-assigned'
                  : task.status === 'In Progress'
                  ? 'badge-status-in-progress'
                  : task.status === 'Completed'
                  ? 'badge-status-completed'
                  : 'badge-status-cancelled'
              }`}
            >
              {task.status}
            </span>
            {task.isOverdue && <span className="badge-overdue">OVERDUE</span>}
          </div>
          <p className="dashboard-subtitle">
            Department: <strong>{task.department?.name || 'General'}</strong> • Task ID: {task._id}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link to="/tasks" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </Link>
          <Link
            to={`/tasks/${task._id}/edit`}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Edit2 size={16} />
            <span>Edit</span>
          </Link>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="btn-danger"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Details Left, Sidebar Meta Right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Progress & Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Progress Card */}
          <div
            style={{
              padding: '1.5rem',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--slate-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                Deliverable Progress
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: task.progress === 100 ? '#10b981' : 'var(--primary-600)' }}>
                {task.progress}%
              </span>
            </div>

            <div className="task-progress-container" style={{ marginBottom: '0.75rem' }}>
              <div className="task-progress-track" style={{ height: 12 }}>
                <div
                  className={`task-progress-fill ${task.progress === 100 ? 'completed' : ''}`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--slate-500)' }}>
              <span>Assigned (0%)</span>
              <span>In Progress</span>
              <span>Completed (100%)</span>
            </div>
          </div>

          {/* Description Card */}
          <div
            style={{
              padding: '1.75rem',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--slate-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h2
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--slate-800)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: '0 0 1rem',
              }}
            >
              <FileText size={18} color="var(--primary-600)" />
              <span>Description & Guidelines</span>
            </h2>
            <div
              style={{
                fontSize: '0.925rem',
                color: 'var(--slate-700)',
                lineHeight: 1.6,
                whiteSpace: 'pre-line',
                backgroundColor: 'var(--slate-50)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--slate-200)',
              }}
            >
              {task.description}
            </div>

            {task.employeeComment && (
              <div style={{ marginTop: '1.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-700)', display: 'block', marginBottom: '0.4rem' }}>
                  Latest Employee Progress Note:
                </span>
                <div
                  style={{
                    backgroundColor: '#eff6ff',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--primary-500)',
                    fontSize: '0.85rem',
                    color: '#1e3a8a',
                  }}
                >
                  "{task.employeeComment}"
                </div>
              </div>
            )}
          </div>

          {/* Work Submission & Deliverable Card */}
          <div
            style={{
              padding: '1.75rem',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--slate-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--slate-800)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: 0,
                }}
              >
                <FolderCheck size={18} color="var(--primary-600)" />
                <span>Work Submission & Review</span>
              </h2>

              {submission && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor:
                      submission.status === 'Approved'
                        ? '#dcfce7'
                        : submission.status === 'Changes Requested'
                        ? '#fee2e2'
                        : '#fef3c7',
                    color:
                      submission.status === 'Approved'
                        ? '#15803d'
                        : submission.status === 'Changes Requested'
                        ? '#b91c1c'
                        : '#b45309',
                  }}
                >
                  {submission.status}
                </span>
              )}
            </div>

            {submission ? (
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  {submission.description || submission.workDescription}
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    padding: '0.85rem 1rem',
                    backgroundColor: 'var(--slate-50)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--slate-200)',
                    fontSize: '0.825rem',
                    color: 'var(--slate-600)',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div>
                    <strong>Submitted:</strong>{' '}
                    {new Date(submission.submittedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  {submission.githubUrl && (
                    <div>
                      <strong>Repository:</strong> Provided
                    </div>
                  )}
                  {submission.liveUrl && (
                    <div>
                      <strong>Live Demo:</strong> Provided
                    </div>
                  )}
                  {submission.attachments?.length > 0 && (
                    <div>
                      <strong>Files:</strong> {submission.attachments.length} attachment(s)
                    </div>
                  )}
                </div>

                <Link
                  to={`/submissions/${submission._id}`}
                  className="btn-primary"
                  id="review-submission-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                  }}
                >
                  <span>
                    {submission.status === 'Pending Review' ? 'Review Submission' : 'View Submission Details'}
                  </span>
                  <ExternalLink size={15} />
                </Link>
              </div>
            ) : (
              <div
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--slate-200)',
                }}
              >
                <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', margin: 0 }}>
                  {task.status === 'Completed'
                    ? 'The employee marked this task as completed, but has not yet submitted deliverable assets for review.'
                    : 'No work submission has been submitted for this task yet.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Meta Information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Assignment Information */}
          <div
            style={{
              padding: '1.5rem',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--slate-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--slate-800)', margin: '0 0 1.25rem' }}>
              Assignment Details
            </h3>

            {/* Assigned Employee */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-100)',
                  color: 'var(--primary-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1rem',
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
                <span style={{ fontSize: '0.725rem', textTransform: 'uppercase', color: 'var(--slate-400)', fontWeight: 700, display: 'block' }}>
                  Assigned Employee
                </span>
                <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: '0.95rem' }}>
                  {task.assignedTo?.fullName || 'Unassigned'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                  {task.assignedTo?.designation || 'Staff'} • {task.assignedTo?.employeeId}
                </div>
              </div>
            </div>

            {/* Assigned By */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', paddingTop: '1rem', borderTop: '1px solid var(--slate-100)' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: 'var(--slate-100)',
                  color: 'var(--slate-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <div>
                <span style={{ fontSize: '0.725rem', textTransform: 'uppercase', color: 'var(--slate-400)', fontWeight: 700, display: 'block' }}>
                  Assigned By
                </span>
                <div style={{ fontWeight: 600, color: 'var(--slate-800)', fontSize: '0.875rem' }}>
                  {task.assignedBy?.name || 'Admin'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'capitalize' }}>
                  {task.assignedBy?.role || 'Administrator'}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline & Schedule */}
          <div
            style={{
              padding: '1.5rem',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--slate-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--slate-800)', margin: '0 0 1rem' }}>
              Timeline & Metrics
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={15} /> Start Date:
                </span>
                <strong style={{ color: 'var(--slate-800)' }}>{formatDate(task.startDate)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Calendar size={15} /> Target Deadline:
                </span>
                <strong style={{ color: task.isOverdue ? '#dc2626' : 'var(--slate-800)' }}>
                  {formatDate(task.dueDate)}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={15} /> Estimated Hours:
                </span>
                <strong style={{ color: 'var(--slate-800)' }}>{task.estimatedHours || 0} Hours</strong>
              </div>

              <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                  Created: {formatDateTime(task.createdAt)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                  Last Updated: {formatDateTime(task.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Task?"
        message="Are you sure you want to delete this task? This action cannot be undone."
        itemName={task?.title || ''}
        itemLabel="Task"
        confirmText="Confirm Delete"
        isDeleting={deleting}
      />
    </div>
  );
};

export default TaskDetailsPage;
