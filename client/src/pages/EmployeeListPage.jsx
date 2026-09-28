import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Users,
  AlertTriangle,
  RotateCw,
  KeyRound,
  Lock,
  X,
  Loader2,
} from 'lucide-react';
import employeeService from '../services/employeeService.js';
import departmentService from '../services/departmentService.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import DeleteModal from '../components/common/DeleteModal.jsx';
import Loader from '../components/common/Loader.jsx';
import { useUrlFilters } from '../hooks/useUrlFilters.js';
import { AdvancedFilters, FilterSelect } from '../components/common/AdvancedFilters.jsx';
import '../styles/employees.css';

const DEFAULT_DEPARTMENTS = [
  'Engineering',
  'HR',
  'Design',
  'Sales',
  'Marketing',
  'Finance',
];

const STATUSES = ['Active', 'Inactive', 'On Leave'];

export const EmployeeListPage = () => {
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [departmentsList, setDepartmentsList] = useState(DEFAULT_DEPARTMENTS);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch departments dynamically on mount
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await departmentService.getDepartments();
        if (res.success && res.departments && res.departments.length > 0) {
          setDepartmentsList(res.departments.map((d) => d.name));
        }
      } catch (e) {
        console.error('[EmployeeList] Failed to fetch departments for filter:', e.message);
      }
    };
    fetchDepts();
  }, []);

  // Advanced Filters & URL Sync
  const { filters, setFilter, setFilters, clearFilters, activeCount } = useUrlFilters({
    search: '',
    department: 'All',
    status: 'All',
    role: 'All',
    sort: 'joiningDate:desc',
    page: '1',
    limit: '8'
  });

  const { search, department, status, role, sort } = filters;
  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 8;

  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Pagination metadata from API
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalEmployees: 0,
    limit: 8,
  });

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    employeeId: null,
    employeeName: '',
    isDeleting: false,
  });

  // Reset password modal state
  const [resetModal, setResetModal] = useState({
    isOpen: false,
    employeeId: null,
    employeeName: '',
    newPassword: '',
    confirmPassword: '',
    isResetting: false,
    error: '',
  });

  // Debounce search input (350ms)
  const debounceTimer = useRef(null);
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setFilter('search', val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
      setFilter('page', '1');
    }, 350);
  };

  // Fetch employees from API
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await employeeService.getEmployees({
        page,
        limit,
        search: debouncedSearch,
        department,
        status,
        role,
        sort,
      });

      if (response.success) {
        setEmployees(response.employees || []);
        setPagination({
          currentPage: response.currentPage || page,
          totalPages: response.totalPages || 1,
          totalEmployees: response.totalEmployees || 0,
          limit: response.limit || limit,
        });
      } else {
        throw new Error(response.message || 'Failed to fetch employees');
      }
    } catch (err) {
      console.error('[Employee List Error]:', err.message);
      setError(err.message || 'Unable to retrieve employee list.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, department, status, role, sort]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Admin password reset handler
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModal.newPassword) {
      setResetModal((prev) => ({ ...prev, error: 'Password is required' }));
      return;
    }
    if (resetModal.newPassword.length < 6) {
      setResetModal((prev) => ({ ...prev, error: 'Password must be at least 6 characters' }));
      return;
    }
    if (resetModal.newPassword !== resetModal.confirmPassword) {
      setResetModal((prev) => ({ ...prev, error: 'Passwords do not match' }));
      return;
    }

    setResetModal((prev) => ({ ...prev, isResetting: true, error: '' }));
    try {
      const res = await employeeService.resetPassword(resetModal.employeeId, {
        newPassword: resetModal.newPassword,
        confirmPassword: resetModal.confirmPassword,
      });
      if (res.success) {
        showSuccess(`Password reset successfully for ${resetModal.employeeName}`);
        setResetModal({
          isOpen: false,
          employeeId: null,
          employeeName: '',
          newPassword: '',
          confirmPassword: '',
          isResetting: false,
          error: '',
        });
      } else {
        setResetModal((prev) => ({ ...prev, error: res.message || 'Failed to reset password', isResetting: false }));
      }
    } catch (err) {
      setResetModal((prev) => ({ ...prev, error: err.message || 'Failed to reset password', isResetting: false }));
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    clearFilters();
    setDebouncedSearch('');
  };

  // Delete handling
  const openDeleteModal = (emp) => {
    setDeleteModal({
      isOpen: true,
      employeeId: emp._id,
      employeeName: emp.fullName,
      isDeleting: false,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      employeeId: null,
      employeeName: '',
      isDeleting: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.employeeId) return;

    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));

    try {
      const response = await employeeService.deleteEmployee(deleteModal.employeeId);
      if (response.success) {
        showSuccess('Employee deleted successfully');
        closeDeleteModal();
        // If deleting the last item on page > 1, step back
        if (employees.length === 1 && page > 1) {
          setFilter('page', String(page - 1));
        } else {
          fetchEmployees();
        }
      } else {
        throw new Error(response.message || 'Failed to delete employee');
      }
    } catch (err) {
      showError(err.message || 'Error deleting employee');
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

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

  // Showing range calculation
  const startItem = pagination.totalEmployees === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, pagination.totalEmployees);

  const hasActiveFilters =
    debouncedSearch.trim() !== '' ||
    department !== 'All' ||
    status !== 'All' ||
    sort !== 'joiningDate:desc';

  return (
    <div className="animate-fade-in">
      {/* Top Header Bar */}
      <header className="employee-header-bar">
        <div className="employee-title-group">
          <h1>Employee Management</h1>
          <p>Manage your organization's employees</p>
        </div>
        {isAdmin && (
          <Link to="/employees/add" className="btn-primary" id="add-employee-nav-btn">
            <UserPlus size={18} />
            <span>Add Employee</span>
          </Link>
        )}
      </header>

      {/* Advanced Filters */}
      <AdvancedFilters onClear={handleClearFilters} activeCount={activeCount}>
        <div className="search-box" style={{ gridColumn: '1 / -1', maxWidth: '400px' }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search employees..."
            value={search}
            onChange={handleSearchChange}
            id="employee-search-input"
          />
        </div>

        <FilterSelect
          label="Department"
          value={department}
          onChange={(val) => setFilter('department', val)}
          options={departmentsList.map(d => ({ label: d, value: d }))}
        />

        <FilterSelect
          label="Role"
          value={role || 'All'}
          onChange={(val) => setFilter('role', val)}
          options={[
            { label: 'All Roles', value: 'All' },
            { label: 'Managers', value: 'manager' },
            { label: 'Employees', value: 'employee' },
          ]}
        />

        <FilterSelect
          label="Status"
          value={status}
          onChange={(val) => setFilter('status', val)}
          options={STATUSES.map(s => ({ label: s, value: s }))}
        />

        <FilterSelect
          label="Sort By"
          value={sort}
          onChange={(val) => setFilter('sort', val)}
          placeholder="Sort By..."
          options={[
            { label: 'Name A-Z', value: 'fullName:asc' },
            { label: 'Name Z-A', value: 'fullName:desc' },
            { label: 'Newest Joined', value: 'joiningDate:desc' },
            { label: 'Oldest Joined', value: 'joiningDate:asc' },
            { label: 'Employee ID (Asc)', value: 'employeeId:asc' },
            { label: 'Employee ID (Desc)', value: 'employeeId:desc' },
            { label: 'Status (A-Z)', value: 'status:asc' },
            { label: 'Status (Z-A)', value: 'status:desc' },
          ]}
        />
      </AdvancedFilters>

      {/* Error Alert Box */}
      {error && (
        <div className="error-alert-box" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
          <button className="retry-btn" onClick={fetchEmployees}>
            <RotateCw size={14} style={{ marginRight: '0.35rem' }} />
            Retry
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <section className="employee-table-card">
        {loading ? (
          <Loader message="Loading employees..." fullScreen={false} />
        ) : employees.length > 0 ? (
          <div className="table-responsive">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Employee ID</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Joining Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp._id}>
                    <td>
                      <div className="employee-cell">
                        {emp.profileImage ? (
                          <img
                            src={emp.profileImage}
                            alt={emp.fullName}
                            className="employee-avatar-circle"
                            style={{ objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="employee-avatar-circle">
                            {getInitials(emp.fullName)}
                          </div>
                        )}
                        <div className="employee-info-cell">
                          <span className="employee-name">{emp.fullName}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        backgroundColor: emp.role === 'manager' ? '#eef2ff' : '#f1f5f9',
                        color: emp.role === 'manager' ? '#4f46e5' : '#475569',
                        border: emp.role === 'manager' ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                      }}>
                        {emp.role || 'employee'}
                      </span>
                    </td>
                    <td>
                      <span className="id-badge">
                        {emp.employeeId}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--slate-600)' }}>{emp.email}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--slate-800)' }}>
                        {emp.department}
                      </span>
                    </td>
                    <td>{emp.designation}</td>
                    <td>{formatDate(emp.joiningDate)}</td>
                    <td>
                      <span className={`status-pill ${getStatusBadgeClass(emp.status)}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <Link
                          to={`/employees/${emp._id}`}
                          className="action-btn view"
                          title="View Employee"
                          aria-label={`View ${emp.fullName}`}
                        >
                          <Eye size={16} />
                        </Link>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              className="action-btn"
                              title="Reset Password"
                              onClick={() => setResetModal({
                                isOpen: true,
                                employeeId: emp._id,
                                employeeName: emp.fullName,
                                newPassword: '',
                                confirmPassword: '',
                                isResetting: false,
                                error: '',
                              })}
                              aria-label={`Reset password for ${emp.fullName}`}
                              style={{ color: '#d97706' }}
                            >
                              <KeyRound size={16} />
                            </button>
                            <Link
                              to={`/employees/${emp._id}/edit`}
                              className="action-btn edit"
                              title="Edit Employee"
                              aria-label={`Edit ${emp.fullName}`}
                            >
                              <Edit2 size={16} />
                            </Link>
                            <button
                              type="button"
                              className="action-btn delete"
                              title="Delete Employee"
                              onClick={() => openDeleteModal(emp)}
                              aria-label={`Delete ${emp.fullName}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <Users size={28} />
            </div>
            <h3 className="empty-title">No employees found</h3>
            <p className="empty-description">
              {hasActiveFilters
                ? 'No employees match your search or filter criteria. Try adjusting or clearing your filters.'
                : 'Your organization does not have any employees recorded yet.'}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleClearFilters}
                style={{ marginTop: '1rem' }}
              >
                Clear All Filters
              </button>
            ) : (
              <Link
                to="/employees/add"
                className="btn-primary"
                style={{ marginTop: '1rem' }}
              >
                <UserPlus size={16} />
                <span>Add First Employee</span>
              </Link>
            )}
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && pagination.totalEmployees > 0 && (
          <footer className="pagination-bar">
            <div className="pagination-info">
              Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of{' '}
              <strong>{pagination.totalEmployees}</strong> employees
            </div>

            <div className="pagination-controls">
              <button
                type="button"
                className="page-btn"
                onClick={() => setFilter('page', String(Math.max(1, page - 1)))}
                disabled={page === 1}
                id="pagination-prev-btn"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`page-btn ${p === page ? 'active' : ''}`}
                  onClick={() => setFilter('page', String(p))}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                className="page-btn"
                onClick={() => setFilter('page', String(Math.min(pagination.totalPages, page + 1)))}
                disabled={page === pagination.totalPages}
                id="pagination-next-btn"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        employeeName={deleteModal.employeeName}
        isDeleting={deleteModal.isDeleting}
      />

      {/* Reset Password Modal */}
      {resetModal.isOpen && (
        <div className="modal-backdrop animate-fade-in" style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div className="modal-dialog" style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
          }}>
            <header style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #f1f5f9',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <KeyRound size={20} color="#d97706" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Reset Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResetModal({ isOpen: false, employeeId: null, employeeName: '', newPassword: '', confirmPassword: '', isResetting: false, error: '' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleResetPassword} style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 0, marginBottom: '1.25rem' }}>
                Assign a new temporary password for <strong>{resetModal.employeeName}</strong>. The user will be required to change it on their next login.
              </p>

              {resetModal.error && (
                <div className="form-alert" role="alert" style={{ marginBottom: '1rem' }}>
                  <AlertTriangle size={18} />
                  <span>{resetModal.error}</span>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" htmlFor="admin-new-password">New Temporary Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={16} />
                  <input
                    id="admin-new-password"
                    type="password"
                    className="form-input"
                    placeholder="Min 6 characters"
                    value={resetModal.newPassword}
                    onChange={(e) => setResetModal((prev) => ({ ...prev, newPassword: e.target.value, error: '' }))}
                    disabled={resetModal.isResetting}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" htmlFor="admin-confirm-password">Confirm Password</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={16} />
                  <input
                    id="admin-confirm-password"
                    type="password"
                    className="form-input"
                    placeholder="Re-type password"
                    value={resetModal.confirmPassword}
                    onChange={(e) => setResetModal((prev) => ({ ...prev, confirmPassword: e.target.value, error: '' }))}
                    disabled={resetModal.isResetting}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setResetModal({ isOpen: false, employeeId: null, employeeName: '', newPassword: '', confirmPassword: '', isResetting: false, error: '' })}
                  disabled={resetModal.isResetting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={resetModal.isResetting}
                  style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}
                >
                  {resetModal.isResetting ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      <span>Resetting...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeListPage;
