import { useState, useEffect, useCallback } from 'react';
import { CalendarRange, Search, Filter, Check, X, CheckCircle, XCircle, Clock, Ban, Loader2, AlertCircle } from 'lucide-react';
import managerService from '../services/managerService.js';
import Loader from '../components/common/Loader.jsx';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/leaves.css';

export const ManagerLeavePage = () => {
  const { showSuccess, showError } = useToast();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'Pending' });

  // Modal dialog state for Approve / Reject
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: '', // 'Approved' | 'Rejected'
    leave: null,
    notes: '',
    submitting: false,
  });

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const res = await managerService.getTeamLeave({ status: filters.status });
      if (res.success) {
        setLeaves(res.leaves || []);
      } else {
        showError(res.message || 'Failed to load leave requests');
      }
    } catch (err) {
      showError(err.message || 'Failed to load team leave requests');
    } finally {
      setLoading(false);
    }
  }, [filters.status, showError]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const openActionModal = (leave, type) => {
    setModalState({
      isOpen: true,
      type,
      leave,
      notes: '',
      submitting: false,
    });
  };

  const closeActionModal = () => {
    setModalState({
      isOpen: false,
      type: '',
      leave: null,
      notes: '',
      submitting: false,
    });
  };

  const handleConfirmAction = async () => {
    const { leave, type, notes } = modalState;
    if (!leave) return;

    if (type === 'Rejected' && !notes.trim()) {
      showError('Please provide a reason when rejecting a leave request');
      return;
    }

    setModalState((prev) => ({ ...prev, submitting: true }));

    try {
      const res = await managerService.updateLeaveStatus(leave._id, {
        status: type,
        notes: notes.trim(),
      });

      if (res.success) {
        showSuccess(`Leave request for ${leave.employee?.fullName || 'employee'} has been ${type.toLowerCase()}`);
        closeActionModal();
        fetchLeaves();
      } else {
        showError(res.message || `Failed to ${type.toLowerCase()} leave request`);
        setModalState((prev) => ({ ...prev, submitting: false }));
      }
    } catch (err) {
      showError(err.message || `Error updating leave status`);
      setModalState((prev) => ({ ...prev, submitting: false }));
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

  return (
    <div className="leaves-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <CalendarRange size={26} color="var(--primary-600)" />
            <span>Team Leave Requests</span>
          </h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.35rem', fontSize: '0.875rem' }}>
            Review, evaluate, and manage leave requests submitted by your team members.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="filter-select"
          style={{ padding: '0.625rem 1rem', border: '1px solid var(--slate-300)', borderRadius: '0.5rem', outline: 'none', background: 'white' }}
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <Loader message="Loading team leave requests..." />
      ) : (
        <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--slate-200)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Employee</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Dates & Duration</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Reason</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                      No team leave requests found for this filter.
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave) => {
                    const days = leave.duration || 1;
                    return (
                      <tr key={leave._id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                        <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--slate-900)' }}>
                          {leave.employee?.fullName || 'Team Member'}
                          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 400 }}>
                            {leave.employee?.employeeId || '—'} &bull; {leave.employee?.department || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--slate-700)' }}>
                          {formatDate(leave.startDate)} &mdash; {formatDate(leave.endDate)}
                          <div style={{ fontSize: '0.75rem', color: 'var(--primary-600)', fontWeight: 700, marginTop: '0.2rem' }}>
                            {days} {days === 1 ? 'Day' : 'Days'}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>{leave.leaveType}</td>
                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--slate-600)', maxWidth: '240px' }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={leave.reason}>
                            {leave.reason}
                          </div>
                          {leave.reviewComment && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                              Note: {leave.reviewComment}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {getStatusBadge(leave.status)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                          {leave.status === 'Pending' ? (
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => openActionModal(leave, 'Approved')}
                                style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '0.45rem 0.75rem', borderRadius: '0.375rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}
                                title="Approve Leave"
                              >
                                <Check size={15} />
                                <span>Approve</span>
                              </button>
                              <button 
                                onClick={() => openActionModal(leave, 'Rejected')}
                                style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '0.45rem 0.75rem', borderRadius: '0.375rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}
                                title="Reject Leave"
                              >
                                <X size={15} />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 500 }}>
                              {leave.reviewedBy?.name ? `Reviewed by ${leave.reviewedBy.name}` : 'Processed'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve / Reject Modal Dialog */}
      {modalState.isOpen && (
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
          }}
          onClick={closeActionModal}
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
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: modalState.type === 'Approved' ? '#ecfdf5' : '#fee2e2',
                  color: modalState.type === 'Approved' ? '#059669' : '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: `1px solid ${modalState.type === 'Approved' ? '#a7f3d0' : '#fecaca'}`,
                }}
              >
                {modalState.type === 'Approved' ? <Check size={22} /> : <X size={22} />}
              </div>

              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 0.4rem 0' }}>
                  {modalState.type === 'Approved' ? 'Approve Leave Request?' : 'Reject Leave Request?'}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', lineHeight: 1.5, margin: 0 }}>
                  {modalState.type === 'Approved'
                    ? 'Confirming will set this leave to Approved and deduct the days from the employee balance.'
                    : 'Confirming will reject this leave request. Please enter a reason for the employee.'}
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
                  {modalState.leave?.employee?.fullName} &bull; {modalState.leave?.duration || 1} Days ({modalState.leave?.leaveType})
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <label
                htmlFor="manager-leave-notes"
                style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '0.35rem' }}
              >
                {modalState.type === 'Rejected' ? 'Reason for Rejection *' : 'Manager Note (Optional)'}
              </label>
              <textarea
                id="manager-leave-notes"
                rows={3}
                placeholder={
                  modalState.type === 'Rejected'
                    ? 'Please explain the reason for rejecting this leave request (required)...'
                    : 'Add any optional feedback or coverage note for the employee...'
                }
                value={modalState.notes}
                onChange={(e) => setModalState({ ...modalState, notes: e.target.value })}
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

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={closeActionModal}
                disabled={modalState.submitting}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={modalState.submitting}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: modalState.type === 'Approved' ? '#059669' : '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  opacity: modalState.submitting ? 0.7 : 1,
                }}
              >
                {modalState.submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{modalState.type === 'Approved' ? 'Confirm Approval' : 'Confirm Rejection'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerLeavePage;

