import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileCheck,
  ArrowLeft,
  GitBranch,
  Globe,
  File,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  RotateCcw,
  Calendar,
  Building2,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { submissionService } from '../services/submissionService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/submissions.css';
import '../styles/tasks.css';

export const AdminSubmissionReviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [commentError, setCommentError] = useState('');

  const fetchSubmission = async () => {
    setLoading(true);
    try {
      const res = await submissionService.getSubmissionById(id);
      if (res.success && res.submission) {
        setSubmission(res.submission);
        setReviewComment(res.submission.reviewComment || '');
      } else {
        showError(res.message || 'Submission not found');
      }
    } catch (err) {
      showError(err.message || 'Error loading submission for review');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmission();
  }, [id]);

  const handleReviewAction = async (status) => {
    if (status === 'Changes Requested' && !reviewComment.trim()) {
      setCommentError('Review comment is required when requesting changes.');
      return;
    }

    setReviewing(true);
    setCommentError('');

    try {
      const res = await submissionService.reviewSubmission(id, {
        status,
        reviewComment: reviewComment.trim(),
      });

      if (res.success) {
        showSuccess(
          status === 'Approved'
            ? 'Work submission approved successfully!'
            : 'Changes requested. Employee has been notified with feedback.'
        );
        fetchSubmission();
      } else {
        showError(res.message || 'Failed to submit review');
      }
    } catch (err) {
      showError(err.message || 'Error processing review action');
    } finally {
      setReviewing(false);
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
    return <Loader message="Loading submission review console..." />;
  }

  if (!submission) {
    return (
      <div className="task-page" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <FileCheck size={48} color="var(--slate-400)" style={{ margin: '0 auto 1rem' }} />
        <h2>Submission Not Found</h2>
        <p style={{ color: 'var(--slate-500)', marginBottom: '1.5rem' }}>
          The requested submission does not exist or has been deleted.
        </p>
        <Link to="/submissions" className="btn-primary">
          Back to Submissions
        </Link>
      </div>
    );
  }

  const isApproved = submission.status === 'Approved';
  const isChangesRequested = submission.status === 'Changes Requested';
  const isPending = submission.status === 'Pending Review';

  return (
    <div className="task-page animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Breadcrumbs */}
      <div className="submission-breadcrumb">
        <Link to="/submissions" className="breadcrumb-link">
          Work Submissions
        </Link>
        <span>/</span>
        <span>Review Submission</span>
      </div>

      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
            <h1 className="dashboard-title" style={{ margin: 0 }}>
              Review Work Submission
            </h1>
            {isPending && (
              <span className="badge-sub-status badge-sub-pending">
                🟡 Pending Review
              </span>
            )}
            {isApproved && (
              <span className="badge-sub-status badge-sub-approved">
                🟢 Approved
              </span>
            )}
            {isChangesRequested && (
              <span className="badge-sub-status badge-sub-changes">
                🔴 Changes Requested
              </span>
            )}
          </div>
          <p className="dashboard-subtitle">
            Submitted {formatDateTime(submission.submittedAt || submission.createdAt)}
          </p>
        </div>

        <div>
          <Link
            to="/submissions"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={16} />
            <span>Back to List</span>
          </Link>
        </div>
      </div>

      {/* Split Review Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: '1.5rem',
          alignItems: 'start',
        }}
        className="submission-split-layout"
      >
        {/* Left Column: Deliverables & Evidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Work Description Card */}
          <div
            style={{
              padding: '1.75rem',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--slate-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-800)', margin: '0 0 1rem' }}>
              Employee Deliverable Description
            </h2>
            <div
              style={{
                fontSize: '0.925rem',
                color: 'var(--slate-800)',
                lineHeight: 1.65,
                whiteSpace: 'pre-line',
                backgroundColor: 'var(--slate-50)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--slate-200)',
              }}
            >
              {submission.description}
            </div>

            {submission.employeeComment && (
              <div style={{ marginTop: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                  Employee Additional Note:
                </span>
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    backgroundColor: '#eff6ff',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    color: '#1e40af',
                    borderLeft: '3px solid var(--primary-500)',
                  }}
                >
                  "{submission.employeeComment}"
                </div>
              </div>
            )}
          </div>

          {/* Links & Attachments Card */}
          <div
            style={{
              padding: '1.75rem',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--slate-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--slate-800)', margin: '0 0 1.25rem' }}>
              Deliverable Verification Links
            </h3>

            {/* Links */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {submission.githubUrl ? (
                <a
                  href={submission.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resource-link-btn"
                  id="open-github-btn"
                >
                  <GitBranch size={18} color="var(--slate-900)" />
                  <span>Open GitHub Repository</span>
                </a>
              ) : (
                <span style={{ fontSize: '0.825rem', color: 'var(--slate-400)' }}>No GitHub repository provided</span>
              )}

              {submission.liveUrl ? (
                <a
                  href={submission.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="resource-link-btn"
                  id="open-live-btn"
                >
                  <Globe size={18} color="var(--primary-600)" />
                  <span>Open Live Demo</span>
                </a>
              ) : (
                <span style={{ fontSize: '0.825rem', color: 'var(--slate-400)' }}>No live demo URL provided</span>
              )}
            </div>

            {/* Attachments */}
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Uploaded Attachments ({submission.attachments?.length || 0})
              </span>

              {submission.attachments?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {submission.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.9rem',
                        backgroundColor: 'var(--slate-50)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--slate-200)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <File size={16} color="var(--primary-600)" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-800)' }}>
                          {att.fileName}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                          ({Math.round((att.fileSize || 0) / 1024)} KB)
                        </span>
                      </div>

                      {att.fileUrl && (
                        <a
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.825rem', color: 'var(--slate-400)' }}>
                  No files attached to this submission.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Review Action Panel & Profiles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Review Decision Card */}
          <div
            style={{
              padding: '1.75rem',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '2px solid var(--primary-100)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <ShieldCheck size={20} color="var(--primary-600)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>
                Review Decision
              </h3>
            </div>

            {isApproved ? (
              <div
                style={{
                  padding: '1.25rem',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: 'var(--radius-lg)',
                  color: '#065f46',
                  textAlign: 'center',
                }}
              >
                <CheckCircle2 size={32} color="#059669" style={{ margin: '0 auto 0.5rem' }} />
                <h4 style={{ margin: '0 0 0.35rem', fontWeight: 700, fontSize: '0.95rem' }}>
                  Deliverable Approved
                </h4>
                <p style={{ margin: 0, fontSize: '0.825rem', color: '#047857' }}>
                  Reviewed by <strong>{submission.reviewedBy?.name || 'Reviewer'}</strong> on {formatDateTime(submission.reviewedAt)}. This submission is finalized.
                </p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '0.4rem' }}>
                    Review Comment / Feedback {isPending ? '' : '(Previous Feedback)'}
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter approval congratulations or specific revision instructions for the employee..."
                    value={reviewComment}
                    onChange={(e) => {
                      setReviewComment(e.target.value);
                      if (commentError) setCommentError('');
                    }}
                    className="task-search-input"
                    style={{ padding: '0.75rem', resize: 'vertical' }}
                  />
                  {commentError && (
                    <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <AlertCircle size={13} />
                      <span>{commentError}</span>
                    </div>
                  )}
                </div>

                {isChangesRequested && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 'var(--radius-md)',
                      color: '#991b1b',
                      fontSize: '0.8rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Clock size={16} />
                    <span>Changes already requested. Awaiting employee resubmission.</span>
                  </div>
                )}

                {/* Actions: Approve & Request Changes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => handleReviewAction('Approved')}
                    disabled={reviewing}
                    className="btn-primary"
                    id="approve-work-btn"
                    style={{
                      backgroundColor: '#10b981',
                      borderColor: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                    }}
                  >
                    {reviewing ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    <span>APPROVE DELIVERABLE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReviewAction('Changes Requested')}
                    disabled={reviewing || isChangesRequested}
                    className="btn-secondary"
                    id="request-changes-btn"
                    style={{
                      color: isChangesRequested ? '#9ca3af' : '#dc2626',
                      borderColor: isChangesRequested ? '#e5e7eb' : '#fca5a5',
                      backgroundColor: isChangesRequested ? '#f3f4f6' : '#fef2f2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      cursor: isChangesRequested ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {reviewing ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <RotateCcw size={18} />
                    )}
                    <span>REQUEST CHANGES</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Employee Profile Card */}
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
              Employee Details
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
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
                {submission.employee?.profileImage ? (
                  <img
                    src={submission.employee.profileImage}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  submission.employee?.fullName?.charAt(0) || 'E'
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: '0.95rem' }}>
                  {submission.employee?.fullName || 'Staff Member'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                  {submission.employee?.designation} • {submission.employee?.department}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                  ID: {submission.employee?.employeeId}
                </div>
              </div>
            </div>
          </div>

          {/* Task Specifications */}
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
              Task Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.725rem', color: 'var(--slate-400)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                  Task Title
                </span>
                <Link
                  to={`/tasks/${submission.task?._id}`}
                  style={{ fontWeight: 700, color: 'var(--primary-600)', textDecoration: 'none', fontSize: '0.9rem' }}
                >
                  {submission.task?.title || 'Deliverable'}
                </Link>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Target Deadline:</span>
                <strong style={{ color: 'var(--slate-800)' }}>
                  {formatDate(submission.task?.dueDate)}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Priority:</span>
                <strong style={{ color: 'var(--slate-800)' }}>
                  {submission.task?.priority || 'Medium'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSubmissionReviewPage;
