import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  ArrowLeft,
  Clock,
  Calendar,
  Building2,
  User,
  AlertCircle,
  FileText,
  Sliders,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  FolderCheck,
  ExternalLink,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { taskService } from '../services/taskService.js';
import { submissionService } from '../services/submissionService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/tasks.css';

export const EmployeeTaskDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [task, setTask] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Progress State
  const [progress, setProgress] = useState(0);
  const [employeeComment, setEmployeeComment] = useState('');

  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true);
      try {
        const res = await taskService.getTaskById(id);
        if (res.success && res.task) {
          setTask(res.task);
          setProgress(res.task.progress || 0);
          setEmployeeComment(res.task.employeeComment || '');
          // Check for existing work submission
          try {
            const subRes = await submissionService.getSubmissionByTaskId(id);
            if (subRes.success && subRes.submission) {
              setSubmission(subRes.submission);
            }
          } catch (e) {
            console.error('Error fetching submission:', e);
          }
        } else {
          showError(res.message || 'Task not found');
        }
      } catch (err) {
        showError(err.message || 'Error loading task details');
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [id, showError]);

  const handleProgressUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await taskService.updateTaskProgress(id, {
        progress: Number(progress),
        employeeComment,
      });

      if (res.success && res.task) {
        setTask(res.task);
        setProgress(res.task.progress);
        showSuccess(res.message || `Progress updated to ${progress}%`);
      } else {
        showError(res.message || 'Failed to update progress');
      }
    } catch (err) {
      showError(err.message || 'Error updating progress');
    } finally {
      setUpdating(false);
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

  if (loading) {
    return <Loader message="Loading deliverable details..." />;
  }

  if (!task) {
    return (
      <div className="task-page" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <CheckSquare size={48} color="var(--slate-400)" style={{ margin: '0 auto 1rem' }} />
        <h2>Task Not Found</h2>
        <p style={{ color: 'var(--slate-500)', marginBottom: '1.5rem' }}>
          This task either does not exist or is not assigned to your account.
        </p>
        <Link to="/employee/tasks" className="btn-primary">
          Back to My Tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="task-page animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Breadcrumb Navigation */}
      <div className="task-breadcrumb">
        <Link to="/employee/tasks" className="breadcrumb-link">
          My Tasks
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
            <span className={`badge-priority ${getPriorityBadgeClass(task.priority)}`}>
              {task.priority} Priority
            </span>
            <span className={`badge-status ${getStatusBadgeClass(task.status)}`}>
              {task.status}
            </span>
            {task.isOverdue && <span className="badge-overdue">OVERDUE</span>}
          </div>
          <p className="dashboard-subtitle">
            Assigned on {formatDate(task.createdAt)} by {task.assignedBy?.name || 'Manager'}
          </p>
        </div>

        <div>
          <Link
            to="/employee/tasks"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Tasks</span>
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Interactive Progress Control & Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Progress Control Widget */}
          <div
            style={{
              padding: '1.75rem',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--slate-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sliders size={20} color="var(--primary-600)" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)', margin: 0 }}>
                  Update Task Progress
                </h2>
              </div>
              <span
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  color: progress === 100 ? '#10b981' : 'var(--primary-600)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {progress}%
              </span>
            </div>

            {/* Quick Progress Buttons */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Quick Set:
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[0, 25, 50, 75, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setProgress(val)}
                    className={`progress-quick-btn ${progress === val ? 'active' : ''}`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Slider */}
            <div style={{ marginBottom: '1.5rem' }}>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--slate-200)',
                  cursor: 'pointer',
                  accentColor: progress === 100 ? '#10b981' : 'var(--primary-600)',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.35rem' }}>
                <span>0% (Assigned)</span>
                <span>50% (In Progress)</span>
                <span>100% (Completed)</span>
              </div>
            </div>

            {/* Optional Progress Note */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--slate-700)',
                  marginBottom: '0.4rem',
                }}
              >
                <MessageSquare size={14} />
                <span>Work Progress Note (Optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Add notes about your current progress, accomplishments or blockers..."
                value={employeeComment}
                onChange={(e) => setEmployeeComment(e.target.value)}
                className="task-search-input"
                style={{ padding: '0.65rem 0.85rem', resize: 'vertical' }}
              />
            </div>

            {/* Update Progress Button */}
            <button
              type="button"
              onClick={handleProgressUpdate}
              disabled={updating}
              className="btn-primary"
              id="update-progress-btn"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                fontSize: '0.95rem',
              }}
            >
              <CheckCircle2 size={18} />
              <span>{updating ? 'Saving Progress...' : 'Update Progress'}</span>
            </button>
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
              <span>Deliverable Requirements</span>
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
          </div>

          {/* Work Submission & Review Action Card */}
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
                <span>Work Deliverable & Review</span>
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
                {/* Feedback if Changes Requested */}
                {submission.status === 'Changes Requested' && (
                  <div
                    style={{
                      padding: '1rem',
                      backgroundColor: '#fef2f2',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid #fecaca',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b91c1c', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.4rem' }}>
                      <AlertTriangle size={16} />
                      <span>Reviewer Requested Changes</span>
                    </div>
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                      "{submission.reviewComment}"
                    </p>
                    <Link
                      to={`/employee/submissions/${submission._id}`}
                      className="btn-primary"
                      id="fix-deliverable-btn"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.825rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#dc2626',
                        borderColor: '#dc2626',
                      }}
                    >
                      <span>Update & Resubmit Work</span>
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                )}

                {/* Info if Pending Review */}
                {submission.status === 'Pending Review' && (
                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: '#fffbeb',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid #fde68a',
                      marginBottom: '1.25rem',
                      fontSize: '0.85rem',
                      color: '#92400e',
                    }}
                  >
                    Your deliverable was submitted on{' '}
                    <strong>{new Date(submission.submittedAt).toLocaleDateString()}</strong> and is currently awaiting supervisor review.
                  </div>
                )}

                {/* Info if Approved */}
                {submission.status === 'Approved' && (
                  <div
                    style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: '#f0fdf4',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid #bbf7d0',
                      marginBottom: '1.25rem',
                      fontSize: '0.85rem',
                      color: '#166534',
                    }}
                  >
                    🎉 Work approved by supervisor! Your deliverable has passed review.
                  </div>
                )}

                <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  {submission.description || submission.workDescription}
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <Link
                    to={`/employee/submissions/${submission._id}`}
                    className="btn-secondary"
                    id="view-deliverable-btn"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.85rem',
                      padding: '0.55rem 1rem',
                    }}
                  >
                    <span>View Submission Details</span>
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            ) : task.status === 'Completed' || progress === 100 ? (
              <div
                style={{
                  padding: '1.5rem',
                  backgroundColor: '#f0fdf4',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid #bbf7d0',
                  textAlign: 'center',
                }}
              >
                <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 0.5rem' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#166534', margin: '0 0 0.35rem' }}>
                  Task Completed! Ready to submit deliverable?
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#15803d', margin: '0 0 1rem' }}>
                  Submit your code repositories, live links, and attachments for supervisor review and sign-off.
                </p>
                <Link
                  to={`/employee/tasks/${task._id}/submit`}
                  className="btn-primary"
                  id="submit-work-now-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.875rem',
                  }}
                >
                  <Send size={15} />
                  <span>Submit Work Deliverable</span>
                </Link>
              </div>
            ) : (
              <div
                style={{
                  padding: '1.25rem',
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--slate-200)',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', margin: '0 0 0.75rem' }}>
                  Deliverables can be submitted once this task is marked 100% completed.
                </p>
                <Link
                  to={`/employee/tasks/${task._id}/submit`}
                  style={{
                    fontSize: '0.825rem',
                    color: 'var(--primary-600)',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Submit early draft deliverable &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Meta Information (Read Only) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Timeline & Metadata */}
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
              Timeline & Target Dates
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
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
                  <Clock size={15} /> Estimated Duration:
                </span>
                <strong style={{ color: 'var(--slate-800)' }}>{task.estimatedHours || 0} Hours</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Building2 size={15} /> Department:
                </span>
                <strong style={{ color: 'var(--slate-800)' }}>{task.department?.name || 'Engineering'}</strong>
              </div>
            </div>
          </div>

          {/* Supervisor Information */}
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
              Supervisor / Assigned By
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-100)',
                  color: 'var(--primary-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                {task.assignedBy?.name?.charAt(0) || 'A'}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: '0.9rem' }}>
                  {task.assignedBy?.name || 'System Administrator'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'capitalize' }}>
                  {task.assignedBy?.role || 'Administrator'} • {task.assignedBy?.email}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeTaskDetailsPage;
