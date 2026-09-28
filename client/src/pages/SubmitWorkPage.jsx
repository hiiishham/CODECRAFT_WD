import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  ArrowLeft,
  Send,
  Upload,
  AlertCircle,
  FileText,
  GitBranch,
  Globe,
  X,
  File,
  Loader2,
  Calendar,
  Building2,
  Flag,
} from 'lucide-react';
import { taskService } from '../services/taskService.js';
import { submissionService } from '../services/submissionService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/submissions.css';
import '../styles/tasks.css';

export const SubmitWorkPage = () => {
  const { id: taskId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [loadingTask, setLoadingTask] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [task, setTask] = useState(null);

  // Form fields
  const [formData, setFormData] = useState({
    description: '',
    githubUrl: '',
    liveUrl: '',
    attachments: [],
    employeeComment: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchTask = async () => {
      setLoadingTask(true);
      try {
        const res = await taskService.getTaskById(taskId);
        if (res.success && res.task) {
          setTask(res.task);
        } else {
          showError(res.message || 'Task not found');
        }
      } catch (err) {
        showError(err.message || 'Error loading task details');
      } finally {
        setLoadingTask(false);
      }
    };
    fetchTask();
  }, [taskId, showError]);

  // URL Validator
  const validateUrl = (urlStr) => {
    if (!urlStr || !urlStr.trim()) return true;
    try {
      const parsed = new URL(urlStr.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // GitHub URL Validator
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

    // Allowed extensions check
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.zip', '.docx', '.doc', '.webp'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      showError(`Unsupported file format. Please upload: ${allowed.join(', ')}`);
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
        setFormData((prev) => ({
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

  const removeAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const validate = () => {
    const errs = {};
    const trimmedDesc = formData.description.trim();
    if (!trimmedDesc) {
      errs.description = 'Work description is required';
    } else if (trimmedDesc.length < 10) {
      errs.description = 'Work description must be at least 10 characters long';
    } else if (trimmedDesc.length > 3000) {
      errs.description = 'Work description must not exceed 3000 characters';
    }

    if (formData.githubUrl && !validateGithubUrl(formData.githubUrl)) {
      errs.githubUrl = 'Invalid GitHub URL (must begin with http:// or https:// and point to github.com)';
    }
    if (formData.liveUrl && !validateUrl(formData.liveUrl)) {
      errs.liveUrl = 'Invalid URL format (must begin with http:// or https://)';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        taskId,
        description: formData.description.trim(),
        githubUrl: formData.githubUrl.trim(),
        liveUrl: formData.liveUrl.trim(),
        attachments: formData.attachments,
        employeeComment: formData.employeeComment.trim(),
      };

      const res = await submissionService.createSubmission(payload);
      if (res.success) {
        showSuccess('Work submitted successfully! Now pending manager review.');
        navigate('/employee/submissions');
      } else {
        showError(res.message || 'Submission failed');
      }
    } catch (err) {
      showError(err.message || 'Failed to submit work');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTask) {
    return <Loader message="Preparing submission portal..." />;
  }

  if (!task) {
    return (
      <div className="task-page" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <CheckSquare size={48} color="var(--slate-400)" style={{ margin: '0 auto 1rem' }} />
        <h2>Task Not Found</h2>
        <p style={{ color: 'var(--slate-500)', marginBottom: '1.5rem' }}>
          Unable to locate the task requested for submission.
        </p>
        <Link to="/employee/tasks" className="btn-primary">
          Back to My Tasks
        </Link>
      </div>
    );
  }

  return (
    <div className="task-page animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Breadcrumbs */}
      <div className="submission-breadcrumb">
        <Link to="/employee/tasks" className="breadcrumb-link">
          My Tasks
        </Link>
        <span>/</span>
        <Link to={`/employee/tasks/${taskId}`} className="breadcrumb-link">
          {task.title}
        </Link>
        <span>/</span>
        <span>Submit Work</span>
      </div>

      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Send size={26} color="var(--primary-600)" />
            <span>Submit Work for Review</span>
          </h1>
          <p className="dashboard-subtitle">
            Provide your deliverables, codebase repository, demo links, and notes for supervisor approval.
          </p>
        </div>

        <div>
          <Link
            to={`/employee/tasks/${taskId}`}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={16} />
            <span>Cancel</span>
          </Link>
        </div>
      </div>

      {/* Task Summary Ribbon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1rem 1.25rem',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--slate-200)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '1.75rem',
        }}
      >
        <div>
          <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase' }}>
            Task Deliverable
          </span>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--slate-900)', marginTop: '0.15rem' }}>
            {task.title}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--slate-600)' }}>
            <Building2 size={16} color="var(--slate-400)" />
            <span>{task.department?.name || 'Engineering'}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--slate-600)' }}>
            <Calendar size={16} color="var(--slate-400)" />
            <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
          </div>

          <span
            className={`badge-priority ${
              task.priority === 'Low'
                ? 'badge-priority-low'
                : task.priority === 'High'
                ? 'badge-priority-high'
                : task.priority === 'Urgent'
                ? 'badge-priority-urgent'
                : 'badge-priority-medium'
            }`}
          >
            {task.priority} Priority
          </span>
        </div>
      </div>

      {/* Submission Form Card */}
      <div
        style={{
          maxWidth: '860px',
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--slate-200)',
          boxShadow: 'var(--shadow-sm)',
          padding: '2rem',
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Work Description */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--slate-800)',
                marginBottom: '0.4rem',
              }}
            >
              Work Description <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', margin: '0 0 0.5rem' }}>
              Summarize what was accomplished, technical details, and how requirements were met.
            </p>
            <textarea
              rows={5}
              placeholder="Detail your solution, features implemented, and any testing notes..."
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
                if (errors.description) setErrors({ ...errors, description: null });
              }}
              className="task-search-input"
              style={{ padding: '0.85rem', resize: 'vertical', lineHeight: 1.5 }}
            />
            {errors.description && (
              <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <AlertCircle size={13} />
                <span>{errors.description}</span>
              </div>
            )}
          </div>

          {/* Links Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            {/* GitHub URL */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--slate-800)',
                  marginBottom: '0.4rem',
                }}
              >
                <GitBranch size={16} />
                <span>GitHub Repository URL</span>
              </label>
              <input
                type="text"
                placeholder="https://github.com/username/project"
                value={formData.githubUrl}
                onChange={(e) => {
                  setFormData({ ...formData, githubUrl: e.target.value });
                  if (errors.githubUrl) setErrors({ ...errors, githubUrl: null });
                }}
                className="task-search-input"
                style={{ padding: '0.75rem 1rem' }}
              />
              {errors.githubUrl && (
                <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={13} />
                  <span>{errors.githubUrl}</span>
                </div>
              )}
            </div>

            {/* Live Demo URL */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--slate-800)',
                  marginBottom: '0.4rem',
                }}
              >
                <Globe size={16} />
                <span>Live Demo / Preview URL</span>
              </label>
              <input
                type="text"
                placeholder="https://preview.example.com"
                value={formData.liveUrl}
                onChange={(e) => {
                  setFormData({ ...formData, liveUrl: e.target.value });
                  if (errors.liveUrl) setErrors({ ...errors, liveUrl: null });
                }}
                className="task-search-input"
                style={{ padding: '0.75rem 1rem' }}
              />
              {errors.liveUrl && (
                <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={13} />
                  <span>{errors.liveUrl}</span>
                </div>
              )}
            </div>
          </div>

          {/* Attachments Upload */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--slate-800)',
                marginBottom: '0.4rem',
              }}
            >
              Work Attachments & Documentation (PDF, PNG, JPG, ZIP &le; 5MB)
            </label>

            {/* Dropzone Trigger */}
            <div
              className="upload-dropzone"
              onClick={() => document.getElementById('work-file-input').click()}
            >
              <input
                type="file"
                id="work-file-input"
                style={{ display: 'none' }}
                accept=".pdf,.png,.jpg,.jpeg,.zip"
                onChange={handleFileUpload}
              />
              {uploadingFile ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Loader2 className="animate-spin" size={20} color="var(--primary-600)" />
                  <span style={{ fontSize: '0.875rem', color: 'var(--slate-600)' }}>Uploading attachment securely...</span>
                </div>
              ) : (
                <>
                  <Upload size={24} color="var(--slate-400)" style={{ margin: '0 auto 0.4rem' }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate-700)' }}>
                    Click to browse and attach files
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.25rem' }}>
                    Accepted types: PDF, PNG, JPG, JPEG, ZIP (Max 5MB per file)
                  </div>
                </>
              )}
            </div>

            {/* Render Attached Chips */}
            {formData.attachments.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.85rem' }}>
                {formData.attachments.map((att, idx) => (
                  <div key={idx} className="attachment-chip">
                    <File size={15} color="var(--primary-600)" />
                    <span className="attachment-chip-name" title={att.fileName}>
                      {att.fileName}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>
                      ({Math.round(att.fileSize / 1024)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="attachment-chip-remove"
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Comments */}
          <div style={{ marginBottom: '2.5rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--slate-800)',
                marginBottom: '0.4rem',
              }}
            >
              Additional Comments for Reviewer (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Any specific instructions, deployment credentials, or context..."
              value={formData.employeeComment}
              onChange={(e) => setFormData({ ...formData, employeeComment: e.target.value })}
              className="task-search-input"
              style={{ padding: '0.75rem', resize: 'vertical' }}
            />
          </div>

          {/* Submit Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--slate-200)',
            }}
          >
            <Link to={`/employee/tasks/${taskId}`} className="btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || uploadingFile}
              className="btn-primary"
              id="submit-work-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.75rem',
                fontSize: '0.95rem',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Submitting Deliverable...</span>
                </>
              ) : (
                <>
                  <Send size={18} />
                  <span>Submit Work</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitWorkPage;
