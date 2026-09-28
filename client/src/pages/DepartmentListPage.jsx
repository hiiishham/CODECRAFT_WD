import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Users,
  RotateCcw,
  Calendar,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import departmentService from '../services/departmentService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import DeleteModal from '../components/common/DeleteModal.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/departments.css';
import '../styles/employees.css';

export const DepartmentListPage = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search and Filter State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('All');

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search input by 350ms
  const searchTimeoutRef = useRef(null);
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 350);
  };

  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatus('All');
  };

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await departmentService.getDepartments({
        search: debouncedSearch,
        status: status !== 'All' ? status : undefined,
      });

      if (response.success) {
        setDepartments(response.departments || []);
      } else {
        throw new Error(response.message || 'Failed to fetch departments');
      }
    } catch (err) {
      console.error('[Departments Fetch Error]:', err.message);
      setError(err.message || 'Could not load departments list. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const openDeleteDialog = (dept) => {
    setDeptToDelete(dept);
    setDeleteModalOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeptToDelete(null);
    setDeleteModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deptToDelete) return;

    if (deptToDelete.employeeCount > 0) {
      showError('This department has employees assigned to it. Reassign employees before deleting.');
      closeDeleteDialog();
      return;
    }

    setIsDeleting(true);
    try {
      const response = await departmentService.deleteDepartment(deptToDelete._id);
      if (response.success) {
        showSuccess(`Department "${deptToDelete.name}" deleted successfully`);
        closeDeleteDialog();
        fetchDepartments();
      } else {
        throw new Error(response.message || 'Failed to delete department');
      }
    } catch (err) {
      console.error('[Delete Department Error]:', err.message);
      showError(err.message || 'Failed to delete department');
    } finally {
      setIsDeleting(false);
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

  const isAdmin = user?.role === 'admin';
  const hasActiveFilters = search.trim() !== '' || status !== 'All';

  return (
    <div className="departments-container animate-fade-in">
      {/* Header */}
      <header className="departments-header">
        <div>
          <h1 className="departments-title">Department Management</h1>
          <p className="departments-subtitle">
            Manage company departments and track employee distribution.
          </p>
        </div>

        {isAdmin && (
          <Link
            to="/departments/add"
            className="btn-primary"
            id="add-department-btn"
            style={{ textDecoration: 'none' }}
          >
            <Plus size={16} />
            <span>Add Department</span>
          </Link>
        )}
      </header>

      {/* Search & Filter Toolbar */}
      <section className="filter-card">
        <div className="filter-controls-row">
          {/* Search Input */}
          <div className="search-input-wrap">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              className="search-input"
              id="department-search-input"
              placeholder="Search by department name or description..."
              value={search}
              onChange={handleSearchChange}
              aria-label="Search departments"
            />
          </div>

          {/* Status Filter */}
          <div className="filter-group">
            <label className="filter-label" htmlFor="dept-status-filter">
              Status:
            </label>
            <select
              id="dept-status-filter"
              className="filter-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              className="btn-clear-filters"
              onClick={handleClearFilters}
              title="Reset all search and filter conditions"
            >
              <RotateCcw size={14} />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </section>

      {/* Error Alert */}
      {error && (
        <div className="error-alert-box" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
          <button className="retry-btn" onClick={fetchDepartments}>
            <RotateCw size={14} style={{ marginRight: '0.35rem' }} />
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <Loader message="Loading departments..." fullScreen={false} />
      )}

      {/* Content: Departments Grid */}
      {!loading && !error && departments.length > 0 && (
        <div className="dept-grid">
          {departments.map((dept) => (
            <div key={dept._id} className="dept-card">
              <div>
                <div className="dept-card-top">
                  <div className="dept-card-icon-wrap">
                    <Building2 size={22} />
                  </div>
                  <span
                    className={`status-pill ${
                      dept.status === 'Active' ? 'status-active' : 'status-inactive'
                    }`}
                  >
                    {dept.status}
                  </span>
                </div>

                <h3 className="dept-card-title">{dept.name}</h3>
                <p className="dept-card-desc">
                  {dept.description || 'No description provided.'}
                </p>

                <div className="dept-card-stats">
                  <span className="dept-count-badge">
                    <Users size={15} color="var(--primary-600)" />
                    <span>{dept.employeeCount || 0} {dept.employeeCount === 1 ? 'employee' : 'employees'}</span>
                  </span>
                  <span className="dept-card-date" title={`Created: ${formatDate(dept.createdAt)}`}>
                    <Calendar size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                    {formatDate(dept.createdAt)}
                  </span>
                </div>
              </div>

              <div className="dept-card-actions">
                <Link
                  to={`/departments/${dept._id}`}
                  className="dept-btn-action btn-view"
                  title="View department details & assigned employees"
                >
                  <Eye size={14} />
                  <span>View</span>
                </Link>

                {isAdmin && (
                  <>
                    <Link
                      to={`/departments/${dept._id}/edit`}
                      className="dept-btn-action btn-edit"
                      title="Edit department settings"
                    >
                      <Edit2 size={14} />
                      <span>Edit</span>
                    </Link>

                    <button
                      type="button"
                      className="dept-btn-action btn-delete"
                      onClick={() => openDeleteDialog(dept)}
                      title={
                        dept.employeeCount > 0
                          ? 'Cannot delete department with assigned employees'
                          : 'Delete department'
                      }
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && departments.length === 0 && (
        <div className="empty-state-card" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
          <div className="empty-icon-wrap">
            <Building2 size={32} />
          </div>
          <h3 className="empty-title">
            {hasActiveFilters ? 'No Matching Departments' : 'No Departments Found'}
          </h3>
          <p className="empty-description">
            {hasActiveFilters
              ? 'Try modifying your search keywords or removing status filters.'
              : 'Get started by creating your first organizational department.'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={handleClearFilters}
              className="btn-secondary"
              style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RotateCcw size={14} />
              <span>Clear All Filters</span>
            </button>
          ) : (
            isAdmin && (
              <Link
                to="/departments/add"
                className="btn-primary"
                style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={16} />
                <span>Add First Department</span>
              </Link>
            )
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deptToDelete && (
        <DeleteModal
          isOpen={deleteModalOpen}
          onClose={closeDeleteDialog}
          onConfirm={handleConfirmDelete}
          title={
            deptToDelete.employeeCount > 0
              ? 'Cannot Delete Department'
              : 'Delete Department?'
          }
          message={
            deptToDelete.employeeCount > 0
              ? 'This department has employees assigned to it. Reassign employees before deleting.'
              : `Are you sure you want to delete this department? This action cannot be undone.`
          }
          itemName={
            deptToDelete.employeeCount > 0
              ? `${deptToDelete.name} (${deptToDelete.employeeCount} assigned)`
              : deptToDelete.name
          }
          itemLabel="Department"
          confirmText="Delete Department"
          confirmDisabled={deptToDelete.employeeCount > 0}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};

export default DepartmentListPage;
