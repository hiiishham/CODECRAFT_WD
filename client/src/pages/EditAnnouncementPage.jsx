import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Upload,
  X,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import announcementService from '../services/announcementService.js';
import departmentService from '../services/departmentService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/announcements.css';

const CATEGORIES = ['General', 'HR', 'Holiday', 'Event', 'Meeting', 'Policy', 'Urgent', 'Other'];
const PRIORITIES = ['Normal', 'Important', 'Urgent'];
const AUDIENCES = ['All', 'Employees', 'Managers', 'Department'];
const STATUSES = ['Draft', 'Published', 'Archived'];

export const EditAnnouncementPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('Normal');
  const [audience, setAudience] = useState('All');
  const [department, setDepartment] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState('Published');
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchAnnouncement = useCallback(async () => {
    setLoading(true);
    try {
      const [annRes, deptRes] = await Promise.all([
        announcementService.getAnnouncementById(id),
        departmentService.getDepartments().catch(() => ({ departments: [] })),
      ]);

      if (deptRes.departments) {
        setDepartments(deptRes.departments);
      }

      if (annRes.success && annRes.announcement) {
        const ann = annRes.announcement;
        setTitle(ann.title);
        setContent(ann.content);
        setCategory(ann.category || 'General');
        setPriority(ann.priority || 'Normal');
        setAudience(ann.audience || 'All');
        setDepartment(ann.department?._id || ann.department || '');
        setStatus(ann.status || 'Published');
        setAttachments(ann.attachments || []);

        if (ann.publishDate) {
          setPublishDate(new Date(ann.publishDate).toISOString().slice(0, 16));
        }
        if (ann.expiryDate) {
          setExpiryDate(new Date(ann.expiryDate).toISOString().slice(0, 16));
        }
      } else {
        throw new Error(annRes.message || 'Announcement not found');
      }
    } catch (err) {
      showError(err.message || 'Failed to load announcement');
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    fetchAnnouncement();
  }, [fetchAnnouncement]);

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        showError(err.message || 'Upload error');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        status,
        attachments,
      };

      const res = await announcementService.updateAnnouncement(id, payload);
      if (res.success) {
        showSuccess('Announcement updated successfully');
        navigate('/announcements');
      } else {
        throw new Error(res.message || 'Failed to update announcement');
      }
    } catch (err) {
      showError(err.message || 'Error updating announcement');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader message="Loading announcement for editing..." fullScreen={false} />;
  }

  return (
    <div className="announcements-container">
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
            Edit Announcement
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', margin: 0 }}>
            Modify announcement content, audience targeting, dates, or status
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="ann-form-group">
            <label className="ann-form-label" htmlFor="edit-title">
              Announcement Title <span className="req">*</span>
            </label>
            <input
              type="text"
              id="edit-title"
              className="ann-form-input"
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

          <div className="ann-form-row">
            <div className="ann-form-group">
              <label className="ann-form-label" htmlFor="edit-category">
                Category <span className="req">*</span>
              </label>
              <select
                id="edit-category"
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
              <label className="ann-form-label" htmlFor="edit-priority">
                Priority Level <span className="req">*</span>
              </label>
              <select
                id="edit-priority"
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

          <div className="ann-form-row">
            <div className="ann-form-group">
              <label className="ann-form-label" htmlFor="edit-audience">
                Audience <span className="req">*</span>
              </label>
              <select
                id="edit-audience"
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

            <div className="ann-form-group">
              <label className="ann-form-label" htmlFor="edit-status">
                Status <span className="req">*</span>
              </label>
              <select
                id="edit-status"
                className="ann-form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {audience === 'Department' && (
            <div className="ann-form-group">
              <label className="ann-form-label" htmlFor="edit-department">
                Target Department <span className="req">*</span>
              </label>
              <select
                id="edit-department"
                className="ann-form-select"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              >
                <option value="">Select a Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {errors.department && (
                <div style={{ color: '#ef4444', fontSize: '0.775rem', marginTop: '0.3rem' }}>
                  {errors.department}
                </div>
              )}
            </div>
          )}

          <div className="ann-form-row">
            <div className="ann-form-group">
              <label className="ann-form-label" htmlFor="edit-pubdate">
                Publish Date & Time <span className="req">*</span>
              </label>
              <input
                type="datetime-local"
                id="edit-pubdate"
                className="ann-form-input"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                required
              />
            </div>

            <div className="ann-form-group">
              <label className="ann-form-label" htmlFor="edit-expdate">
                Expiry Date & Time (Optional)
              </label>
              <input
                type="datetime-local"
                id="edit-expdate"
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

          <div className="ann-form-group">
            <label className="ann-form-label" htmlFor="edit-content">
              Announcement Content <span className="req">*</span>
            </label>
            <textarea
              id="edit-content"
              className="ann-form-textarea"
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

          <div className="ann-form-group">
            <label className="ann-form-label">Attachments</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <label
                htmlFor="edit-attachment-file"
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
                <span>Add Attachment</span>
              </label>
              <input
                type="file"
                id="edit-attachment-file"
                style={{ display: 'none' }}
                onChange={handleAttachmentUpload}
                disabled={uploadingAttachment}
              />
              {uploadingAttachment && (
                <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                  Uploading...
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
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', justifyContent: 'flex-end' }}>
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
              }}
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="btn-create-announcement"
              disabled={submitting}
              id="save-edit-ann-btn"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Update Announcement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAnnouncementPage;
