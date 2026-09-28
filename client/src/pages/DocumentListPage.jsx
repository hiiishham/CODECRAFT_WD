import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Upload,
  Search,
  Users,
  Clock,
  Trash2,
  Eye,
  Download,
  AlertCircle,
  FileCheck,
  Building2,
  FolderPlus,
} from 'lucide-react';
import documentService from '../services/documentService.js';
import employeeService from '../services/employeeService.js';
import departmentService from '../services/departmentService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import DeleteModal from '../components/common/DeleteModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import '../styles/documents.css';

const DOCUMENT_TYPES = [
  'All',
  'Offer Letter',
  'Employment Contract',
  'Salary Slip',
  'Experience Letter',
  'ID Proof',
  'Certificate',
  'Resume',
  'Other',
];

export const DocumentListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    employeesWithDocuments: 0,
    recentlyUploaded: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter options lists
  const [employeesList, setEmployeesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);

  // Active filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedEmployee, setSelectedEmployee] = useState(searchParams.get('employee') || 'All');
  const [selectedDepartment, setSelectedDepartment] = useState(searchParams.get('department') || 'All');
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || 'All');

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    documentId: null,
    documentTitle: '',
    isDeleting: false,
  });

  // Fetch filter options (employees, departments)
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [empRes, deptRes] = await Promise.all([
          employeeService.getEmployees({ limit: 200 }).catch(() => ({ employees: [] })),
          departmentService.getDepartments().catch(() => ({ departments: [] })),
        ]);

        if (empRes.employees) {
          setEmployeesList(empRes.employees);
        }
        if (deptRes.departments) {
          setDepartmentsList(deptRes.departments.map((d) => d.name));
        }
      } catch (err) {
        console.warn('[Documents] Failed to fetch filter options:', err.message);
      }
    };
    fetchOptions();
  }, []);

  // Fetch documents list & statistics
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await documentService.getDocuments({
        search: search.trim(),
        employee: selectedEmployee,
        department: selectedDepartment,
        documentType: selectedType,
      });

      if (res.success) {
        setDocuments(res.documents || []);
        if (res.stats) {
          setStats(res.stats);
        }
      } else {
        throw new Error(res.message || 'Failed to load employee documents');
      }
    } catch (err) {
      setError(err.message || 'Unable to load documents.');
      showError(err.message || 'Error loading documents');
    } finally {
      setLoading(false);
    }
  }, [search, selectedEmployee, selectedDepartment, selectedType, showError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchDocuments]);

  // Handle document deletion
  const handleDeleteClick = (doc) => {
    setDeleteModal({
      isOpen: true,
      documentId: doc._id,
      documentTitle: doc.title,
      isDeleting: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.documentId) return;

    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      const res = await documentService.deleteDocument(deleteModal.documentId);
      if (res.success) {
        showSuccess('Document deleted successfully');
        setDeleteModal({ isOpen: false, documentId: null, documentTitle: '', isDeleting: false });
        fetchDocuments();
      } else {
        throw new Error(res.message || 'Failed to delete document');
      }
    } catch (err) {
      showError(err.message || 'Failed to delete document');
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  // Format Helpers
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

  const getFormatBadge = (fileName) => {
    const ext = fileName ? fileName.split('.').pop().toUpperCase() : 'DOC';
    return <span className="doc-format-badge">{ext}</span>;
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="documents-container">
      {/* Header */}
      <div className="documents-header">
        <div className="documents-header-left">
          <h1>
            <FileText size={28} style={{ color: 'var(--primary-600)' }} />
            Employee Documents
          </h1>
          <p>Secure company repository for employee contracts, letters, and credentials</p>
        </div>
        {isAdmin && (
          <Link to="/documents/add" className="btn-upload-document" id="upload-document-btn">
            <Upload size={18} />
            <span>Upload Document</span>
          </Link>
        )}
      </div>

      {/* Top Summary Statistics Banner */}
      <div className="doc-stats-grid">
        <div className="doc-stat-card">
          <div className="doc-stat-icon blue">
            <FileText size={24} />
          </div>
          <div className="doc-stat-info">
            <span className="doc-stat-value">{stats.totalDocuments}</span>
            <span className="doc-stat-label">Total Documents</span>
          </div>
        </div>

        <div className="doc-stat-card">
          <div className="doc-stat-icon emerald">
            <Users size={24} />
          </div>
          <div className="doc-stat-info">
            <span className="doc-stat-value">{stats.employeesWithDocuments}</span>
            <span className="doc-stat-label">Employees With Documents</span>
          </div>
        </div>

        <div className="doc-stat-card">
          <div className="doc-stat-icon violet">
            <Clock size={24} />
          </div>
          <div className="doc-stat-info">
            <span className="doc-stat-value">{stats.recentlyUploaded}</span>
            <span className="doc-stat-label">Recently Uploaded (30d)</span>
          </div>
        </div>
      </div>

      {/* Filter Controls Toolbar */}
      <div className="doc-filter-card">
        <div className="doc-search-box">
          <Search size={18} className="doc-search-icon" />
          <input
            type="text"
            className="doc-search-input"
            placeholder="Search by title, filename, or employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="documents-search-input"
          />
        </div>

        {/* Employee Filter */}
        <select
          className="doc-filter-select"
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          aria-label="Filter by Employee"
          id="doc-filter-employee"
        >
          <option value="All">All Employees</option>
          {employeesList.map((emp) => (
            <option key={emp._id} value={emp._id}>
              {emp.fullName} ({emp.employeeId})
            </option>
          ))}
        </select>

        {/* Department Filter */}
        <select
          className="doc-filter-select"
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
          aria-label="Filter by Department"
          id="doc-filter-department"
        >
          <option value="All">All Departments</option>
          {departmentsList.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        {/* Document Type Filter */}
        <select
          className="doc-filter-select"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          aria-label="Filter by Document Type"
          id="doc-filter-type"
        >
          {DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === 'All' ? 'All Document Types' : t}
            </option>
          ))}
        </select>
      </div>

      {/* Main Table or State */}
      {loading ? (
        <Loader message="Loading documents catalog..." fullScreen={false} />
      ) : error ? (
        <div className="doc-empty-state">
          <AlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 0.75rem auto' }} />
          <div className="doc-empty-title">Unable to load documents</div>
          <div className="doc-empty-text">{error}</div>
        </div>
      ) : documents.length === 0 ? (
        <div className="doc-empty-state">
          <FileCheck size={44} className="doc-empty-icon" />
          <div className="doc-empty-title">
            {search || selectedEmployee !== 'All' || selectedType !== 'All' || selectedDepartment !== 'All'
              ? 'No documents match your search.'
              : 'No documents available.'}
          </div>
          <div className="doc-empty-text">
            {isAdmin ? 'Upload an employee document to get started.' : 'Check back later for company issued documents.'}
          </div>
          {isAdmin && (
            <Link
              to="/documents/add"
              className="btn-upload-document"
              style={{ marginTop: '1.25rem', display: 'inline-flex' }}
            >
              <Upload size={16} />
              <span>Upload Document</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="doc-table-card">
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Document</th>
                  <th>Type</th>
                  <th>File</th>
                  <th>Uploaded By</th>
                  <th>Uploaded Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc._id}>
                    <td>
                      <div className="doc-employee-cell">
                        <div className="doc-employee-avatar">
                          {doc.employee?.profileImage ? (
                            <img src={doc.employee.profileImage} alt={doc.employee.fullName} />
                          ) : (
                            doc.employee?.fullName?.[0]?.toUpperCase() || 'E'
                          )}
                        </div>
                        <div>
                          <div className="doc-employee-name">{doc.employee?.fullName || 'Unknown Employee'}</div>
                          <div className="doc-employee-sub">
                            {doc.employee?.employeeId} • {doc.employee?.department || '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{doc.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.fileName}
                      </div>
                    </td>

                    <td>
                      <span className={getTypeBadgeClass(doc.documentType)}>
                        {doc.documentType}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {getFormatBadge(doc.fileName)}
                        <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                          {formatFileSize(doc.fileSize)}
                        </span>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--slate-700)' }}>
                        {doc.uploadedBy?.name || 'Admin'}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.825rem', color: 'var(--slate-600)' }}>
                        {formatDate(doc.createdAt)}
                      </span>
                    </td>

                    <td>
                      <div className="doc-actions" style={{ justifyContent: 'flex-end' }}>
                        <Link
                          to={`/documents/${doc._id}`}
                          className="doc-action-btn view"
                          title="View Details"
                          id={`view-doc-${doc._id}`}
                        >
                          <Eye size={15} />
                          <span>View</span>
                        </Link>

                        <button
                          type="button"
                          className="doc-action-btn"
                          title="Download"
                          onClick={() => documentService.downloadDocumentFile(doc._id, doc.fileName)}
                        >
                          <Download size={15} />
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            className="doc-action-btn delete"
                            title="Delete Document"
                            onClick={() => handleDeleteClick(doc)}
                            id={`delete-doc-${doc._id}`}
                          >
                            <Trash2 size={15} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, documentId: null, documentTitle: '', isDeleting: false })}
        onConfirm={handleConfirmDelete}
        title="Delete Document?"
        message="This action cannot be undone. The document record and its associated storage file will be permanently removed."
        itemName={deleteModal.documentTitle}
        itemLabel="Document"
        confirmText="Delete"
        isDeleting={deleteModal.isDeleting}
      />
    </div>
  );
};

export default DocumentListPage;
