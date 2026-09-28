import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Star, AlertCircle, Save, User } from 'lucide-react';
import { performanceService } from '../services/performanceService.js';
import { employeeService } from '../services/employeeService.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/performance.css';

const RATING_LABELS = {
  1: 'Needs Improvement',
  2: 'Below Expectations',
  3: 'Meets Expectations',
  4: 'Exceeds Expectations',
  5: 'Outstanding',
};

export default function AddPerformancePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    employee: '',
    reviewPeriod: '',
    overallRating: 0,
    strengths: '',
    areasForImprovement: '',
    managerFeedback: '',
    status: 'Reviewed',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await employeeService.getEmployees({ limit: 200, status: 'Active' });
        let list = res.data || res.employees || [];
        if (user?.role === 'manager' && user.department) {
          list = list.filter((e) => {
            const deptId = e.department?._id || e.department;
            return deptId?.toString() === user.department?.toString();
          });
        }
        setEmployees(list);
      } catch {
        showToast('error', 'Failed to load employees');
      } finally {
        setLoadingEmployees(false);
      }
    })();
  }, [user]);

  const validate = () => {
    const errs = {};
    if (!form.employee) errs.employee = 'Please select an employee';
    if (!form.reviewPeriod.trim()) errs.reviewPeriod = 'Review period is required';
    if (!form.overallRating || form.overallRating < 1 || form.overallRating > 5)
      errs.overallRating = 'Please select a rating (1–5)';
    if (!form.managerFeedback.trim()) errs.managerFeedback = 'Manager feedback is required';
    return errs;
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      showToast('error', 'Please fix the validation errors');
      return;
    }

    setSubmitting(true);
    try {
      await performanceService.createPerformance(form);
      showToast('success', 'Performance review created successfully');
      navigate('/performance');
    } catch (err) {
      showToast('error', err.message || 'Failed to create performance review');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating) => {
    let stars = '';
    for (let i = 0; i < rating; i++) stars += '⭐';
    return stars;
  };

  if (loadingEmployees) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <Loader />
      </div>
    );
  }

  return (
    <div className="perf-form-page">
      {/* Back Link */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/performance" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--slate-500)', fontSize: '0.875rem', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back to Performance
        </Link>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="perf-form-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={20} color="white" />
            </div>
            <div>
              <div className="perf-form-title">New Performance Review</div>
              <div className="perf-form-subtitle">Rate and provide feedback for an employee</div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--slate-100)', margin: '1.5rem 0' }} />

          {/* Employee */}
          <div className="perf-form-group">
            <label htmlFor="perf-employee">
              <User size={13} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
              Employee <span className="required">*</span>
            </label>
            <select
              id="perf-employee"
              className={`perf-form-select ${errors.employee ? 'error' : ''}`}
              value={form.employee}
              onChange={(e) => handleChange('employee', e.target.value)}
            >
              <option value="">— Select an employee —</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName} ({emp.employeeId}) — {emp.department?.name || emp.department || 'N/A'}
                </option>
              ))}
            </select>
            {errors.employee && <div className="perf-form-error"><AlertCircle size={13} />{errors.employee}</div>}
          </div>

          {/* Review Period */}
          <div className="perf-form-group">
            <label htmlFor="perf-period">Review Period <span className="required">*</span></label>
            <input
              type="text"
              id="perf-period"
              className={`perf-form-input ${errors.reviewPeriod ? 'error' : ''}`}
              placeholder="e.g. Q3 2026, September 2026, Annual 2026"
              value={form.reviewPeriod}
              onChange={(e) => handleChange('reviewPeriod', e.target.value)}
            />
            {errors.reviewPeriod && <div className="perf-form-error"><AlertCircle size={13} />{errors.reviewPeriod}</div>}
          </div>

          {/* Rating */}
          <div className="perf-form-group">
            <label>Overall Rating <span className="required">*</span></label>
            <div className="perf-rating-section">
              <div className="perf-rating-label">Select a rating from 1 to 5</div>
              {[1, 2, 3, 4, 5].map((r) => (
                <div
                  key={r}
                  className={`star-option ${form.overallRating === r ? 'selected' : ''}`}
                  onClick={() => handleChange('overallRating', r)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleChange('overallRating', r)}
                  id={`perf-rating-${r}`}
                >
                  <span className="star-option-stars">{renderStars(r)}</span>
                  <strong>{r} / 5</strong>
                  <span className="star-option-label">— {RATING_LABELS[r]}</span>
                </div>
              ))}
            </div>
            {errors.overallRating && <div className="perf-form-error" style={{ marginTop: '0.5rem' }}><AlertCircle size={13} />{errors.overallRating}</div>}
          </div>

          {/* Strengths */}
          <div className="perf-form-group">
            <label htmlFor="perf-strengths">Strengths</label>
            <textarea
              id="perf-strengths"
              className="perf-form-textarea"
              placeholder="e.g. Excellent communication, proactive problem-solving, strong technical skills..."
              value={form.strengths}
              onChange={(e) => handleChange('strengths', e.target.value)}
            />
          </div>

          {/* Areas for Improvement */}
          <div className="perf-form-group">
            <label htmlFor="perf-improvement">Areas for Improvement</label>
            <textarea
              id="perf-improvement"
              className="perf-form-textarea"
              placeholder="e.g. Time management, documentation, meeting deadlines..."
              value={form.areasForImprovement}
              onChange={(e) => handleChange('areasForImprovement', e.target.value)}
            />
          </div>

          {/* Manager Feedback */}
          <div className="perf-form-group">
            <label htmlFor="perf-feedback">Manager Feedback <span className="required">*</span></label>
            <textarea
              id="perf-feedback"
              className={`perf-form-textarea ${errors.managerFeedback ? 'error' : ''}`}
              style={{ minHeight: '120px' }}
              placeholder="Provide constructive and specific feedback about this employee's performance during the review period..."
              value={form.managerFeedback}
              onChange={(e) => handleChange('managerFeedback', e.target.value)}
            />
            {errors.managerFeedback && <div className="perf-form-error"><AlertCircle size={13} />{errors.managerFeedback}</div>}
          </div>

          {/* Status */}
          <div className="perf-form-group">
            <label htmlFor="perf-status">Status</label>
            <select
              id="perf-status"
              className="perf-form-select"
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value)}
            >
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Reviewed">Reviewed</option>
            </select>
          </div>

          {/* Actions */}
          <div className="perf-form-actions">
            <Link to="/performance" className="btn btn-outline">Cancel</Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              id="perf-submit-btn"
            >
              {submitting ? <Loader size="sm" /> : <Save size={16} />}
              {submitting ? 'Saving...' : 'Save Review'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
