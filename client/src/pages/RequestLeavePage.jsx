import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CalendarRange,
  ArrowLeft,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
  FileText,
  Info,
} from 'lucide-react';
import leaveService from '../services/leaveService.js';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/leaves.css';
import '../styles/tasks.css';

const LEAVE_TYPES = [
  { label: 'Annual Leave (20 days/yr)', value: 'Annual Leave', key: 'annual' },
  { label: 'Sick Leave (10 days/yr)', value: 'Sick Leave', key: 'sick' },
  { label: 'Casual Leave (7 days/yr)', value: 'Casual Leave', key: 'casual' },
  { label: 'Emergency Leave (5 days/yr)', value: 'Emergency Leave', key: 'emergency' },
  { label: 'Other', value: 'Other', key: null },
];

export const RequestLeavePage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [balance, setBalance] = useState(null);

  const getLocalTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getLocalTodayStr();

  const [formData, setFormData] = useState({
    leaveType: 'Annual Leave',
    startDate: todayStr,
    endDate: todayStr,
    reason: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchBalance = async () => {
      setLoadingBalance(true);
      try {
        const res = await leaveService.getMyLeaveBalance();
        if (res.success && res.balance) {
          setBalance(res.balance);
        }
      } catch (err) {
        console.error('Error fetching balance:', err);
      } finally {
        setLoadingBalance(false);
      }
    };
    fetchBalance();
  }, []);

  // Calculate inclusive calendar days duration
  const calculateDuration = (startStr, endStr) => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    const diffTime = Math.abs(end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const currentDuration = calculateDuration(formData.startDate, formData.endDate);

  // Get remaining balance for currently selected leave type
  const selectedTypeConfig = LEAVE_TYPES.find((t) => t.value === formData.leaveType);
  const remainingForSelected =
    balance && selectedTypeConfig?.key ? balance[selectedTypeConfig.key]?.remaining : null;

  const validate = () => {
    const newErrors = {};

    if (!formData.leaveType) {
      newErrors.leaveType = 'Please select a leave type.';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required.';
    } else {
      const start = new Date(formData.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (start < today) {
        newErrors.startDate = 'Start date cannot be in the past.';
      }
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required.';
    } else if (formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = 'End date cannot be earlier than start date.';
    }

    if (currentDuration <= 0) {
      newErrors.endDate = 'Invalid date range selected.';
    }

    // Remaining balance check
    if (remainingForSelected !== null && currentDuration > remainingForSelected) {
      newErrors.balance = `You have only ${remainingForSelected} day(s) remaining for ${formData.leaveType}, but requested ${currentDuration} day(s).`;
    }

    if (!formData.reason || !formData.reason.trim()) {
      newErrors.reason = 'Please provide a reason for your leave request.';
    } else if (formData.reason.trim().length < 5) {
      newErrors.reason = 'Reason must be at least 5 characters long.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await leaveService.createLeave({
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason.trim(),
      });

      if (res.success) {
        showSuccess('Leave request submitted successfully for review!');
        navigate('/employee/leave');
      } else {
        showError(res.message || 'Failed to submit leave request');
      }
    } catch (err) {
      console.error('Leave submission error:', err);
      showError(err.message || 'Error submitting leave request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="leaves-container animate-fade-in" style={{ paddingBottom: '3rem', maxWidth: '800px', margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <div className="task-breadcrumb" style={{ marginBottom: '1.25rem' }}>
        <Link to="/employee/leave" className="breadcrumb-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <ArrowLeft size={16} />
          <span>Back to My Leave</span>
        </Link>
        <span>/</span>
        <span>Request Leave</span>
      </div>

      <div
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--slate-200)',
          boxShadow: 'var(--shadow-sm)',
          padding: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--slate-100)', paddingBottom: '1.25rem' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--primary-50)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CalendarRange size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
              Request Leave
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', margin: '0.15rem 0 0' }}>
              Submit a formal time-off application for supervisor evaluation.
            </p>
          </div>
        </div>

        {/* Live Balance Status Callout */}
        {balance && remainingForSelected !== null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.85rem 1.25rem',
              backgroundColor: remainingForSelected > 0 ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${remainingForSelected > 0 ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: remainingForSelected > 0 ? '#166534' : '#991b1b', fontSize: '0.875rem', fontWeight: 600 }}>
              <Info size={18} />
              <span>Available {formData.leaveType} Balance:</span>
            </div>
            <strong style={{ fontSize: '1.05rem', color: remainingForSelected > 0 ? '#15803d' : '#dc2626' }}>
              {remainingForSelected} Day(s) Left
            </strong>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 1. Leave Type Selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
              Leave Type <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={formData.leaveType}
              onChange={(e) => {
                setFormData({ ...formData, leaveType: e.target.value });
                if (errors.leaveType || errors.balance) setErrors({ ...errors, leaveType: null, balance: null });
              }}
              className="task-select"
              id="leave-type-select"
              style={{ width: '100%', padding: '0.75rem 1rem' }}
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {errors.leaveType && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                {errors.leaveType}
              </p>
            )}
          </div>

          {/* 2. Date Range Pickers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            {/* Start Date */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
                <Calendar size={15} />
                <span>Start Date</span>
                <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="date"
                min={todayStr}
                value={formData.startDate}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setFormData({
                    ...formData,
                    startDate: newStart,
                    endDate: formData.endDate < newStart ? newStart : formData.endDate,
                  });
                  if (errors.startDate || errors.endDate || errors.balance) {
                    setErrors({ ...errors, startDate: null, endDate: null, balance: null });
                  }
                }}
                className="task-search-input"
                id="leave-start-date"
                style={{ padding: '0.75rem 1rem' }}
              />
              {errors.startDate && (
                <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                  {errors.startDate}
                </p>
              )}
            </div>

            {/* End Date */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
                <Calendar size={15} />
                <span>End Date</span>
                <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="date"
                min={formData.startDate || todayStr}
                value={formData.endDate}
                onChange={(e) => {
                  setFormData({ ...formData, endDate: e.target.value });
                  if (errors.endDate || errors.balance) {
                    setErrors({ ...errors, endDate: null, balance: null });
                  }
                }}
                className="task-search-input"
                id="leave-end-date"
                style={{ padding: '0.75rem 1rem' }}
              />
              {errors.endDate && (
                <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>

          {/* 3. Duration Live Calculation Banner */}
          <div
            className="duration-calc-banner"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--primary-50)',
              border: '1px solid var(--primary-200)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.9rem', color: 'var(--primary-900)' }}>
              <Clock size={18} color="var(--primary-600)" />
              <span>Calculated Leave Duration:</span>
            </div>
            <span
              id="duration-display"
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--primary-700)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {currentDuration} {currentDuration === 1 ? 'Day' : 'Days'}
            </span>
          </div>

          {errors.balance && (
            <div
              style={{
                padding: '0.85rem 1rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                color: '#dc2626',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={18} />
              <span>{errors.balance}</span>
            </div>
          )}

          {/* 4. Reason Textarea */}
          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '0.4rem' }}>
              <FileText size={15} />
              <span>Reason for Leave</span>
              <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              rows={4}
              placeholder="State the reason for your time-off request in detail..."
              value={formData.reason}
              onChange={(e) => {
                setFormData({ ...formData, reason: e.target.value });
                if (errors.reason) setErrors({ ...errors, reason: null });
              }}
              className="task-search-input"
              id="leave-reason-input"
              style={{ padding: '0.85rem', resize: 'vertical' }}
            />
            {errors.reason && (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                {errors.reason}
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--slate-100)', paddingTop: '1.5rem' }}>
            <Link
              to="/employee/leave"
              className="btn-secondary"
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.875rem' }}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || loadingBalance}
              className="btn-primary"
              id="submit-leave-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.5rem',
                fontSize: '0.875rem',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Leave Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestLeavePage;
