import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  FileText,
  FileCheck,
  AlertCircle,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import documentService from '../services/documentService.js';
import employeeService from '../services/employeeService.js';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/documents.css';

const DOCUMENT_TYPES = [
  'Offer Letter',
  'Employment Contract',
  'Salary Slip',
  'Experience Letter',
  'ID Proof',
  'Certificate',
  'Resume',
  'Other',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const AddDocumentPage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef(null);

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  // Form State
  const [employee, setEmployee] = useState('');
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('Offer Letter');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBase64, setFileBase64] = useState('');

  // Upload & validation states
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formErrors, setFormErrors] = useState({});

  // Fetch active employees
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        const res = await employeeService.getEmployees({ limit: 200 });
        if (res.success && res.employees) {
          setEmployees(res.employees);
          if (res.employees.length > 0) {
            setEmployee(res.employees[0]._id);
          }
        }
      } catch (err) {
        showError('Failed to load employee directory');
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, [showError]);

  // File selection validation & reading
  const processFile = (file) => {
    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      showError(`File type is not supported. Allowed formats: PDF, PNG, JPG, JPEG, DOC, DOCX`);
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      showError(`File size exceeds the maximum allowed limit of 10MB`);
      return;
    }

    if (file.size === 0) {
      showError('Selected file is empty');
      return;
    }

    setSelectedFile(file);

    // If title is empty, pre-fill with file basename
    if (!title.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(baseName.charAt(0).toUpperCase() + baseName.slice(1));
    }

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result);
    };
    reader.onerror = () => {
      showError('Failed to read file content');
      setSelectedFile(null);
      setFileBase64('');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileBase64('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Form Validation
  const validate = () => {
    const errors = {};
    if (!employee) errors.employee = 'Please select an employee';
    if (!title.trim()) errors.title = 'Document title is required';
    if (!documentType) errors.documentType = 'Please select a document type';
    if (!selectedFile || !fileBase64) errors.file = 'Please select a document file to upload';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setUploading(true);
    setUploadProgress(25);

    try {
      const interval = setInterval(() => {
        setUploadProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 150);

      const formData = new FormData();
      formData.append('employee', employee);
      formData.append('title', title.trim());
      formData.append('documentType', documentType);
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      formData.append('file', selectedFile);

      const res = await documentService.uploadDocument(formData);
      clearInterval(interval);
      setUploadProgress(100);

      if (res.success) {
        showSuccess('Document uploaded successfully');
        navigate('/documents');
      } else {
        throw new Error(res.message || 'Failed to upload document');
      }
    } catch (err) {
      showError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="documents-container">
      {/* Header & Back Link */}
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
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Documents</span>
        </Link>
      </div>

      <div className="doc-form-card">
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 0.35rem 0' }}>
            Upload Employee Document
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', margin: 0 }}>
            Upload verified records, employment contracts, and letters securely into the employee vault.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Employee Select */}
          <div className="doc-form-group">
            <label className="doc-form-label" htmlFor="upload-emp-select">
              Employee <span className="req">*</span>
            </label>
            {loadingEmployees ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--slate-400)', padding: '0.5rem 0' }}>
                Loading employee list...
              </div>
            ) : (
              <select
                id="upload-emp-select"
                className="doc-form-select"
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
                required
              >
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} ({emp.employeeId}) — {emp.department}
                  </option>
                ))}
              </select>
            )}
            {formErrors.employee && (
              <div style={{ color: '#ef4444', fontSize: '0.775rem', marginTop: '0.3rem' }}>
                {formErrors.employee}
              </div>
            )}
          </div>

          {/* Document Title */}
          <div className="doc-form-group">
            <label className="doc-form-label" htmlFor="upload-title-input">
              Document Title <span className="req">*</span>
            </label>
            <input
              type="text"
              id="upload-title-input"
              className="doc-form-input"
              placeholder="e.g. Offer Letter - Senior Software Engineer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            {formErrors.title && (
              <div style={{ color: '#ef4444', fontSize: '0.775rem', marginTop: '0.3rem' }}>
                {formErrors.title}
              </div>
            )}
          </div>

          {/* Document Type Dropdown */}
          <div className="doc-form-group">
            <label className="doc-form-label" htmlFor="upload-type-select">
              Document Type <span className="req">*</span>
            </label>
            <select
              id="upload-type-select"
              className="doc-form-select"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              required
            >
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {formErrors.documentType && (
              <div style={{ color: '#ef4444', fontSize: '0.775rem', marginTop: '0.3rem' }}>
                {formErrors.documentType}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="doc-form-group">
            <label className="doc-form-label" htmlFor="upload-desc-input">
              Description / Notes (Optional)
            </label>
            <textarea
              id="upload-desc-input"
              className="doc-form-textarea"
              placeholder="Provide context or notes about this document..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* File Upload Dropzone */}
          <div className="doc-form-group">
            <label className="doc-form-label">
              Document File <span className="req">*</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              style={{ display: 'none' }}
              id="file-upload-input"
            />

            {!selectedFile ? (
              <div
                className={`doc-dropzone ${isDragging ? 'drag-active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                id="doc-dropzone-area"
              >
                <div className="doc-dropzone-icon">
                  <Upload size={24} />
                </div>
                <div className="doc-dropzone-text">
                  Click to browse or drag and drop your document
                </div>
                <div className="doc-dropzone-hint">
                  Supports PDF, PNG, JPG, JPEG, DOC, DOCX up to 10 MB
                </div>
              </div>
            ) : (
              <div className="doc-selected-file">
                <div className="doc-selected-file-info">
                  <FileText size={28} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                  <div>
                    <div className="doc-selected-file-name">{selectedFile.name}</div>
                    <div className="doc-selected-file-size">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Document'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="doc-remove-file-btn"
                  onClick={handleRemoveFile}
                  title="Remove selected file"
                  disabled={uploading}
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {formErrors.file && (
              <div style={{ color: '#ef4444', fontSize: '0.775rem', marginTop: '0.3rem' }}>
                {formErrors.file}
              </div>
            )}
          </div>

          {/* Upload Progress Bar */}
          {uploading && (
            <div style={{ margin: '1rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: '0.35rem' }}>
                <span>Uploading document to secure storage...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ height: '6px', background: 'var(--slate-100)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${uploadProgress}%`,
                    background: 'var(--primary-600)',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', justifyContent: 'flex-end' }}>
            <Link
              to="/documents"
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
              type="submit"
              className="btn-upload-document"
              id="submit-upload-doc-btn"
              disabled={uploading}
              style={{ opacity: uploading ? 0.7 : 1 }}
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Uploading Document...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Upload Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDocumentPage;
