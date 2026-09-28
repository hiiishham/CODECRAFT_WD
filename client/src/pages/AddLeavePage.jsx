import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Loader2, CalendarRange, AlertCircle, Clock } from 'lucide-react';
import leaveService from '../services/leaveService.js';
import employeeService from '../services/employeeService.js';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/leaves.css';
import '../styles/employees.css';

const LEAVE_TYPES = [
  'Casual Leave',
  'Sick Leave',
  'Annual Leave',
  'Emergency Leave',
  'Other',
];

export const AddLeavePage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const getLocalTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const today = getLocalTodayStr();
  const [formData, setFormData] = useState({
    employee: '',
    leaveType: 'Casual Leave',
    startDate: today,
    endDate: today,
    reason: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Load employees list on mount
  useEffect(() => {
    const fetchEmployeesList = async () => {
      setLoadingEmployees(true);
      try {
        const res = await employeeService.getEmployees({ limit: 150 });
        if (res.success && res.employees) {
          setEmployees(res.employees);
          if (res.employees.length > 0) {
            setFormData((prev) => ({
              ...prev,
              employee: prev.employee || res.employees[0]._id,
            }));
          }
        }
      } catch (err) {
        console.error('[AddLeave] Failed to load employees:', err.message);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployeesList();
  }, []);

  // Calculate duration in days (inclusive)
  const calculateDuration = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return 0;
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const durationDays = calculateDuration();

  const validateForm = () => {
    const errs = {};

    if (!formData.employee) {
      errs.employee = 'Employee selection is required';
    }

    if (!formData.leaveType) {
      errs.leaveType = 'Leave type is required';
    }

    if (!formData.startDate) {
      errs.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      errs.endDate = 'End date is required';
    } else if (formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      errs.endDate = 'End date cannot be before start date';
    }

    if (!formData.reason.trim()) {
      errs.reason = 'Reason for leave is required';
    } else if (formData.reason.trim().length > 500) {
      errs.reason = 'Reason cannot exceed 500 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setServerError('');

    try {
      const payload = {
        employee: formData.employee,
        leaveType: formData.leaveType,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason.trim(),
      };

      const response = await leaveService.createLeave(payload);

      if (response.success) {
        showSuccess('Leave request submitted successfully');
        navigate('/leaves');
      } else {
        throw new Error(response.message || 'Failed to submit leave request');
      }
    } catch (err) {
      console.error('[Create Leave Error]:', err.message);
      setServerError(err.message || 'Failed to create leave request. Please check details.');
      showError(err.message || 'Failed to submit leave');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '720px', margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb-nav">
        <Link to="/leaves">
          <ArrowLeft size={16} />
          <span>Leaves</span>
        </Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--slate-800)', fontWeight: 600 }}>Apply Leave</span>
      </nav>

      <div className="form-card">
        <header style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CalendarRange size={20} />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
              Apply Leave Request
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', margin: 0 }}>
            Submit an employee time-off request for review and administrative approval.
          </p>
        </header>

        {serverError && (
          <div className="form-alert" role="alert" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={18} />
            <span>{serverError}</span>
          </div>
        )}

        {/* Live Duration Calculator Display */}
        {durationDays > 0 && (
          <div className="duration-calc-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="var(--primary-600)" />
              <span>Calculated Leave Period:</span>
            </div>
            <span className="duration-calc-days">
              {durationDays} {durationDays === 1 ? 'Day' : 'Days'}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Employee Dropdown */}
            <div className="form-group">
              <label className="form-label" htmlFor="leave-employee-select">
                Select Employee <span className="field-required">*</span>
              </label>
              <select
                id="leave-employee-select"
                name="employee"
                className="filter-select"
                style={{ width: '100%', height: '42px' }}
                value={formData.employee}
                onChange={handleChange}
                disabled={isSubmitting || loadingEmployees}
              >
                {loadingEmployees ? (
                  <option value="">Loading employees directory...</option>
                ) : employees.length > 0 ? (
                  employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.employeeId}) &mdash; {emp.department}
                    </option>
                  ))
                ) : (
                  <option value="">No employees available</option>
                )}
              </select>
              {errors.employee && <span className="field-error">{errors.employee}</span>}
            </div>

            {/* Leave Type */}
            <div className="form-group">
              <label className="form-label" htmlFor="leave-type-select">
                Leave Type <span className="field-required">*</span>
              </label>
              <select
                id="leave-type-select"
                name="leaveType"
                className="filter-select"
                style={{ width: '100%', height: '42px' }}
                value={formData.leaveType}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errors.leaveType && <span className="field-error">{errors.leaveType}</span>}
            </div>

            {/* Dates Grid (Start & End Date) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {/* Start Date */}
              <div className="form-group">
                <label className="form-label" htmlFor="leave-start-date">
                  Start Date <span className="field-required">*</span>
                </label>
                <input
                  type="date"
                  id="leave-start-date"
                  name="startDate"
                  className={`form-input ${errors.startDate ? 'has-error' : ''}`}
                  value={formData.startDate}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {errors.startDate && <span className="field-error">{errors.startDate}</span>}
              </div>

              {/* End Date */}
              <div className="form-group">
                <label className="form-label" htmlFor="leave-end-date">
                  End Date <span className="field-required">*</span>
                </label>
                <input
                  type="date"
                  id="leave-end-date"
                  name="endDate"
                  min={formData.startDate}
                  className={`form-input ${errors.endDate ? 'has-error' : ''}`}
                  value={formData.endDate}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                {errors.endDate && <span className="field-error">{errors.endDate}</span>}
              </div>
            </div>

            {/* Reason */}
            <div className="form-group">
              <label className="form-label" htmlFor="leave-reason-input">
                Reason for Leave <span className="field-required">*</span>
              </label>
              <textarea
                id="leave-reason-input"
                name="reason"
                rows={4}
                className={`form-input ${errors.reason ? 'has-error' : ''}`}
                style={{
                  paddingLeft: '0.9rem',
                  paddingTop: '0.75rem',
                  minHeight: '100px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
                placeholder="State the reason for taking leave (e.g. Annual vacation with family, medical recovery)..."
                value={formData.reason}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.reason ? (
                <span className="field-error">{errors.reason}</span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.25rem' }}>
                  Maximum 500 characters.
                </span>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions" style={{ marginTop: '2rem' }}>
            <Link to="/leaves" className="btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              id="submit-leave-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <CalendarRange size={16} />
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

export default AddLeavePage;
