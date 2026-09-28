import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Download,
  ExternalLink,
  Eye,
  Calendar,
  HardDrive,
  User,
  Shield,
  AlertCircle,
  FileQuestion,
  Edit3,
  Upload,
  X,
} from 'lucide-react';
import documentService from '../services/documentService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/documents.css';

export const EmployeeDocumentDetailsPage = () => {
  const { id } = useParams();
  const { showError } = useToast();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [replaceFile, setReplaceFile] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const { showSuccess } = useToast();

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

  // Load preview stream
  useEffect(() => {
    let isMounted = true;
    let createdUrl = '';

    const loadPreview = async () => {
      if (!document?._id) return;
      const ext = document.fileName?.split('.').pop().toLowerCase();
      if (['pdf', 'png', 'jpg', 'jpeg'].includes(ext)) {
        setPreviewLoading(true);
        try {
          createdUrl = await documentService.fetchDocumentBlobUrl(document._id);
          if (isMounted) {
            setPreviewBlobUrl(createdUrl);
          }
        } catch (err) {
          console.warn('[DocPreview] Failed to stream file:', err.message);
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

  const handleConfirmReplace = async (e) => {
    e.preventDefault();
    if (!replaceFile) {
      showError('Please select a replacement file');
      return;
    }

    try {
      setReplacing(true);
      const formData = new FormData();
      formData.append('file', replaceFile);

      const res = await documentService.updateDocument(id, formData);
      if (res.success) {
        showSuccess('Document file replaced successfully');
        setIsReplaceModalOpen(false);
        setReplaceFile(null);
        fetchDocument();
      } else {
        throw new Error(res.message || 'Failed to replace file');
      }
    } catch (err) {
      showError(err.message || 'Failed to replace file');
    } finally {
      setReplacing(false);
    }
  };

  if (loading) {
    return <Loader message="Loading document..." fullScreen={false} />;
  }

  if (error || !document) {
    return (
      <div className="documents-container">
        <div style={{ marginBottom: '1.25rem' }}>
          <Link
            to="/employee/documents"
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
            <span>Back to My Documents</span>
          </Link>
        </div>
        <div className="doc-empty-state">
          <AlertCircle size={44} style={{ color: '#ef4444', margin: '0 auto 0.75rem auto' }} />
          <div className="doc-empty-title">{error || 'Document not found'}</div>
          <div className="doc-empty-text">
            You may not be authorized to view this document or it was removed.
          </div>
        </div>
      </div>
    );
  }

  const ext = document.fileName?.split('.').pop().toLowerCase();
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg'].includes(ext);

  return (
    <div className="documents-container">
      {/* Top Navigation & Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <Link
          to="/employee/documents"
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
          <span>Back to My Documents</span>
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
            className="btn-upload-document"
            onClick={() => documentService.downloadDocumentFile(document._id, document.fileName)}
            id="download-my-doc-btn"
          >
            <Download size={16} />
            <span>Download</span>
          </button>

          {!['Offer Letter', 'Employment Contract', 'Salary Slip', 'Experience Letter'].includes(document.documentType) && (
            <button
              type="button"
              className="doc-action-btn"
              onClick={() => setIsReplaceModalOpen(true)}
              id="emp-replace-doc-btn"
            >
              <Edit3 size={15} />
              <span>Replace File</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Preview on Left, Details on Right */}
      <div className="doc-details-grid">
        {/* Preview Frame */}
        <div className="doc-preview-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--slate-100)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-900)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Eye size={18} style={{ color: 'var(--primary-600)' }} />
              Document Viewer
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
                Preview not supported in browser
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--slate-400)', maxWidth: 360, margin: '0 auto 1.25rem auto' }}>
                This file format ({ext.toUpperCase()}) cannot be rendered directly in the browser. Please download the document to view it.
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
          <div className="doc-meta-card">
            <div className="doc-meta-title">
              <Shield size={18} style={{ color: 'var(--primary-600)' }} />
              Document Details
            </div>

            <div className="doc-meta-item">
              <span className="doc-meta-label">Title</span>
              <span className="doc-meta-val" style={{ fontWeight: 600, color: 'var(--slate-900)' }}>
                {document.title}
              </span>
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
              <span className="doc-meta-label">Uploaded Date</span>
              <span className="doc-meta-val" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} style={{ color: 'var(--slate-400)' }} />
                {formatDate(document.createdAt)}
              </span>
            </div>

            <div className="doc-meta-item">
              <span className="doc-meta-label">Uploaded By</span>
              <span className="doc-meta-val" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <User size={14} style={{ color: 'var(--slate-400)' }} />
                {document.uploadedBy?.name || 'Company Administrator'}
              </span>
            </div>

            {document.description && (
              <div className="doc-meta-item">
                <span className="doc-meta-label">Description</span>
                <span className="doc-meta-val" style={{ fontSize: '0.825rem', color: 'var(--slate-600)', lineHeight: 1.4 }}>
                  {document.description}
                </span>
              </div>
            )}

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--slate-100)' }}>
              <button
                type="button"
                className="btn-upload-document"
                onClick={() => documentService.downloadDocumentFile(document._id, document.fileName)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Download size={16} />
                <span>Download Document</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Replace Document Modal */}
      {isReplaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6"
            style={{ borderRadius: '1rem', background: '#ffffff', border: '1px solid var(--slate-200)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--slate-900)' }}>
                Replace Document File
              </h3>
              <button
                type="button"
                onClick={() => setIsReplaceModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>
              Select a new file to replace <strong>{document.fileName}</strong>.
            </p>

            <form onSubmit={handleConfirmReplace}>
              <div className="doc-form-group">
                <label className="doc-form-label">New File <span className="req">*</span></label>
                <input
                  type="file"
                  onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  required
                  style={{ fontSize: '0.85rem' }}
                />
                {replaceFile && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: '0.35rem' }}>
                    Selected: {replaceFile.name} ({formatFileSize(replaceFile.size)})
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsReplaceModalOpen(false)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--slate-300)',
                    background: '#fff',
                    color: 'var(--slate-700)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  disabled={replacing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-upload-document"
                  disabled={replacing || !replaceFile}
                  style={{ opacity: replacing || !replaceFile ? 0.6 : 1 }}
                >
                  <Upload size={16} />
                  <span>{replacing ? 'Replacing...' : 'Upload Replacement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDocumentDetailsPage;
