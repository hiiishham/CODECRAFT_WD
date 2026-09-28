import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarRange,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Eye,
  Calendar,
  X,
  Loader2,
} from 'lucide-react';
import leaveService from '../services/leaveService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import { useUrlFilters } from '../hooks/useUrlFilters.js';
import { AdvancedFilters, FilterSelect } from '../components/common/AdvancedFilters.jsx';
import '../styles/leaves.css';
import '../styles/tasks.css';

export const EmployeeLeavePage = () => {
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState({
    annual: { total: 20, used: 0, remaining: 20 },
    sick: { total: 10, used: 0, remaining: 10 },
    casual: { total: 7, used: 0, remaining: 7 },
    emergency: { total: 5, used: 0, remaining: 5 },
  });
  const [totalRemaining, setTotalRemaining] = useState(42);

  const [leaves, setLeaves] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
  });

  // Filter & Pagination State
  const { filters, setFilter, clearFilters, activeCount } = useUrlFilters({
    status: 'All',
    page: '1',
  });

  const { status: statusFilter } = filters;
  const page = parseInt(filters.page, 10) || 1;
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeaves, setTotalLeaves] = useState(0);

  // Cancel Request Modal State
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    leave: null,
    submitting: false,
  });

  const fetchLeaveData = useCallback(async () => {
    setLoading(true);
    try {
      const [balRes, leavesRes] = await Promise.allSettled([
        leaveService.getMyLeaveBalance(),
        leaveService.getMyLeaves({
          status: statusFilter !== 'All' ? statusFilter : undefined,
          page,
          limit,
        }),
      ]);

      if (balRes.status === 'fulfilled' && balRes.value.success) {
        setBalance(balRes.value.balance);
        setTotalRemaining(balRes.value.totalRemaining);
      }

      if (leavesRes.status === 'fulfilled' && leavesRes.value.success) {
        setLeaves(leavesRes.value.leaves || []);
        if (leavesRes.value.summary) setSummary(leavesRes.value.summary);
        setTotalPages(leavesRes.value.totalPages || 1);
        setTotalLeaves(leavesRes.value.totalLeaves || 0);
      } else if (leavesRes.status === 'rejected') {
        showError('Failed to load leave history');
      }
    } catch (err) {
      console.error('[Employee Leave Load Error]:', err);
      showError('Error loading leave information');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page, limit, showError]);

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  const handleCancelClick = (leave) => {
    setCancelModal({
      isOpen: true,
      leave,
      submitting: false,
    });
  };

  const handleConfirmCancel = async () => {
    if (!cancelModal.leave) return;
    setCancelModal((prev) => ({ ...prev, submitting: true }));

    try {
      const res = await leaveService.cancelLeave(cancelModal.leave._id);
      if (res.success) {
        showSuccess('Leave request cancelled successfully');
        setCancelModal({ isOpen: false, leave: null, submitting: false });
        fetchLeaveData();
      } else {
        showError(res.message || 'Failed to cancel leave request');
        setCancelModal((prev) => ({ ...prev, submitting: false }));
      }
    } catch (err) {
      showError(err.message || 'Error cancelling leave request');
      setCancelModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="leave-badge-approved" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700 }}>
            <CheckCircle size={13} />
            Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="leave-badge-rejected" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700 }}>
            <XCircle size={13} />
            Rejected
          </span>
        );
      case 'Cancelled':
        return (
          <span className="leave-badge-cancelled" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700 }}>
            <Ban size={13} />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="leave-badge-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700 }}>
            <Clock size={13} />
            Pending Review
          </span>
        );
    }
  };

  const getLeaveTypeTag = (type) => {
    const lower = type?.toLowerCase() || '';
    if (lower.includes('annual')) return 'leave-type-annual';
    if (lower.includes('sick')) return 'leave-type-sick';
    if (lower.includes('casual')) return 'leave-type-casual';
    if (lower.includes('emergency')) return 'leave-type-emergency';
    return 'leave-type-other';
  };

  return (
    <div className="leaves-container animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* 1. Header with Title & Action */}
      <div className="leaves-header">
        <div>
          <h1 className="leaves-title" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CalendarRange size={26} color="var(--primary-600)" />
            <span>My Leave</span>
          </h1>
          <p className="leaves-subtitle">
            Track your leave balance, view requested time-off history, and apply for new leave.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={fetchLeaveData}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 0.85rem' }}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <Link
            to="/employee/leave/add"
            className="btn-primary"
            id="request-leave-top-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.15rem' }}
          >
            <Plus size={16} />
            <span>Request Leave</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Leave Balance Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Annual Leave */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Annual Leave</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <CalendarRange size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#059669' }}>
            {balance.annual.remaining} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-500)' }}>Days Left</span>
          </div>
          <p className="stat-card-subtitle">
            Used: {balance.annual.used} of {balance.annual.total} days
          </p>
          <div className="task-progress-container" style={{ marginTop: '0.5rem' }}>
            <div className="task-progress-track" style={{ height: 5 }}>
              <div
                className="task-progress-fill"
                style={{
                  width: `${(balance.annual.remaining / balance.annual.total) * 100}%`,
                  backgroundColor: '#059669',
                }}
              />
            </div>
          </div>
        </div>

        {/* Sick Leave */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Sick Leave</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#faf5ff', color: '#7e22ce' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#7e22ce' }}>
            {balance.sick.remaining} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-500)' }}>Days Left</span>
          </div>
          <p className="stat-card-subtitle">
            Used: {balance.sick.used} of {balance.sick.total} days
          </p>
          <div className="task-progress-container" style={{ marginTop: '0.5rem' }}>
            <div className="task-progress-track" style={{ height: 5 }}>
              <div
                className="task-progress-fill"
                style={{
                  width: `${(balance.sick.remaining / balance.sick.total) * 100}%`,
                  backgroundColor: '#7e22ce',
                }}
              />
            </div>
          </div>
        </div>

        {/* Casual Leave */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Casual Leave</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#1d4ed8' }}>
            {balance.casual.remaining} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-500)' }}>Days Left</span>
          </div>
          <p className="stat-card-subtitle">
            Used: {balance.casual.used} of {balance.casual.total} days
          </p>
          <div className="task-progress-container" style={{ marginTop: '0.5rem' }}>
            <div className="task-progress-track" style={{ height: 5 }}>
              <div
                className="task-progress-fill"
                style={{
                  width: `${(balance.casual.remaining / balance.casual.total) * 100}%`,
                  backgroundColor: '#1d4ed8',
                }}
              />
            </div>
          </div>
        </div>

        {/* Emergency Leave */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Emergency Leave</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#fff1f2', color: '#be123c' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#be123c' }}>
            {balance.emergency.remaining} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-500)' }}>Days Left</span>
          </div>
          <p className="stat-card-subtitle">
            Used: {balance.emergency.used} of {balance.emergency.total} days
          </p>
          <div className="task-progress-container" style={{ marginTop: '0.5rem' }}>
            <div className="task-progress-track" style={{ height: 5 }}>
              <div
                className="task-progress-fill"
                style={{
                  width: `${(balance.emergency.remaining / balance.emergency.total) * 100}%`,
                  backgroundColor: '#be123c',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Pills Bar */}
      <AdvancedFilters onClear={clearFilters} activeCount={activeCount}>
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={(val) => {
            setFilter('status', val);
            setFilter('page', '1');
          }}
          options={[
            { label: 'Pending', value: 'Pending' },
            { label: 'Approved', value: 'Approved' },
            { label: 'Rejected', value: 'Rejected' },
            { label: 'Cancelled', value: 'Cancelled' }
          ]}
        />
      </AdvancedFilters>
      <div style={{ fontSize: '0.825rem', color: 'var(--slate-500)', marginBottom: '1rem', textAlign: 'right' }}>
        Showing {leaves.length} of {totalLeaves} requests
      </div>

      {/* 4. Leave History Table & Cards */}
      {loading ? (
        <Loader message="Loading your leave history..." />
      ) : leaves.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3.5rem 1.5rem',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            border: '1px dashed var(--slate-300)',
          }}
        >
          <CalendarRange size={44} color="var(--slate-400)" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)', margin: '0 0 0.35rem' }}>
            No leave requests found.
          </h3>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
            {statusFilter !== 'All'
              ? `You do not have any leave requests with status "${statusFilter}".`
              : 'You have not submitted any time-off requests yet.'}
          </p>
          <Link to="/employee/leave/add" className="btn-primary">
            Request Time Off
          </Link>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--slate-200)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          <div className="table-responsive">
            <table className="recent-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>Dates & Period</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Requested On</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave._id}>
                    <td>
                      <span className={`leave-type-tag ${getLeaveTypeTag(leave.leaveType)}`}>
                        {leave.leaveType}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--slate-800)', fontSize: '0.875rem' }}>
                        {formatDate(leave.startDate)} &ndash; {formatDate(leave.endDate)}
                      </div>
                    </td>
                    <td>
                      <span className="duration-badge">
                        {leave.duration || 1} {leave.duration === 1 ? 'Day' : 'Days'}
                      </span>
                    </td>
                    <td>
                      <div
                        style={{
                          fontSize: '0.825rem',
                          color: 'var(--slate-600)',
                          maxWidth: '220px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={leave.reason}
                      >
                        {leave.reason}
                      </div>
                    </td>
                    <td>{getStatusBadge(leave.status)}</td>
                    <td>
                      <span style={{ fontSize: '0.825rem', color: 'var(--slate-500)' }}>
                        {formatDate(leave.createdAt)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Link
                          to={`/employee/leave/${leave._id}`}
                          className="btn-secondary"
                          style={{
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            textDecoration: 'none',
                          }}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </Link>

                        {leave.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => handleCancelClick(leave)}
                            className="btn-secondary"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              color: '#dc2626',
                              borderColor: '#fca5a5',
                              backgroundColor: '#fff5f5',
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--slate-100)',
              }}
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-secondary"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.825rem', color: 'var(--slate-600)' }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn-secondary"
                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. Cancel Confirmation Modal */}
      {cancelModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '440px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--slate-200)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#dc2626' }}>
              <AlertCircle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                Cancel Leave Request?
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              Are you sure you want to cancel your <strong>{cancelModal.leave?.leaveType}</strong> request for{' '}
              <strong>{cancelModal.leave?.duration} day(s)</strong> ({formatDate(cancelModal.leave?.startDate)} &ndash; {formatDate(cancelModal.leave?.endDate)})?
              This action will mark the request as Cancelled.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setCancelModal({ isOpen: false, leave: null, submitting: false })}
                disabled={cancelModal.submitting}
                className="btn-secondary"
                style={{ padding: '0.55rem 1.15rem' }}
              >
                Keep Request
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelModal.submitting}
                className="btn-primary"
                id="confirm-cancel-leave-btn"
                style={{
                  padding: '0.55rem 1.15rem',
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {cancelModal.submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel Leave</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLeavePage;
