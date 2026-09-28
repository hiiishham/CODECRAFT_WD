import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Megaphone,
  Upload,
  X,
  Loader2,
  FileText,
  AlertCircle,
  Building2,
} from 'lucide-react';
import announcementService from '../services/announcementService.js';
import departmentService from '../services/departmentService.js';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/announcements.css';

const CATEGORIES = ['General', 'HR', 'Holiday', 'Event', 'Meeting', 'Policy', 'Urgent', 'Other'];
const PRIORITIES = ['Normal', 'Important', 'Urgent'];
const AUDIENCES = ['All', 'Employees', 'Managers', 'Department'];

export const AddAnnouncementPage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [departments, setDepartments] = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('Normal');
  const [audience, setAudience] = useState('All');
  const [department, setDepartment] = useState('');
  const [publishDate, setPublishDate] = useState(new Date().toISOString().slice(0, 16));
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState('Published');
  const [attachments, setAttachments] = useState([]);

  // Attachment upload state
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Fetch departments if audience is Department or to prefill
  useEffect(() => {
    const fetchDepartments = async () => {
      setLoadingDepts(true);
      try {
        const res = await departmentService.getDepartments();
        if (res.success && res.departments) {
          setDepartments(res.departments);
          if (res.departments.length > 0) {
            setDepartment(res.departments[0]._id);
          }
        }
      } catch (err) {
        console.warn('[AddAnnouncement] Failed to fetch departments:', err.message);
      } finally {
        setLoadingDepts(false);
      }
    };
    fetchDepartments();
  }, []);

  // Handle Attachment Upload
  const handleAttachmentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showError('Attachment file size cannot exceed 10 MB');
      return;
    }

    setUploadingAttachment(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await announcementService.uploadAttachment({
          fileName: file.name,
          fileData: reader.result,
          fileType: file.type,
        });

        if (res.success && res.file) {
          setAttachments((prev) => [...prev, res.file]);
          showSuccess(`Uploaded ${file.name}`);
        } else {
          throw new Error(res.message || 'Failed to upload attachment');
        }
      } catch (err) {
        showError(err.message || 'Error uploading attachment');
      } finally {
        setUploadingAttachment(false);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation
  const validate = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!content.trim()) errs.content = 'Content is required';
    if (audience === 'Department' && !department) {
      errs.department = 'Please select a target department';
    }
    if (expiryDate && publishDate && new Date(expiryDate) < new Date(publishDate)) {
      errs.expiryDate = 'Expiry date cannot be before publish date';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Handler
  const handleSave = async (submitStatus) => {
    setStatus(submitStatus);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        category,
        priority,
        audience,
        department: audience === 'Department' ? department : null,
        publishDate: publishDate ? new Date(publishDate).toISOString() : new Date().toISOString(),
        expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
        status: submitStatus,
        attachments,
      };

      const res = await announcementService.createAnnouncement(payload);
      if (res.success) {
        showSuccess(
          submitStatus === 'Published'
            ? 'Announcement published successfully'
            : 'Announcement draft saved'
        );
        navigate('/announcements');
      } else {
        throw new Error(res.message || 'Failed to create announcement');
      }
    } catch (err) {
      showError(err.message || 'Error submitting announcement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="announcements-container">
      {/* Back Link */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          to="/announcements"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--slate-500)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Announcements</span>
        </Link>
      </div>

      <div className="ann-form-card">
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 0.35rem 0' }}>
            Create Company Announcement
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', margin: 0 }}>
            Broadcast updates, holiday notices, and important policies to your workforce
          </p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave('Published'); }}>
          {/* Title */}
          <div className="ann-form-group">
            <label className="ann-form-label" htmlFor="ann-title-input">
              Announcement Title <span className="req">*</span>
            </label>
            <input
              type="text"
              id="ann-title-input"
              className="ann-form-input"
              placeholder="e.g. Office Holiday Notice - Onam Celebration"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            {errors.title && (
              <div style={{ color: '#ef4444', fontSize: '0.775rem', marginTop: '0.3rem' }}>
                {errors.title}
              </div>
            )}
          </div>

          {/* Category & Priority Row */}
          <div className="ann-form-row">
            <div className="ann-form-group">
              <label className="ann-form-label" htmlFor="ann-category-select">
                Category <span className="req">*</span>
              </label>
              <select
                id="ann-category-select"
                className="ann-form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="ann-form-group">
              <label className="ann-form-label" htmlFor="ann-priority-select">
                Priority Level <span className="req">*</span>
              </label>
              <select
                id="ann-priority-select"
                className="ann-form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                required
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Audience & Target Department Row */}
          <div className="ann-form-row">
            <div className="ann-form-group">
              <label className="ann-form-label" htmlFor="ann-audience-select">
                Target Audience <span className="req">*</span>
              </label>
              <select
                id="ann-audience-select"
                className="ann-form-select"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                required
              >
                {AUDIENCES.map((aud) => (
                  <option key={aud} value={aud}>
                    {aud}
                  </option>
                ))}
              </select>
            </div>

            {audience === 'Department' && (
              <div className="ann-form-group">
                <label className="ann-form-label" htmlFor="ann-dept-select">
                  Select Department <span className="req">*</span>
                </label>
                {loadingDepts ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--slate-400)', padding: '0.5rem 0' }}>
                    Loading departments...
                  </div>
                ) : (
                  <select
                    id="ann-dept-select"
                    className="ann-form-select"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    required
                  >
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.department && (
                  <div style={{ color: '#ef4444', fontSize: '0.775rem', marginTop: '0.3rem' }}>
                    {errors.department}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Publish Date & Expiry Date Row */}
          <div className="ann-form-row">
            <div className="ann-form-group">
              <label className="ann-form-label" htmlFor="ann-pubdate-input">
                Publish Date & Time <span className="req">*</span>
              </label>
              <input
                type="datetime-local"
                id="ann-pubdate-input"
                className="ann-form-input"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                required
              />
            </div>

            <div className="ann-form-group">
              <label className="ann-form-label" htmlFor="ann-expdate-input">
                Expiry Date & Time (Optional)
              </label>
              <input
                type="datetime-local"
                id="ann-expdate-input"
                className="ann-form-input"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
              {errors.expiryDate && (
                <div style={{ color: '#ef4444', fontSize: '0.775rem', marginTop: '0.3rem' }}>
                  {errors.expiryDate}
                </div>
              )}
            </div>
          </div>

          {/* Content Body */}
          <div className="ann-form-group">
            <label className="ann-form-label" htmlFor="ann-content-textarea">
              Announcement Content <span className="req">*</span>
            </label>
            <textarea
              id="ann-content-textarea"
              className="ann-form-textarea"
              placeholder="Write the full announcement message here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
            {errors.content && (
              <div style={{ color: '#ef4444', fontSize: '0.775rem', marginTop: '0.3rem' }}>
                {errors.content}
              </div>
            )}
          </div>

          {/* Optional File Attachments */}
          <div className="ann-form-group">
            <label className="ann-form-label">
              Attachments (Optional)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <label
                htmlFor="ann-attachment-file"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.9rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--slate-300)',
                  background: '#ffffff',
                  color: 'var(--slate-700)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Upload size={14} />
                <span>Choose Attachment</span>
              </label>
              <input
                type="file"
                id="ann-attachment-file"
                style={{ display: 'none' }}
                onChange={handleAttachmentUpload}
                disabled={uploadingAttachment}
              />
              {uploadingAttachment && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                  <Loader2 size={14} className="animate-spin" />
                  Uploading attachment...
                </span>
              )}
            </div>

            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {attachments.map((att, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '0.375rem',
                      background: 'var(--slate-100)',
                      border: '1px solid var(--slate-200)',
                      fontSize: '0.8rem',
                      color: 'var(--slate-800)',
                    }}
                  >
                    <FileText size={14} style={{ color: 'var(--primary-600)' }} />
                    <span>{att.fileName}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                      title="Remove attachment"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Link
              to="/announcements"
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--slate-300)',
                background: '#ffffff',
                color: 'var(--slate-700)',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={() => handleSave('Draft')}
              disabled={submitting}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--slate-300)',
                background: '#ffffff',
                color: 'var(--slate-700)',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              id="save-draft-ann-btn"
            >
              Save Draft
            </button>

            <button
              type="submit"
              className="btn-create-announcement"
              disabled={submitting}
              id="publish-ann-btn"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Megaphone size={16} />
                  <span>Publish Announcement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAnnouncementPage;
