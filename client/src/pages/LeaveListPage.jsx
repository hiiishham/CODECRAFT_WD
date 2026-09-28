import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarRange,
  Plus,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  RotateCw,
  FolderMinus,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import leaveService from '../services/leaveService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import DeleteModal from '../components/common/DeleteModal.jsx';
import Loader from '../components/common/Loader.jsx';
import { useUrlFilters } from '../hooks/useUrlFilters.js';
import { AdvancedFilters, FilterSelect } from '../components/common/AdvancedFilters.jsx';
import '../styles/leaves.css';
import '../styles/employees.css';

const LEAVE_TYPES = [
  'Casual Leave',
  'Sick Leave',
  'Annual Leave',
  'Emergency Leave',
  'Other',
];

const STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

export const LeaveListPage = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search, Filter & Pagination State (URL Sync)
  const { filters, setFilter, clearFilters, activeCount } = useUrlFilters({
    search: '',
    status: 'All',
    leaveType: 'All',
    page: '1',
    limit: '10'
  });

  const { search, status, leaveType } = filters;
  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 10;
  
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeaves, setTotalLeaves] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    onLeaveToday: 0,
  });

  // Modal Action State
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: '', // 'approve', 'reject', or 'delete'
    leave: null,
    reviewComment: '',
    isSubmitting: false,
  });

  // Debounced search
  const searchTimeoutRef = useRef(null);
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setFilter('search', value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setFilter('page', '1');
    }, 350);
  };

  const handleClearFilters = () => {
    clearFilters();
    setDebouncedSearch('');
  };

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await leaveService.getLeaves({
        page,
        limit,
        search: debouncedSearch,
        status: status !== 'All' ? status : undefined,
        leaveType: leaveType !== 'All' ? leaveType : undefined,
      });

      if (response.success) {
        setLeaves(response.leaves || []);
        setTotalPages(response.totalPages || 1);
        setTotalLeaves(response.totalLeaves || 0);
        if (response.stats) {
          setStats(response.stats);
        }
      } else {
        throw new Error(response.message || 'Failed to fetch leave requests');
      }
    } catch (err) {
      console.error('[Leaves Fetch Error]:', err.message);
      setError(err.message || 'Could not retrieve leave records');
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, status, leaveType]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  // Open modal for Approve, Reject, or Delete
  const openActionDialog = (type, leave) => {
    setActionModal({
      isOpen: true,
      type,
      leave,
      reviewComment: '',
      isSubmitting: false,
    });
  };

  const closeActionDialog = () => {
    setActionModal({
      isOpen: false,
      type: '',
      leave: null,
      reviewComment: '',
      isSubmitting: false,
    });
  };

  const handleConfirmAction = async () => {
    const { type, leave, reviewComment } = actionModal;
    if (!leave) return;

    if (type === 'reject' && !reviewComment?.trim()) {
      showError('A reason or review comment is required when rejecting a leave request');
      return;
    }

    setActionModal((prev) => ({ ...prev, isSubmitting: true }));

    try {
      if (type === 'approve') {
        const res = await leaveService.approveLeave(leave._id, reviewComment?.trim());
        if (res.success) {
          showSuccess(`Leave request for ${leave.employee?.fullName || 'employee'} approved`);
          closeActionDialog();
          fetchLeaves();
        } else {
          throw new Error(res.message || 'Failed to approve leave');
        }
      } else if (type === 'reject') {
        const res = await leaveService.rejectLeave(leave._id, reviewComment?.trim());
        if (res.success) {
          showSuccess(`Leave request for ${leave.employee?.fullName || 'employee'} rejected`);
          closeActionDialog();
          fetchLeaves();
        } else {
          throw new Error(res.message || 'Failed to reject leave');
        }
      } else if (type === 'delete') {
        const res = await leaveService.deleteLeave(leave._id);
        if (res.success) {
          showSuccess('Leave record deleted');
          closeActionDialog();
          fetchLeaves();
        } else {
          throw new Error(res.message || 'Failed to delete leave');
        }
      }
    } catch (err) {
      console.error(`[Leave ${type} Error]:`, err.message);
      showError(err.message || `Failed to ${type} leave request`);
      setActionModal((prev) => ({ ...prev, isSubmitting: false }));
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
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getLeaveTypeTagClass = (type) => {
    switch (type) {
      case 'Casual Leave':
        return 'leave-type-casual';
      case 'Sick Leave':
        return 'leave-type-sick';
      case 'Annual Leave':
        return 'leave-type-annual';
      case 'Emergency Leave':
        return 'leave-type-emergency';
      default:
        return 'leave-type-other';
    }
  };

  const getStatusBadgeClass = (st) => {
    switch (st) {
      case 'Pending':
        return 'leave-badge-pending';
      case 'Approved':
        return 'leave-badge-approved';
      case 'Rejected':
        return 'leave-badge-rejected';
      case 'Cancelled':
        return 'leave-badge-cancelled';
      default:
        return '';
    }
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const hasActiveFilters = search.trim() !== '' || status !== 'All' || leaveType !== 'All';

  // Stats calculation for summary bar
  const pendingCount = leaves.filter((l) => l.status === 'Pending').length;
  const approvedCount = leaves.filter((l) => l.status === 'Approved').length;
  const rejectedCount = leaves.filter((l) => l.status === 'Rejected').length;

  return (
    <div className="leaves-container animate-fade-in">
      {/* Header */}
      <header className="leaves-header">
        <div>
          <h1 className="leaves-title">Leave Management</h1>
          <p className="leaves-subtitle">
            Track and manage employee leave requests and time-off records.
          </p>
        </div>

        {(isAdmin || isManager) && (
          <Link
            to="/leaves/add"
            className="btn-primary"
            id="apply-leave-nav-btn"
            style={{ textDecoration: 'none' }}
          >
            <Plus size={16} />
            <span>Apply Leave</span>
          </Link>
        )}
      </header>

      {/* Summary Mini-Cards */}
      <div className="leave-stats-bar">
        <div className="leave-stat-box">
          <div className="leave-stat-icon" style={{ backgroundColor: '#eff6ff', color: 'var(--primary-600)' }}>
            <CalendarRange size={20} />
          </div>
          <div className="leave-stat-info">
            <span className="leave-stat-label">Total Requests</span>
            <span className="leave-stat-val">{stats.total || totalLeaves}</span>
          </div>
        </div>

        <div className="leave-stat-box">
          <div className="leave-stat-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
            <Clock size={20} />
          </div>
          <div className="leave-stat-info">
            <span className="leave-stat-label">Pending</span>
            <span className="leave-stat-val">{stats.pending ?? 0}</span>
          </div>
        </div>

        <div className="leave-stat-box">
          <div className="leave-stat-icon" style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
            <CheckCircle size={20} />
          </div>
          <div className="leave-stat-info">
            <span className="leave-stat-label">Approved</span>
            <span className="leave-stat-val">{stats.approved ?? 0}</span>
          </div>
        </div>

        <div className="leave-stat-box">
          <div className="leave-stat-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
            <XCircle size={20} />
          </div>
          <div className="leave-stat-info">
            <span className="leave-stat-label">Rejected</span>
            <span className="leave-stat-val">{stats.rejected ?? 0}</span>
          </div>
        </div>

        <div className="leave-stat-box">
          <div className="leave-stat-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <CheckCircle size={20} />
          </div>
          <div className="leave-stat-info">
            <span className="leave-stat-label">On Leave Today</span>
            <span className="leave-stat-val" style={{ color: '#16a34a' }}>{stats.onLeaveToday ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      {/* Advanced Filters */}
      <AdvancedFilters onClear={handleClearFilters} activeCount={activeCount}>
        <div className="search-input-wrap" style={{ gridColumn: '1 / -1', maxWidth: '400px', display: 'flex', alignItems: 'center', position: 'relative' }}>
          <Search className="search-icon" size={16} style={{ position: 'absolute', left: '1rem', color: 'var(--slate-400)' }} />
          <input
            type="text"
            className="search-input"
            id="leave-search-input"
            placeholder="Search by employee name or ID..."
            value={search}
            onChange={handleSearchChange}
            aria-label="Search leaves"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>

        <FilterSelect
          label="Status"
          value={status}
          onChange={(val) => setFilter('status', val)}
          options={STATUS_OPTIONS.map(st => ({ label: st, value: st }))}
        />

        <FilterSelect
          label="Leave Type"
          value={leaveType}
          onChange={(val) => setFilter('leaveType', val)}
          options={LEAVE_TYPES.map(t => ({ label: t, value: t }))}
        />
        
        <FilterSelect
          label="Per Page"
          value={String(limit)}
          onChange={(val) => setFilter('limit', val)}
          placeholder="10 per page"
          options={[
            { label: '10 per page', value: '10' },
            { label: '20 per page', value: '20' },
            { label: '50 per page', value: '50' }
          ]}
        />
      </AdvancedFilters>

      {/* Error Alert */}
      {error && (
        <div className="error-alert-box" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
          <button className="retry-btn" onClick={fetchLeaves}>
            <RotateCw size={14} style={{ marginRight: '0.35rem' }} />
            Retry
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {loading && !error && (
        <Loader message="Loading leave records..." fullScreen={false} />
      )}

      {/* Leaves Data Table */}
      {!loading && !error && leaves.length > 0 && (
        <div className="table-responsive" style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-xl)', border: '1px solid var(--slate-200)', boxShadow: 'var(--shadow-sm)' }}>
          <table className="recent-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Leave Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Duration</th>
                <th>Reason</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((item) => {
                const emp = item.employee;
                return (
                  <tr key={item._id}>
                    {/* Employee */}
                    <td>
                      <div className="employee-cell">
                        <div className="employee-avatar-circle">
                          {getInitials(emp?.fullName)}
                        </div>
                        <div className="employee-info-cell">
                          <span className="employee-name">{emp?.fullName || 'Deleted Employee'}</span>
                          <span className="employee-email">{emp?.department || '—'}</span>
                        </div>
                      </div>
                    </td>

                    {/* ID */}
                    <td>
                      <span className="id-badge">{emp?.employeeId || '—'}</span>
                    </td>

                    {/* Leave Type */}
                    <td>
                      <span className={`leave-type-tag ${getLeaveTypeTagClass(item.leaveType)}`}>
                        {item.leaveType}
                      </span>
                    </td>

                    {/* Start Date */}
                    <td>{formatDate(item.startDate)}</td>

                    {/* End Date */}
                    <td>{formatDate(item.endDate)}</td>

                    {/* Duration */}
                    <td>
                      <span className="duration-badge">
                        {item.duration || 1} {item.duration === 1 ? 'Day' : 'Days'}
                      </span>
                    </td>

                    {/* Reason */}
                    <td style={{ maxWidth: '180px' }}>
                      <span
                        title={item.reason}
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontSize: '0.825rem',
                          color: 'var(--slate-600)',
                        }}
                      >
                        {item.reason}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`status-pill ${getStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {/* View Button */}
                        <Link
                          to={`/leaves/${item._id}`}
                          className="action-btn view-btn"
                          title="View leave details"
                        >
                          <Eye size={15} />
                        </Link>

                        {/* Approve Button (Only if Pending) */}
                        {item.status === 'Pending' && (isAdmin || isManager) && (
                          <button
                            type="button"
                            className="action-btn"
                            style={{
                              backgroundColor: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                            }}
                            title="Approve Leave"
                            onClick={() => openActionDialog('approve', item)}
                          >
                            <Check size={15} />
                          </button>
                        )}

                        {/* Reject Button (Only if Pending) */}
                        {item.status === 'Pending' && (isAdmin || isManager) && (
                          <button
                            type="button"
                            className="action-btn"
                            style={{
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                            }}
                            title="Reject Leave"
                            onClick={() => openActionDialog('reject', item)}
                          >
                            <X size={15} />
                          </button>
                        )}

                        {/* Delete Button (Admin only) */}
                        {isAdmin && (
                          <button
                            type="button"
                            className="action-btn delete-btn"
                            title="Delete record"
                            onClick={() => openActionDialog('delete', item)}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="pagination-bar" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
              Showing Page {page} of {totalPages} ({totalLeaves} total requests)
            </span>

            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                disabled={page <= 1}
                onClick={() => setFilter('page', String(Math.max(1, page - 1)))}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                disabled={page >= totalPages}
                onClick={() => setFilter('page', String(Math.min(totalPages, page + 1)))}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && leaves.length === 0 && (
        <div className="empty-state-card" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
          <div className="empty-icon-wrap">
            <FolderMinus size={32} />
          </div>
          <h3 className="empty-title">
            {hasActiveFilters ? 'No Matching Leave Requests' : 'No Leave Requests Found'}
          </h3>
          <p className="empty-description">
            {hasActiveFilters
              ? 'Try modifying your search or removing status/type filters.'
              : 'No time-off or leave applications have been submitted yet.'}
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
            (isAdmin || isManager) && (
              <Link
                to="/leaves/add"
                className="btn-primary"
                style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus size={16} />
                <span>Apply First Leave</span>
              </Link>
            )
          )}
        </div>
      )}

      {/* Approve / Reject / Delete Confirmation Modals */}
      {actionModal.isOpen && actionModal.type === 'delete' && (
        <DeleteModal
          isOpen={actionModal.isOpen}
          onClose={closeActionDialog}
          onConfirm={handleConfirmAction}
          title="Delete Leave Request?"
          message="Are you sure you want to delete this leave request record? This action cannot be undone."
          itemName={`${actionModal.leave?.employee?.fullName || 'Employee'} (${actionModal.leave?.leaveType || 'Leave'})`}
          itemLabel="Request"
          confirmText="Delete Leave"
          isDeleting={actionModal.isSubmitting}
        />
      )}

      {actionModal.isOpen && (actionModal.type === 'approve' || actionModal.type === 'reject') && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={closeActionDialog}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--slate-200)',
              padding: '1.75rem',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: actionModal.type === 'approve' ? '#ecfdf5' : '#fee2e2',
                  color: actionModal.type === 'approve' ? '#059669' : '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: `1px solid ${actionModal.type === 'approve' ? '#a7f3d0' : '#fecaca'}`,
                }}
              >
                {actionModal.type === 'approve' ? <Check size={22} /> : <X size={22} />}
              </div>

              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: 'var(--slate-900)',
                    marginBottom: '0.4rem',
                  }}
                >
                  {actionModal.type === 'approve'
                    ? 'Approve this leave request?'
                    : 'Reject this leave request?'}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', lineHeight: 1.5 }}>
                  {actionModal.type === 'approve'
                    ? 'Confirming will approve the leave and deduct the duration from remaining balance.'
                    : 'Confirming will reject the leave request. Please provide an explanation below.'}
                </p>
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--slate-50)',
                    border: '1px solid var(--slate-200)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--slate-800)',
                  }}
                >
                  Employee: {actionModal.leave?.employee?.fullName || 'Staff Member'} ({actionModal.leave?.duration || 1} Days)
                </div>
              </div>
            </div>

            {/* Review Comment Input */}
            <div style={{ marginTop: '1.25rem' }}>
              <label
                htmlFor="modal-review-comment"
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--slate-700)',
                  marginBottom: '0.35rem',
                }}
              >
                {actionModal.type === 'reject' ? 'Reason for Rejection *' : 'Review Note (Optional)'}
              </label>
              <textarea
                id="modal-review-comment"
                rows={3}
                placeholder={
                  actionModal.type === 'reject'
                    ? 'Provide a mandatory reason for rejecting this leave request...'
                    : 'Add any optional feedback or coverage note for the employee...'
                }
                value={actionModal.reviewComment || ''}
                onChange={(e) =>
                  setActionModal((prev) => ({ ...prev, reviewComment: e.target.value }))
                }
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--slate-300)',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div
              style={{
                marginTop: '1.5rem',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={closeActionDialog}
                disabled={actionModal.isSubmitting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={actionModal.isSubmitting}
                id="confirm-leave-action-btn"
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: actionModal.type === 'approve' ? '#059669' : '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  opacity: actionModal.isSubmitting ? 0.7 : 1,
                }}
              >
                {actionModal.isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{actionModal.type === 'approve' ? 'Approve Leave' : 'Reject Leave'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveListPage;
