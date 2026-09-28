import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Check,
  X,
  AlertCircle,
  RotateCw,
  User,
  Calendar,
  FileText,
  Loader2,
} from 'lucide-react';
import leaveService from '../services/leaveService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/leaves.css';
import '../styles/employees.css';

export const LeaveDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [leave, setLeave] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Confirmation Modal
  const [modalType, setModalType] = useState(null); // 'approve' | 'reject' | null
  const [reviewComment, setReviewComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLeaveDetails = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await leaveService.getLeaveById(id);
      if (response.success && response.leave) {
        setLeave(response.leave);
      } else {
        throw new Error(response.message || 'Leave request not found');
      }
    } catch (err) {
      console.error('[Leave Details Error]:', err.message);
      setError(err.message || 'Failed to load leave details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLeaveDetails();
  }, [fetchLeaveDetails]);

  const handleActionConfirm = async () => {
    if (!modalType) return;
    if (modalType === 'reject' && !reviewComment.trim()) {
      showError('A reason or review comment is required when rejecting a leave request');
      return;
    }

    setActionLoading(true);

    try {
      if (modalType === 'approve') {
        const res = await leaveService.approveLeave(id, reviewComment.trim());
        if (res.success) {
          showSuccess('Leave request has been approved');
          setModalType(null);
          setReviewComment('');
          fetchLeaveDetails();
        } else {
          throw new Error(res.message || 'Failed to approve leave');
        }
      } else if (modalType === 'reject') {
        const res = await leaveService.rejectLeave(id, reviewComment.trim());
        if (res.success) {
          showSuccess('Leave request has been rejected');
          setModalType(null);
          setReviewComment('');
          fetchLeaveDetails();
        } else {
          throw new Error(res.message || 'Failed to reject leave');
        }
      }
    } catch (err) {
      console.error(`[Leave Action Error]:`, err.message);
      showError(err.message || `Failed to ${modalType} leave`);
    } finally {
      setActionLoading(false);
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

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  if (loading) {
    return <Loader message="Loading leave details..." fullScreen={false} />;
  }

  if (error || !leave) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <div className="error-alert-box" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={20} />
            <span>{error || 'Leave request not found'}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="retry-btn" onClick={fetchLeaveDetails}>
              <RotateCw size={14} style={{ marginRight: '0.35rem' }} />
              Retry
            </button>
            <Link to="/leaves" className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              Back to Leaves
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const emp = leave.employee;

  return (
    <div className="leaves-container animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb-nav">
        <Link to="/leaves">
          <ArrowLeft size={16} />
          <span>Leaves</span>
        </Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--slate-800)', fontWeight: 600 }}>Leave #{leave._id.slice(-6).toUpperCase()}</span>
      </nav>

      {/* Main Details Card */}
      <div className="form-card" style={{ padding: '2rem' }}>
        {/* Header with Status & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid var(--slate-200)', paddingBottom: '1.5rem', marginBottom: '1.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                {leave.leaveType}
              </h1>
              <span className={`status-pill ${getStatusBadgeClass(leave.status)}`}>
                {leave.status}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '0.35rem', marginBottom: 0 }}>
              Submitted on {formatDate(leave.createdAt)} &bull; Reference ID: {leave._id}
            </p>
          </div>

          {/* Action Buttons if Pending */}
          {leave.status === 'Pending' && (isAdmin || isManager) && (
            <div style={{ display: 'inline-flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn-approve-action dept-btn-action"
                style={{ padding: '0.6rem 1rem', fontSize: '0.875rem' }}
                onClick={() => setModalType('approve')}
              >
                <Check size={16} />
                <span>Approve Request</span>
              </button>
              <button
                type="button"
                className="btn-reject-action dept-btn-action"
                style={{ padding: '0.6rem 1rem', fontSize: '0.875rem' }}
                onClick={() => setModalType('reject')}
              >
                <X size={16} />
                <span>Reject Request</span>
              </button>
            </div>
          )}
        </div>

        {/* 2-Column Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem', marginBottom: '2rem' }}>
          {/* Employee Info Box */}
          <div style={{ backgroundColor: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate-700)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={16} color="var(--primary-600)" />
              <span>Employee Information</span>
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div className="employee-avatar-circle" style={{ width: 48, height: 48, fontSize: '1rem' }}>
                {getInitials(emp?.fullName)}
              </div>
              <div>
                <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                  {emp?.fullName || 'Deleted Staff'}
                </h4>
                <span className="id-badge">{emp?.employeeId || '—'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-600)' }}>
                <span>Department:</span>
                <span style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{emp?.department || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-600)' }}>
                <span>Designation:</span>
                <span style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{emp?.designation || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-600)' }}>
                <span>Email:</span>
                <span style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{emp?.email || '—'}</span>
              </div>
            </div>

            {emp?._id && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--slate-200)', paddingTop: '0.75rem' }}>
                <Link to={`/employees/${emp._id}`} className="card-action-link" style={{ fontSize: '0.825rem' }}>
                  <span>View Full Employee Profile</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            )}
          </div>

          {/* Leave Schedule Box */}
          <div style={{ backgroundColor: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate-700)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={16} color="var(--primary-600)" />
              <span>Leave Schedule</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                <span style={{ fontSize: '0.825rem', color: 'var(--slate-500)' }}>Duration</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                  {leave.duration || 1} {leave.duration === 1 ? 'Day' : 'Days'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Start Date:</span>
                <span style={{ fontWeight: 700, color: 'var(--slate-800)' }}>{formatDate(leave.startDate)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>End Date:</span>
                <span style={{ fontWeight: 700, color: 'var(--slate-800)' }}>{formatDate(leave.endDate)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--slate-500)' }}>Leave Type:</span>
                <span style={{ fontWeight: 700, color: 'var(--slate-800)' }}>{leave.leaveType}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reason Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--slate-700)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileText size={16} color="var(--primary-600)" />
            <span>Reason for Absence</span>
          </h3>
          <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', color: 'var(--slate-800)', lineHeight: 1.6 }}>
            {leave.reason || 'No specific reason recorded.'}
          </div>
        </div>

        {/* Review Audit Section (if Reviewed or Cancelled) */}
        {leave.status !== 'Pending' && (
          <div style={{ borderTop: '1px solid var(--slate-200)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--slate-600)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {leave.status === 'Approved' ? (
                  <CheckCircle size={18} color="#059669" />
                ) : leave.status === 'Cancelled' ? (
                  <AlertCircle size={18} color="#64748b" />
                ) : (
                  <XCircle size={18} color="#dc2626" />
                )}
                <span>Decision: <strong style={{ color: 'var(--slate-900)' }}>{leave.status}</strong></span>
              </div>

              {leave.reviewedBy && (
                <div>
                  Reviewed by: <strong style={{ color: 'var(--slate-900)' }}>{leave.reviewedBy.name || 'Administrator'}</strong> ({leave.reviewedBy.role})
                </div>
              )}

              {leave.reviewedAt && (
                <div>
                  Timestamp: <span>{formatDateTime(leave.reviewedAt)}</span>
                </div>
              )}
            </div>

            {leave.reviewComment && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: leave.status === 'Approved' ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${leave.status === 'Approved' ? '#bbf7d0' : '#fecaca'}`,
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ fontWeight: 700, color: leave.status === 'Approved' ? '#166534' : '#991b1b', display: 'block', marginBottom: '0.25rem' }}>
                  Reviewer Feedback / Note:
                </span>
                <p style={{ margin: 0, color: leave.status === 'Approved' ? '#15803d' : '#b91c1c', lineHeight: 1.5 }}>
                  {leave.reviewComment}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Approve / Reject Modal Dialog */}
      {modalType && (
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
          onClick={() => {
            setModalType(null);
            setReviewComment('');
          }}
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
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: modalType === 'approve' ? '#ecfdf5' : '#fee2e2',
                  color: modalType === 'approve' ? '#059669' : '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: `1px solid ${modalType === 'approve' ? '#a7f3d0' : '#fecaca'}`,
                }}
              >
                {modalType === 'approve' ? <Check size={22} /> : <X size={22} />}
              </div>

              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 0.4rem 0' }}>
                  {modalType === 'approve' ? 'Approve this leave request?' : 'Reject this leave request?'}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', lineHeight: 1.5, margin: 0 }}>
                  {modalType === 'approve'
                    ? 'Confirming will set the leave status to Approved and deduct the duration from remaining balance.'
                    : 'Confirming will reject this leave request. Please provide a clear explanation below.'}
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
                  {emp?.fullName} &bull; {leave.duration || 1} Days ({leave.leaveType})
                </div>
              </div>
            </div>

            {/* Review Comment Textarea */}
            <div style={{ marginTop: '1.25rem' }}>
              <label
                htmlFor="leave-review-comment-input"
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--slate-700)',
                  marginBottom: '0.35rem',
                }}
              >
                {modalType === 'reject' ? 'Reason for Rejection *' : 'Reviewer Note (Optional)'}
              </label>
              <textarea
                id="leave-review-comment-input"
                rows={3}
                placeholder={
                  modalType === 'reject'
                    ? 'State the reason for rejecting this leave request (required)...'
                    : 'Add any optional feedback or coverage note for the employee...'
                }
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
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
                onClick={() => {
                  setModalType(null);
                  setReviewComment('');
                }}
                disabled={actionLoading}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActionConfirm}
                disabled={actionLoading}
                id="confirm-action-modal-btn"
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: modalType === 'approve' ? '#059669' : '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  opacity: actionLoading ? 0.7 : 1,
                }}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{modalType === 'approve' ? 'Approve Leave' : 'Reject Leave'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveDetailsPage;
