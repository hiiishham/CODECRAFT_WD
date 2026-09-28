import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Download,
  Trash2,
  ExternalLink,
  Eye,
  Calendar,
  HardDrive,
  User,
  Building2,
  Briefcase,
  Mail,
  ShieldCheck,
  FileQuestion,
  Edit3,
  X,
  Upload,
} from 'lucide-react';
import documentService from '../services/documentService.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/common/Loader.jsx';
import DeleteModal from '../components/common/DeleteModal.jsx';
import '../styles/documents.css';

export const DocumentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    isDeleting: false,
  });

  // Edit / Replace modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDocumentType, setEditDocumentType] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [replaceFile, setReplaceFile] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchDocument = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await documentService.getDocumentById(id);
      if (res.success && res.document) {
        setDocument(res.document);
      } else {
        throw new Error(res.message || 'Document not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve document details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  // Load preview blob URL when document is ready
  useEffect(() => {
    let isMounted = true;
    let createdUrl = '';

    const loadPreview = async () => {
      if (!document?._id) return;
      const ext = document.fileName?.split('.').pop().toLowerCase();
      // Only stream preview for PDFs and web images
      if (['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) {
        setPreviewLoading(true);
        try {
          createdUrl = await documentService.fetchDocumentBlobUrl(document._id);
          if (isMounted) {
            setPreviewBlobUrl(createdUrl);
          }
        } catch (err) {
          console.warn('[DocPreview] Failed to load preview stream:', err.message);
        } finally {
          if (isMounted) setPreviewLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      isMounted = false;
      if (createdUrl) {
        window.URL.revokeObjectURL(createdUrl);
      }
    };
  }, [document]);

  // Delete Action
  const handleConfirmDelete = async () => {
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      const res = await documentService.deleteDocument(id);
      if (res.success) {
        showSuccess('Document deleted successfully');
        navigate('/documents', { replace: true });
      } else {
        throw new Error(res.message || 'Failed to delete document');
      }
    } catch (err) {
      showError(err.message || 'Failed to delete document');
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleOpenEditModal = () => {
    if (!document) return;
    setEditTitle(document.title || '');
    setEditDocumentType(document.documentType || 'Other');
    setEditDescription(document.description || '');
    setReplaceFile(null);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      showError('Document title is required');
      return;
    }

    try {
      setSavingEdit(true);
      const formData = new FormData();
      formData.append('title', editTitle.trim());
      formData.append('documentType', editDocumentType);
      formData.append('description', editDescription.trim());
      if (replaceFile) {
        formData.append('file', replaceFile);
      }

      const res = await documentService.updateDocument(id, formData);
      if (res.success) {
        showSuccess(replaceFile ? 'Document and file replaced successfully' : 'Document updated successfully');
        setIsEditModalOpen(false);
        fetchDocument();
      } else {
        throw new Error(res.message || 'Failed to update document');
      }
    } catch (err) {
      showError(err.message || 'Failed to update document');
    } finally {
      setSavingEdit(false);
    }
  };

  // Format Helpers
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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

  if (loading) {
    return <Loader message="Loading document details..." fullScreen={false} />;
  }

  if (error || !document) {
    return (
      <div className="documents-container">
        <div style={{ marginBottom: '1.25rem' }}>
          <Link
            to="/documents"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--slate-500)',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Documents</span>
          </Link>
        </div>
        <div className="doc-empty-state">
          <AlertCircle size={44} style={{ color: '#ef4444', margin: '0 auto 0.75rem auto' }} />
          <div className="doc-empty-title">{error || 'Document not found'}</div>
          <div className="doc-empty-text">
            The document you are looking for may have been deleted or moved.
          </div>
        </div>
      </div>
    );
  }

  const ext = document.fileName?.split('.').pop().toLowerCase();
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg'].includes(ext);
  const isAdmin = user?.role === 'admin';

  return (
    <div className="documents-container">
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <Link
          to="/documents"
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
          <span>Back to Documents</span>
        </Link>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          {previewBlobUrl && (
            <a
              href={previewBlobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="doc-action-btn view"
              style={{ textDecoration: 'none' }}
            >
              <ExternalLink size={15} />
              <span>Open in New Tab</span>
            </a>
          )}

          <button
            type="button"
            className="doc-action-btn"
            onClick={() => documentService.downloadDocumentFile(document._id, document.fileName)}
            id="download-doc-btn"
          >
            <Download size={15} />
            <span>Download</span>
          </button>

          <button
            type="button"
            className="doc-action-btn"
            onClick={handleOpenEditModal}
            id="edit-doc-btn"
          >
            <Edit3 size={15} />
            <span>Edit / Replace</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              className="doc-action-btn delete"
              onClick={() => setDeleteModal({ isOpen: true, isDeleting: false })}
              id="delete-doc-btn"
            >
              <Trash2 size={15} />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Preview on Left, Metadata on Right */}
      <div className="doc-details-grid">
        {/* Preview Frame */}
        <div className="doc-preview-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--slate-100)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-900)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Eye size={18} style={{ color: 'var(--primary-600)' }} />
              Document Preview
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
              {document.fileName}
            </span>
          </div>

          {previewLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 400 }}>
              <Loader message="Loading document preview..." fullScreen={false} />
            </div>
          ) : isPdf && previewBlobUrl ? (
            <iframe
              src={previewBlobUrl}
              title={document.title}
              className="doc-preview-frame"
            />
          ) : isImage && previewBlobUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem' }}>
              <img
                src={previewBlobUrl}
                alt={document.title}
                className="doc-preview-image"
              />
            </div>
          ) : (
            <div className="doc-preview-fallback">
              <FileQuestion size={48} style={{ color: 'var(--slate-300)', margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.35rem' }}>
                Preview not available in browser
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-400)', maxWidth: 360, margin: '0 auto 1.25rem auto' }}>
                This file format ({ext.toUpperCase()}) cannot be rendered directly in the browser viewer. Please download the file to view its full contents.
              </p>
              <button
                type="button"
                className="btn-upload-document"
                onClick={() => documentService.downloadDocumentFile(document._id, document.fileName)}
                style={{ display: 'inline-flex' }}
              >
                <Download size={16} />
                <span>Download Document ({formatFileSize(document.fileSize)})</span>
              </button>
            </div>
          )}
        </div>

        {/* Metadata Sidebar */}
        <div className="doc-meta-sidebar">
          {/* Employee Information Card */}
          <div className="doc-meta-card">
            <div className="doc-meta-title">
              <User size={18} style={{ color: 'var(--primary-600)' }} />
              Employee Information
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
              <div className="doc-employee-avatar" style={{ width: 44, height: 44, fontSize: '0.95rem' }}>
                {document.employee?.profileImage ? (
                  <img src={document.employee.profileImage} alt={document.employee.fullName} />
                ) : (
                  document.employee?.fullName?.[0]?.toUpperCase() || 'E'
                )}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: '0.95rem' }}>
                  {document.employee?.fullName || '—'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--slate-400)' }}>
                  {document.employee?.employeeId}
                </div>
              </div>
            </div>

            <div className="doc-meta-item">
              <span className="doc-meta-label">Department</span>
              <span className="doc-meta-val" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Building2 size={14} style={{ color: 'var(--slate-400)' }} />
                {document.employee?.department || '—'}
              </span>
            </div>

            <div className="doc-meta-item">
              <span className="doc-meta-label">Designation</span>
              <span className="doc-meta-val" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Briefcase size={14} style={{ color: 'var(--slate-400)' }} />
                {document.employee?.designation || '—'}
              </span>
            </div>

            <div className="doc-meta-item">
              <span className="doc-meta-label">Email</span>
              <span className="doc-meta-val" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Mail size={14} style={{ color: 'var(--slate-400)' }} />
                {document.employee?.email || '—'}
              </span>
            </div>
          </div>

          {/* Document Information Card */}
          <div className="doc-meta-card">
            <div className="doc-meta-title">
              <FileText size={18} style={{ color: 'var(--primary-600)' }} />
              Document Information
            </div>

            <div className="doc-meta-item">
              <span className="doc-meta-label">Title</span>
              <span className="doc-meta-val" style={{ fontWeight: 600 }}>{document.title}</span>
            </div>

            <div className="doc-meta-item">
              <span className="doc-meta-label">Document Type</span>
              <span className="doc-meta-val">
                <span className="doc-type-badge" style={{ background: '#eef2ff', color: 'var(--primary-700)' }}>
                  {document.documentType}
                </span>
              </span>
            </div>

            <div className="doc-meta-item">
              <span className="doc-meta-label">File Name</span>
              <span className="doc-meta-val">{document.fileName}</span>
            </div>

            <div className="doc-meta-item">
              <span className="doc-meta-label">File Size</span>
              <span className="doc-meta-val" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <HardDrive size={14} style={{ color: 'var(--slate-400)' }} />
                {formatFileSize(document.fileSize)}
              </span>
            </div>

            <div className="doc-meta-item">
              <span className="doc-meta-label">Uploaded By</span>
              <span className="doc-meta-val">{document.uploadedBy?.name || 'Administrator'}</span>
            </div>

            <div className="doc-meta-item">
              <span className="doc-meta-label">Uploaded Date</span>
              <span className="doc-meta-val" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} style={{ color: 'var(--slate-400)' }} />
                {formatDate(document.createdAt)}
              </span>
            </div>

            {document.description && (
              <div className="doc-meta-item">
                <span className="doc-meta-label">Description / Notes</span>
                <span className="doc-meta-val" style={{ fontSize: '0.825rem', color: 'var(--slate-600)', lineHeight: 1.4 }}>
                  {document.description}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, isDeleting: false })}
        onConfirm={handleConfirmDelete}
        title="Delete Document?"
        message="This action cannot be undone. The document will be permanently removed from storage and employee records."
        itemName={document.title}
        itemLabel="Document"
        confirmText="Delete"
        isDeleting={deleteModal.isDeleting}
      />

      {/* Edit / Replace Document Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" style={{ background: '#ffffff', borderRadius: '1rem', padding: '1.5rem', border: '1px solid var(--slate-200)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>
                Edit / Replace Document
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="doc-form-group">
                <label className="doc-form-label">Document Title <span className="req">*</span></label>
                <input
                  type="text"
                  className="doc-form-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div className="doc-form-group">
                <label className="doc-form-label">Document Type <span className="req">*</span></label>
                <select
                  className="doc-form-select"
                  value={editDocumentType}
                  onChange={(e) => setEditDocumentType(e.target.value)}
                  required
                >
                  {[
                    'Offer Letter',
                    'Employment Contract',
                    'Salary Slip',
                    'Experience Letter',
                    'ID Proof',
                    'Certificate',
                    'Resume',
                    'Other',
                  ].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="doc-form-group">
                <label className="doc-form-label">Description (Optional)</label>
                <textarea
                  className="doc-form-textarea"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="doc-form-group">
                <label className="doc-form-label">Replace Document File (Optional)</label>
                <input
                  type="file"
                  id="replace-file-input"
                  onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  style={{ fontSize: '0.85rem' }}
                />
                {replaceFile && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: '0.35rem' }}>
                    New file selected: {replaceFile.name} ({formatFileSize(replaceFile.size)})
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', borderTop: '1px solid var(--slate-100)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{
                    padding: '0.6rem 1.1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--slate-300)',
                    background: '#fff',
                    color: 'var(--slate-700)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-upload-document"
                  disabled={savingEdit}
                  id="save-edit-doc-btn"
                >
                  <Upload size={16} />
                  <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentDetailsPage;
