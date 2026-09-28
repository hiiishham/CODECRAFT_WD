import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  Edit2,
  Eye,
  AlertCircle,
  RotateCw,
  FolderMinus,
} from 'lucide-react';
import departmentService from '../services/departmentService.js';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/departments.css';
import '../styles/employees.css';

export const DepartmentDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const [department, setDepartment] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDepartmentData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await departmentService.getDepartmentById(id);
      if (response.success && response.department) {
        setDepartment(response.department);
        setEmployees(response.employees || []);
      } else {
        throw new Error(response.message || 'Department details could not be retrieved');
      }
    } catch (err) {
      console.error('[Department Details Fetch Error]:', err.message);
      setError(err.message || 'Failed to load department details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDepartmentData();
  }, [fetchDepartmentData]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
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

  const isAdmin = user?.role === 'admin';

  if (loading) {
    return <Loader message="Loading department overview..." fullScreen={false} />;
  }

  if (error || !department) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '2rem auto' }}>
        <div className="error-alert-box" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={20} />
            <span>{error || 'Department not found'}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="retry-btn" onClick={fetchDepartmentData}>
              <RotateCw size={14} style={{ marginRight: '0.35rem' }} />
              Retry
            </button>
            <Link to="/departments" className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              Back to Departments
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="departments-container animate-fade-in">
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb-nav">
        <Link to="/departments">
          <ArrowLeft size={16} />
          <span>Departments</span>
        </Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--slate-800)', fontWeight: 600 }}>{department.name}</span>
      </nav>

      {/* Department Hero Card */}
      <section className="dept-details-hero">
        <div className="dept-hero-left">
          <div className="dept-hero-icon">
            <Building2 size={28} />
          </div>
          <div className="dept-hero-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2>{department.name}</h2>
              <span
                className={`status-pill ${
                  department.status === 'Active' ? 'status-active' : 'status-inactive'
                }`}
              >
                {department.status}
              </span>
            </div>
            <p className="dept-hero-desc">
              {department.description || 'No detailed description recorded for this department.'}
            </p>

            <div className="dept-hero-meta">
              <div className="dept-hero-meta-item">
                <Users size={15} color="var(--primary-600)" />
                <span style={{ fontWeight: 600, color: 'var(--slate-800)' }}>
                  {department.employeeCount || employees.length}{' '}
                  {(department.employeeCount || employees.length) === 1 ? 'member' : 'members'}
                </span>
              </div>
              <div className="dept-hero-meta-item">
                <Calendar size={15} />
                <span>Created {formatDate(department.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <Link
            to={`/departments/${department._id}/edit`}
            className="btn-secondary"
            style={{ alignSelf: 'flex-start' }}
          >
            <Edit2 size={16} />
            <span>Edit Department</span>
          </Link>
        )}
      </section>

      {/* Employees Section */}
      <section className="dashboard-card" style={{ marginTop: '0.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">
            <Users size={18} color="var(--primary-600)" />
            <span>Assigned Employees ({employees.length})</span>
          </h2>
          {isAdmin && (
            <Link to="/employees/add" className="card-action-link">
              <span>+ Add New Employee</span>
            </Link>
          )}
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {employees.length > 0 ? (
            <div className="table-responsive">
              <table className="recent-table">
                <thead>
                  <tr>
                    <th>Profile</th>
                    <th>Employee ID</th>
                    <th>Designation</th>
                    <th>Status</th>
                    <th>Joined Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp._id || emp.employeeId}>
                      <td>
                        <div className="employee-cell">
                          <div className="employee-avatar-circle">
                            {getInitials(emp.fullName)}
                          </div>
                          <div className="employee-info-cell">
                            <span className="employee-name">{emp.fullName}</span>
                            <span className="employee-email">{emp.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="id-badge">{emp.employeeId}</span>
                      </td>
                      <td>{emp.designation}</td>
                      <td>
                        <span className={`status-pill ${getStatusBadgeClass(emp.status)}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td>{formatDate(emp.createdAt || emp.joiningDate)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          to={`/employees/${emp._id}`}
                          className="action-btn view-btn"
                          title="View Employee Profile"
                          style={{ display: 'inline-flex' }}
                        >
                          <Eye size={14} />
                          <span>View Employee</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '3rem 1.5rem' }}>
              <div className="empty-icon-wrap">
                <FolderMinus size={28} />
              </div>
              <h3 className="empty-title">No Employees in this Department</h3>
              <p className="empty-description">
                There are currently no staff members assigned to {department.name}.
              </p>
              {isAdmin && (
                <Link
                  to="/employees/add"
                  className="btn-primary"
                  style={{
                    marginTop: '1rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Users size={16} />
                  <span>Assign First Employee</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DepartmentDetailsPage;
