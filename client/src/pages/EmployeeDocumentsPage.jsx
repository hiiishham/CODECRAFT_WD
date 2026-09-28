import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Search,
  Download,
  Eye,
  File,
  Image as ImageIcon,
  Loader2,
  UploadCloud,
  FileCheck,
  Edit3,
  X,
  Upload,
} from 'lucide-react';
import documentService from '../services/documentService.js';
import DocumentUploadModal from '../components/common/DocumentUploadModal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/documents.css';

const CATEGORIES = [
  'All',
  'ID Proof',
  'Certificate',
  'Resume',
  'Offer Letter',
  'Employment Contract',
  'Salary Slip',
  'Other',
];

const EmployeeDocumentsPage = () => {
  const { showSuccess, showError } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // Replace file modal
  const [replaceModalDoc, setReplaceModalDoc] = useState(null);
  const [replaceFile, setReplaceFile] = useState(null);
  const [isReplacing, setIsReplacing] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await documentService.getMyDocuments({
        search: searchTerm.trim(),
        documentType: selectedCategory !== 'All' ? selectedCategory : undefined,
      });

      if (res.success && Array.isArray(res.documents)) {
        setDocuments(res.documents);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Failed to fetch documents', error);
      showError(error.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, showError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchDocuments]);

  const handleDownload = async (doc) => {
    try {
      setDownloadingId(doc._id);
      await documentService.downloadDocumentFile(doc._id, doc.fileName);
      showSuccess(`Downloaded ${doc.fileName}`);
    } catch (error) {
      showError(error.message || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenReplace = (doc) => {
    setReplaceModalDoc(doc);
    setReplaceFile(null);
  };

  const handleConfirmReplace = async (e) => {
    e.preventDefault();
    if (!replaceFile || !replaceModalDoc) {
      showError('Please select a file to replace');
      return;
    }

    try {
      setIsReplacing(true);
      const formData = new FormData();
      formData.append('file', replaceFile);

      const res = await documentService.updateDocument(replaceModalDoc._id, formData);
      if (res.success) {
        showSuccess('Document file replaced successfully');
        setReplaceModalDoc(null);
        setReplaceFile(null);
        fetchDocuments();
      } else {
        throw new Error(res.message || 'Replacement failed');
      }
    } catch (err) {
      showError(err.message || 'Replacement failed');
    } finally {
      setIsReplacing(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getFileClass = (fileName, mimeType) => {
    const ext = (fileName || '').split('.').pop().toLowerCase();
    if (ext === 'pdf' || mimeType?.includes('pdf')) return 'pdf';
    if (['png', 'jpg', 'jpeg'].includes(ext) || mimeType?.includes('image')) return 'image';
    return 'doc';
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'Offer Letter':
        return 'doc-type-badge offer-letter';
      case 'Employment Contract':
        return 'doc-type-badge contract';
      case 'Salary Slip':
        return 'doc-type-badge salary-slip';
      case 'Experience Letter':
        return 'doc-type-badge experience';
      case 'ID Proof':
        return 'doc-type-badge id-proof';
      case 'Certificate':
        return 'doc-type-badge certificate';
      default:
        return 'doc-type-badge other';
    }
  };

  return (
    <div className="documents-container">
      {/* Header */}
      <div className="documents-header">
        <div className="documents-header-left">
          <h1>
            <FileText size={28} style={{ color: 'var(--primary-600)' }} />
            My Documents Vault
          </h1>
          <p>Access your employment documents, contracts, letters, and upload your verified credentials.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsUploadModalOpen(true)}
          className="btn-upload-document"
          id="upload-my-doc-btn"
        >
          <UploadCloud size={18} />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="doc-filter-pills">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`doc-pill-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search Toolbar */}
      <div className="doc-filter-card" style={{ marginBottom: '1.25rem' }}>
        <div className="doc-search-box" style={{ flex: 1 }}>
          <Search size={18} className="doc-search-icon" />
          <input
            type="text"
            className="doc-search-input"
            placeholder="Search documents by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            id="emp-documents-search-input"
          />
        </div>
      </div>

      {/* Main Grid */}
      {loading ? (
        <Loader message="Loading your documents..." fullScreen={false} />
      ) : documents.length === 0 ? (
        <div className="doc-empty-state">
          <FileCheck size={44} className="doc-empty-icon" />
          <div className="doc-empty-title">
            {searchTerm || selectedCategory !== 'All'
              ? 'No documents match your filter.'
              : 'You do not have any documents in your vault yet.'}
          </div>
          <div className="doc-empty-text">
            Upload your personal identification or certificates, or check back later for company letters.
          </div>
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-upload-document"
            style={{ marginTop: '1.25rem', display: 'inline-flex' }}
          >
            <UploadCloud size={16} />
            <span>Upload Document</span>
          </button>
        </div>
      ) : (
        <div className="doc-cards-grid">
          {documents.map((doc) => {
            const fileClass = getFileClass(doc.fileName, doc.mimeType);
            const isCompanyDoc = ['Offer Letter', 'Employment Contract', 'Salary Slip', 'Experience Letter'].includes(
              doc.documentType
            );

            return (
              <div key={doc._id} className="doc-card">
                <div>
                  <div className="doc-card-top">
                    <div className={`doc-card-file-icon ${fileClass}`}>
                      {fileClass === 'pdf' ? (
                        <FileText size={22} />
                      ) : fileClass === 'image' ? (
                        <ImageIcon size={22} />
                      ) : (
                        <File size={22} />
                      )}
                    </div>
                    <div className="doc-card-meta">
                      <h3 className="doc-card-title" title={doc.title}>
                        {doc.title}
                      </h3>
                      <span className={getTypeBadgeClass(doc.documentType)}>
                        {doc.documentType}
                      </span>
                    </div>
                  </div>

                  {doc.description && (
                    <p className="doc-card-description">{doc.description}</p>
                  )}

                  <div className="doc-card-details-row">
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>{formatDate(doc.createdAt)}</span>
                  </div>
                </div>

                <div className="doc-card-actions">
                  <Link
                    to={`/employee/documents/${doc._id}`}
                    className="doc-action-btn view"
                    title="View Document Details & Preview"
                  >
                    <Eye size={15} />
                    <span>View</span>
                  </Link>

                  <button
                    type="button"
                    className="doc-action-btn"
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc._id}
                    title="Download Document"
                  >
                    {downloadingId === doc._id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Download size={15} />
                    )}
                    <span>Download</span>
                  </button>

                  {!isCompanyDoc && (
                    <button
                      type="button"
                      className="doc-action-btn"
                      onClick={() => handleOpenReplace(doc)}
                      title="Replace Document File"
                    >
                      <Edit3 size={15} />
                      <span>Replace</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Document Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          fetchDocuments();
          showSuccess('Document uploaded successfully to your vault');
        }}
        title="Upload Document to Vault"
      />

      {/* Replace Document Modal */}
      {replaceModalDoc && (
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
                onClick={() => setReplaceModalDoc(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>
              Select a new file to replace <strong>{replaceModalDoc.title}</strong>. The existing file will be replaced.
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
                  onClick={() => setReplaceModalDoc(null)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--slate-300)',
                    background: '#fff',
                    color: 'var(--slate-700)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  disabled={isReplacing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-upload-document"
                  disabled={isReplacing || !replaceFile}
                  style={{ opacity: isReplacing || !replaceFile ? 0.6 : 1 }}
                >
                  <Upload size={16} />
                  <span>{isReplacing ? 'Replacing...' : 'Upload Replacement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDocumentsPage;
