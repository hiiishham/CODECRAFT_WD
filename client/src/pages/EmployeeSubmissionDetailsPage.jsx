import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  Send,
  Upload,
  X,
  Loader2,
  Calendar,
  Building2,
  MessageSquare,
} from 'lucide-react';
import { submissionService } from '../services/submissionService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/submissions.css';
import '../styles/tasks.css';

export const EmployeeSubmissionDetailsPage = () => {
  const { id } = useParams();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubmittingLoading, setResubmittingLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Edit / Resubmission state
  const [editForm, setEditForm] = useState({
    description: '',
    githubUrl: '',
    liveUrl: '',
    attachments: [],
    employeeComment: '',
  });

  const fetchSubmission = async () => {
    setLoading(true);
    try {
      const res = await submissionService.getSubmissionById(id);
      if (res.success && res.submission) {
        const sub = res.submission;
        setSubmission(sub);
        setEditForm({
          description: sub.description || '',
          githubUrl: sub.githubUrl || '',
          liveUrl: sub.liveUrl || '',
          attachments: sub.attachments || [],
          employeeComment: sub.employeeComment || '',
        });
      } else {
        showError(res.message || 'Submission not found');
      }
    } catch (err) {
      showError(err.message || 'Error loading submission');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmission();
  }, [id]);

  const validateUrl = (urlStr) => {
    if (!urlStr || !urlStr.trim()) return true;
    try {
      const parsed = new URL(urlStr.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const validateGithubUrl = (urlStr) => {
    if (!urlStr || !urlStr.trim()) return true;
    try {
      const parsed = new URL(urlStr.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      const host = parsed.hostname.toLowerCase();
      return host === 'github.com' || host.endsWith('.github.com');
    } catch {
      return false;
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.zip', '.docx', '.doc', '.webp'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      showError(`Unsupported file. Allowed: ${allowed.join(', ')}`);
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      showError('File exceeds 20MB size limit.');
      return;
    }

    setUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append('attachments', file);

      const uploadRes = await submissionService.uploadAttachment(formData);

      if (uploadRes.success && uploadRes.files && uploadRes.files.length > 0) {
        setEditForm((prev) => ({
          ...prev,
          attachments: [...prev.attachments, ...uploadRes.files],
        }));
        showSuccess(`Uploaded ${file.name}`);
      } else {
        showError(uploadRes.message || 'Failed to upload attachment');
      }
    } catch (err) {
      showError(err.message || 'Upload error');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (idx) => {
    setEditForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== idx),
    }));
  };

  const handleResubmit = async (e) => {
    e.preventDefault();
    if (!editForm.description.trim()) {
      showError('Work description is required');
      return;
    }
    if (editForm.description.trim().length < 10) {
      showError('Work description must be at least 10 characters long');
      return;
    }
    if (editForm.githubUrl && !validateGithubUrl(editForm.githubUrl)) {
      showError('Invalid GitHub URL (must begin with http:// or https:// and point to github.com)');
      return;
    }
    if (editForm.liveUrl && !validateUrl(editForm.liveUrl)) {
      showError('Invalid Live URL (must begin with http:// or https://)');
      return;
    }

    setResubmittingLoading(true);
    try {
      const res = await submissionService.updateSubmission(id, editForm);
      if (res.success) {
        showSuccess('Work resubmitted successfully! Now pending manager review.');
        setIsResubmitting(false);
        fetchSubmission();
      } else {
        showError(res.message || 'Resubmission failed');
      }
    } catch (err) {
      showError(err.message || 'Error occurred while resubmitting');
    } finally {
      setResubmittingLoading(false);
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
    return <Loader message="Loading submission details..." />;
  }

  if (!submission) {
    return (
      <div className="task-page" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <FileCheck size={48} color="var(--slate-400)" style={{ margin: '0 auto 1rem' }} />
        <h2>Submission Not Found</h2>
        <p style={{ color: 'var(--slate-500)', marginBottom: '1.5rem' }}>
          Unable to locate this deliverable record.
        </p>
        <Link to="/employee/submissions" className="btn-primary">
          Back to My Submissions
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
        <Link to="/employee/submissions" className="breadcrumb-link">
          My Submissions
        </Link>
        <span>/</span>
        <span>{submission.task?.title || 'Deliverable'}</span>
      </div>

      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
            <h1 className="dashboard-title" style={{ margin: 0 }}>
              {submission.task?.title || 'Deliverable Submission'}
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
            Submitted on {formatDateTime(submission.submittedAt || submission.createdAt)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link
            to="/employee/submissions"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Submissions</span>
          </Link>
          {isChangesRequested && !isResubmitting && (
            <button
              type="button"
              onClick={() => setIsResubmitting(true)}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Send size={16} />
              <span>Resubmit Work</span>
            </button>
          )}
        </div>
      </div>

      {/* Changes Requested Banner */}
      {isChangesRequested && (
        <div className="review-feedback-box review-feedback-changes">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <AlertCircle size={22} color="#e11d48" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: '#9f1239', fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                Changes Requested by Reviewer
              </div>
              <p style={{ color: '#881337', fontSize: '0.875rem', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                {submission.reviewComment || 'Please review feedback and resubmit your updated deliverable.'}
              </p>
              <div style={{ fontSize: '0.75rem', color: '#be123c' }}>
                Reviewed by: <strong>{submission.reviewedBy?.name || 'Supervisor'}</strong> on {formatDate(submission.reviewedAt)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approved Banner */}
      {isApproved && (
        <div className="review-feedback-box review-feedback-approved">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <CheckCircle2 size={22} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: '#14532d', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                Work Approved!
              </div>
              <p style={{ color: '#166534', fontSize: '0.875rem', margin: '0 0 0.4rem', lineHeight: 1.5 }}>
                {submission.reviewComment ? `Reviewer feedback: "${submission.reviewComment}"` : 'Your work submission has been verified and accepted.'}
              </p>
              <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                Approved by: <strong>{submission.reviewedBy?.name || 'Supervisor'}</strong> on {formatDate(submission.reviewedAt)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Review Banner */}
      {isPending && (
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #fef3c7',
            borderLeft: '4px solid #f59e0b',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <Clock size={20} color="#d97706" />
          <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
            Your submission is currently in the review queue. Your team lead will review and notify you shortly.
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      {isResubmitting ? (
        /* Interactive Resubmission Form */
        <div
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--slate-200)',
            boxShadow: 'var(--shadow-sm)',
            padding: '2rem',
            maxWidth: '860px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
              Resubmit Work
            </h2>
            <button
              type="button"
              onClick={() => setIsResubmitting(false)}
              className="btn-secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
            >
              Cancel Edit
            </button>
          </div>

          <form onSubmit={handleResubmit}>
            {/* Description */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
                Updated Work Description <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={5}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="task-search-input"
                style={{ padding: '0.85rem', resize: 'vertical' }}
              />
            </div>

            {/* URLs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
                  <GitBranch size={16} /> GitHub Repository URL
                </label>
                <input
                  type="text"
                  value={editForm.githubUrl}
                  onChange={(e) => setEditForm({ ...editForm, githubUrl: e.target.value })}
                  className="task-search-input"
                  style={{ padding: '0.75rem 1rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
                  <Globe size={16} /> Live Demo URL
                </label>
                <input
                  type="text"
                  value={editForm.liveUrl}
                  onChange={(e) => setEditForm({ ...editForm, liveUrl: e.target.value })}
                  className="task-search-input"
                  style={{ padding: '0.75rem 1rem' }}
                />
              </div>
            </div>

            {/* Attachments */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
                Attachments
              </label>
              <div
                className="upload-dropzone"
                onClick={() => document.getElementById('resubmit-file-input').click()}
              >
                <input
                  type="file"
                  id="resubmit-file-input"
                  style={{ display: 'none' }}
                  accept=".pdf,.png,.jpg,.jpeg,.zip"
                  onChange={handleFileUpload}
                />
                {uploadingFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Loader2 className="animate-spin" size={18} color="var(--primary-600)" />
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <>
                    <Upload size={20} color="var(--slate-400)" style={{ margin: '0 auto 0.25rem' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>Click to upload updated files (Max 5MB)</span>
                  </>
                )}
              </div>

              {editForm.attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                  {editForm.attachments.map((att, idx) => (
                    <div key={idx} className="attachment-chip">
                      <File size={14} color="var(--primary-600)" />
                      <span className="attachment-chip-name">{att.fileName}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="attachment-chip-remove"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Additional Note */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
                Response Note to Reviewer
              </label>
              <textarea
                rows={2}
                placeholder="Explain the changes made in response to reviewer comments..."
                value={editForm.employeeComment}
                onChange={(e) => setEditForm({ ...editForm, employeeComment: e.target.value })}
                className="task-search-input"
                style={{ padding: '0.75rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--slate-100)', paddingTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setIsResubmitting(false)}
                className="btn-secondary"
                style={{ padding: '0.65rem 1.25rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resubmittingLoading || uploadingFile}
                className="btn-primary"
                id="confirm-resubmit-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.65rem 1.5rem' }}
              >
                {resubmittingLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Resubmitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Submit Updated Work</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Detailed Submission Readout */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
            alignItems: 'start',
          }}
          className="submission-split-layout"
        >
          {/* Left Column: Work Delivered */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-800)', margin: '0 0 1rem' }}>
                Work Delivered
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
                {submission.description}
              </div>

              {submission.employeeComment && (
                <div style={{ marginTop: '1.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                    Your Additional Comments:
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
                Deliverable Links & Artifacts
              </h3>

              {/* Resource Links */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {submission.githubUrl ? (
                  <a
                    href={submission.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resource-link-btn"
                  >
                    <GitBranch size={18} color="var(--slate-800)" />
                    <span>View GitHub Repo</span>
                  </a>
                ) : (
                  <span style={{ fontSize: '0.825rem', color: 'var(--slate-400)' }}>No GitHub repository provided</span>
                )}

                {submission.liveUrl && (
                  <a
                    href={submission.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resource-link-btn"
                  >
                    <Globe size={18} color="var(--primary-600)" />
                    <span>Open Live Demo</span>
                  </a>
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

          {/* Right Column: Review Status & Task Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Review Status Card */}
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
                Review Status
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>Status:</span>
                  {isPending && (
                    <span className="badge-sub-status badge-sub-pending">🟡 Pending Review</span>
                  )}
                  {isApproved && (
                    <span className="badge-sub-status badge-sub-approved">🟢 Approved</span>
                  )}
                  {isChangesRequested && (
                    <span className="badge-sub-status badge-sub-changes">🔴 Changes Requested</span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Reviewer:</span>
                  <strong style={{ color: 'var(--slate-800)' }}>
                    {submission.reviewedBy?.name || 'Awaiting Review'}
                  </strong>
                </div>

                {submission.reviewedAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--slate-500)' }}>Reviewed Date:</span>
                    <strong style={{ color: 'var(--slate-800)' }}>
                      {formatDate(submission.reviewedAt)}
                    </strong>
                  </div>
                )}

                {submission.reviewComment && (
                  <div style={{ borderTop: '1px solid var(--slate-100)', paddingTop: '0.85rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>
                      Reviewer Feedback:
                    </span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--slate-700)', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>
                      "{submission.reviewComment}"
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Task Info Card */}
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
                Task Specification
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                    Task Title
                  </span>
                  <Link
                    to={`/employee/tasks/${submission.task?._id}`}
                    style={{ fontWeight: 700, color: 'var(--primary-600)', textDecoration: 'none', fontSize: '0.9rem' }}
                  >
                    {submission.task?.title || 'Deliverable'}
                  </Link>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Target Due Date:</span>
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
      )}
    </div>
  );
};

export default EmployeeSubmissionDetailsPage;
