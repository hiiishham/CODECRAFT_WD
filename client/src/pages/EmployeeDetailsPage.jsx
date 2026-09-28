import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  DollarSign,
  AlertTriangle,
  RotateCw,
  FileText,
  CheckSquare,
  Clock,
  Award,
} from 'lucide-react';
import employeeService from '../services/employeeService.js';
import documentService from '../services/documentService.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import DeleteModal from '../components/common/DeleteModal.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/employees.css';

export const EmployeeDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [employee, setEmployee] = useState(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    isDeleting: false,
  });

  const fetchEmployeeDetails = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [empRes, docRes] = await Promise.allSettled([
        employeeService.getEmployeeById(id),
        documentService.getDocuments({ employee: id }),
      ]);

      if (empRes.status === 'fulfilled' && empRes.value.success && empRes.value.employee) {
        setEmployee(empRes.value.employee);
      } else {
        throw new Error((empRes.status === 'fulfilled' && empRes.value.message) || 'Employee not found');
      }

      if (docRes.status === 'fulfilled' && docRes.value.success) {
        setDocumentCount(docRes.value.totalDocuments ?? docRes.value.count ?? 0);
      }
    } catch (err) {
      console.error('[Employee Details Error]:', err.message);
      setError(err.message || 'Failed to load employee details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchEmployeeDetails();
    }
  }, [id, fetchEmployeeDetails]);

  const handleConfirmDelete = async () => {
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));

    try {
      const response = await employeeService.deleteEmployee(id);
      if (response.success) {
        showSuccess('Employee deleted successfully');
        navigate('/employees', { replace: true });
      } else {
        throw new Error(response.message || 'Failed to delete employee');
      }
    } catch (err) {
      showError(err.message || 'Error deleting employee');
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const getInitials = (name) => {
    if (!name) return 'E';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getStatusBadgeClass = (statusVal) => {
    switch (statusVal) {
      case 'Active':
        return 'status-active';
      case 'Inactive':
        return 'status-inactive';
      case 'On Leave':
        return 'status-on-leave';
      default:
        return '';
    }
  };

  if (loading) {
    return <Loader message="Loading employee profile..." fullScreen={false} />;
  }

  if (error || !employee) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <div className="error-alert-box" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={20} />
            <span>{error || 'Employee not found'}</span>
          </div>
          <button className="retry-btn" onClick={fetchEmployeeDetails}>
            <RotateCw size={14} style={{ marginRight: '0.35rem' }} />
            Retry
          </button>
        </div>
        <Link
          to={user?.role === 'employee' ? '/employee/dashboard' : '/employees'}
          className="btn-secondary"
          style={{ marginTop: '1rem' }}
        >
          <ArrowLeft size={16} />
          <span>{user?.role === 'employee' ? 'Back to Dashboard' : 'Back to Employees'}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb-nav">
        <Link to={user?.role === 'employee' ? '/employee/dashboard' : '/employees'}>
          <ArrowLeft size={16} />
          <span>{user?.role === 'employee' ? 'Dashboard' : 'Employees'}</span>
        </Link>
        <span style={{ color: 'var(--slate-400)' }}>/</span>
        <span style={{ color: 'var(--slate-800)', fontWeight: 600 }}>
          {employee.fullName}
        </span>
      </nav>

      {/* Main Profile Card */}
      <article className="profile-card">
        {/* Profile Hero Header */}
        <header className="profile-hero">
          <div className="profile-main">
            {employee.profileImage ? (
              <img
                src={employee.profileImage}
                alt={employee.fullName}
                className="profile-avatar-large"
                style={{ objectFit: 'cover' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="profile-avatar-large">
                {getInitials(employee.fullName)}
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h1 className="profile-name">{employee.fullName}</h1>
                <span className={`status-pill ${getStatusBadgeClass(employee.status)}`}>
                  {employee.status}
                </span>
              </div>
              <p className="profile-title">
                {employee.designation} &bull; {employee.department}
              </p>
              <div style={{ marginTop: '0.4rem' }}>
                <span className="id-badge">ID: {employee.employeeId}</span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons (Admin Only) */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link to={`/employees/${id}/edit`} className="btn-primary" id="edit-profile-btn">
                <Edit2 size={16} />
                <span>Edit Profile</span>
              </Link>
              <button
                type="button"
                className="btn-danger"
                onClick={() => setDeleteModal({ isOpen: true, isDeleting: false })}
                id="delete-profile-btn"
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </header>

        {/* Profile Details Metadata Grid */}
        <section className="profile-meta-grid">
          <div className="profile-meta-item">
            <span className="profile-meta-label">
              <Mail size={14} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: '-1px' }} />
              Email Address
            </span>
            <span className="profile-meta-value">{employee.email}</span>
          </div>

          <div className="profile-meta-item">
            <span className="profile-meta-label">
              <Phone size={14} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: '-1px' }} />
              Phone Number
            </span>
            <span className="profile-meta-value">{employee.phone}</span>
          </div>

          <div className="profile-meta-item">
            <span className="profile-meta-label">
              <Building2 size={14} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: '-1px' }} />
              Department
            </span>
            <span className="profile-meta-value">{employee.department}</span>
          </div>

          <div className="profile-meta-item">
            <span className="profile-meta-label">
              <Briefcase size={14} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: '-1px' }} />
              Designation
            </span>
            <span className="profile-meta-value">{employee.designation}</span>
          </div>

          <div className="profile-meta-item">
            <span className="profile-meta-label">
              <Calendar size={14} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: '-1px' }} />
              Joined Organization
            </span>
            <span className="profile-meta-value">{formatDate(employee.joiningDate)}</span>
          </div>

          <div className="profile-meta-item">
            <span className="profile-meta-label">
              <DollarSign size={14} style={{ display: 'inline', marginRight: '0.35rem', verticalAlign: '-1px' }} />
              Annual Compensation
            </span>
            <span className="profile-meta-value" style={{ color: 'var(--success-text)', fontWeight: 700 }}>
              {formatCurrency(employee.salary)}
            </span>
          </div>
        </section>

        {/* Integrated Modules Quick Links (Tasks, Attendance, Leaves, Documents, Performance) */}
        <section style={{ margin: '1.5rem 0', padding: '1.25rem', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.85rem' }}>
            Integrated Records & Quick Actions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <Link
              to={user?.role === 'employee' ? '/employee/documents' : `/documents?employee=${id}`}
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.65rem 0.9rem', fontSize: '0.85rem' }}
              id="view-employee-documents-btn"
            >
              <FileText size={16} color="var(--primary-600)" />
              <span>Documents ({documentCount})</span>
            </Link>

            <Link
              to={user?.role === 'employee' ? '/employee/tasks' : `/tasks?employee=${id}`}
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.65rem 0.9rem', fontSize: '0.85rem' }}
              id="view-employee-tasks-btn"
            >
              <CheckSquare size={16} color="#0284c7" />
              <span>Assigned Tasks</span>
            </Link>

            <Link
              to={user?.role === 'employee' ? '/employee/attendance' : `/attendance/${employee.employeeId}`}
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.65rem 0.9rem', fontSize: '0.85rem' }}
              id="view-employee-attendance-btn"
            >
              <Clock size={16} color="#16a34a" />
              <span>Attendance History</span>
            </Link>

            <Link
              to={user?.role === 'employee' ? '/employee/leave' : '/leaves'}
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.65rem 0.9rem', fontSize: '0.85rem' }}
              id="view-employee-leaves-btn"
            >
              <Calendar size={16} color="#d97706" />
              <span>Leave Records</span>
            </Link>

            <Link
              to={user?.role === 'employee' ? '/employee/performance' : '/performance'}
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '0.65rem 0.9rem', fontSize: '0.85rem' }}
              id="view-employee-performance-btn"
            >
              <Award size={16} color="#8b5cf6" />
              <span>Performance</span>
            </Link>
          </div>
        </section>

        {/* Footer Navigation */}
        <footer
          style={{
            padding: '1.25rem 2rem',
            borderTop: '1px solid var(--slate-100)',
            backgroundColor: '#fafbfd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Link
            to={user?.role === 'employee' ? '/employee/dashboard' : '/employees'}
            className="btn-secondary"
          >
            <ArrowLeft size={16} />
            <span>{user?.role === 'employee' ? 'Back to Dashboard' : 'Back to All Employees'}</span>
          </Link>

          <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>
            System Record ID: {employee._id}
          </span>
        </footer>
      </article>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, isDeleting: false })}
        onConfirm={handleConfirmDelete}
        employeeName={employee.fullName}
        isDeleting={deleteModal.isDeleting}
      />
    </div>
  );
};

export default EmployeeDetailsPage;
