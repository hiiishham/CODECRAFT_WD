import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CalendarRange,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  User,
  MessageSquare,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import leaveService from '../services/leaveService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/leaves.css';
import '../styles/tasks.css';

export const EmployeeLeaveDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [leave, setLeave] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    const fetchLeave = async () => {
      setLoading(true);
      try {
        const res = await leaveService.getLeaveById(id);
        if (res.success && res.leave) {
          setLeave(res.leave);
        } else {
          showError(res.message || 'Leave request not found');
        }
      } catch (err) {
        console.error('Error fetching leave details:', err);
        showError(err.message || 'Error loading leave request');
      } finally {
        setLoading(false);
      }
    };
    fetchLeave();
  }, [id, showError]);

  const handleCancelLeave = async () => {
    setCancelling(true);
    try {
      const res = await leaveService.cancelLeave(id);
      if (res.success && res.leave) {
        setLeave(res.leave);
        showSuccess('Leave request cancelled successfully');
        setShowCancelModal(false);
      } else {
        showError(res.message || 'Failed to cancel leave request');
      }
    } catch (err) {
      showError(err.message || 'Error cancelling leave request');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <Loader message="Loading leave details..." />;
  }

  if (!leave) {
    return (
      <div className="leaves-container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <CalendarRange size={48} color="var(--slate-400)" style={{ margin: '0 auto 1rem' }} />
        <h2>Leave Request Not Found</h2>
        <p style={{ color: 'var(--slate-500)', marginBottom: '1.5rem' }}>
          This leave request does not exist or you do not have permission to view it.
        </p>
        <Link to="/employee/leave" className="btn-primary">
          Back to My Leave
        </Link>
      </div>
    );
  }

  const isPending = leave.status === 'Pending';
  const isApproved = leave.status === 'Approved';
  const isRejected = leave.status === 'Rejected';
  const isCancelled = leave.status === 'Cancelled';

  return (
    <div className="leaves-container animate-fade-in" style={{ paddingBottom: '3rem', maxWidth: '860px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div className="task-breadcrumb" style={{ marginBottom: '1.25rem' }}>
        <Link to="/employee/leave" className="breadcrumb-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <ArrowLeft size={16} />
          <span>My Leave</span>
        </Link>
        <span>/</span>
        <span>{leave.leaveType} Request</span>
      </div>

      {/* Main Container */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--slate-200)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
        }}
      >
        {/* Top Header Banner */}
        <div
          style={{
            padding: '1.75rem 2rem',
            borderBottom: '1px solid var(--slate-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
                {leave.leaveType}
              </h1>
              <span className="duration-badge" style={{ fontSize: '0.825rem' }}>
                {leave.duration || 1} {leave.duration === 1 ? 'Day' : 'Days'}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', margin: 0 }}>
              Submitted on {formatDateTime(leave.createdAt)}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Status Pill */}
            {isApproved && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#d1fae5',
                  color: '#065f46',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid #a7f3d0',
                }}
              >
                <CheckCircle size={15} />
                Approved
              </span>
            )}
            {isRejected && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid #fecaca',
                }}
              >
                <XCircle size={15} />
                Rejected
              </span>
            )}
            {isCancelled && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--slate-100)',
                  color: 'var(--slate-600)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid var(--slate-300)',
                }}
              >
                <Ban size={15} />
                Cancelled
              </span>
            )}
            {isPending && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid #fde68a',
                }}
              >
                <Clock size={15} />
                Pending Review
              </span>
            )}

            {/* Cancel Button if Pending */}
            {isPending && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="btn-secondary"
                id="cancel-leave-btn"
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                  backgroundColor: '#fff5f5',
                }}
              >
                Cancel Request
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '2rem' }}>
          {/* Review Feedback Alert Banner */}
          {isRejected && (
            <div
              style={{
                padding: '1.25rem 1.5rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderLeft: '4px solid #dc2626',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '1.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                <AlertCircle size={18} />
                <span>Reviewer Rejection Feedback</span>
              </div>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                "{leave.reviewComment || 'No specific comment provided.'}"
              </p>
              <div style={{ fontSize: '0.75rem', color: '#b91c1c' }}>
                Reviewed by <strong>{leave.reviewedBy?.name || 'Supervisor'}</strong> on {formatDateTime(leave.reviewedAt)}
              </div>
            </div>
          )}

          {isApproved && (
            <div
              style={{
                padding: '1.25rem 1.5rem',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderLeft: '4px solid #16a34a',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '1.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                <CheckCircle size={18} />
                <span>Leave Approved</span>
              </div>
              {leave.reviewComment && (
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: '#14532d', lineHeight: 1.5 }}>
                  "{leave.reviewComment}"
                </p>
              )}
              <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                Approved by <strong>{leave.reviewedBy?.name || 'Supervisor'}</strong> on {formatDateTime(leave.reviewedAt)}
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                Start Date
              </span>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--slate-900)' }}>
                {formatDate(leave.startDate)}
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                End Date
              </span>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--slate-900)' }}>
                {formatDate(leave.endDate)}
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--slate-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                Total Duration
              </span>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary-600)' }}>
                {leave.duration || 1} {leave.duration === 1 ? 'Working / Calendar Day' : 'Working / Calendar Days'}
              </div>
            </div>
          </div>

          {/* Reason Section */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--slate-800)', margin: '0 0 0.65rem' }}>
              Reason for Request
            </h3>
            <div
              style={{
                padding: '1.25rem',
                backgroundColor: 'var(--slate-50)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--slate-200)',
                fontSize: '0.9rem',
                color: 'var(--slate-700)',
                lineHeight: 1.6,
                whiteSpace: 'pre-line',
              }}
            >
              {leave.reason}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
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
              Are you sure you want to cancel this leave request? This will change the status to Cancelled.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="btn-secondary"
                style={{ padding: '0.55rem 1.15rem' }}
              >
                No, Keep
              </button>
              <button
                type="button"
                onClick={handleCancelLeave}
                disabled={cancelling}
                className="btn-primary"
                id="modal-confirm-cancel-btn"
                style={{
                  padding: '0.55rem 1.15rem',
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {cancelling ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLeaveDetailsPage;
