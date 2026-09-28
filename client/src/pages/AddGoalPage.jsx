import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Target, AlertCircle, Save, User, Calendar } from 'lucide-react';
import { goalService } from '../services/goalService.js';
import { employeeService } from '../services/employeeService.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/performance.css';

export default function AddGoalPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    employee: '',
    title: '',
    description: '',
    startDate: '',
    dueDate: '',
    priority: 'Medium',
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
    if (!form.title.trim()) errs.title = 'Goal title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.startDate) errs.startDate = 'Start date is required';
    if (!form.dueDate) errs.dueDate = 'Due date is required';
    if (form.startDate && form.dueDate && new Date(form.dueDate) < new Date(form.startDate)) {
      errs.dueDate = 'Due date cannot be before start date';
    }
    if (!form.priority) errs.priority = 'Priority is required';
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
      await goalService.createGoal(form);
      showToast('success', 'Goal assigned successfully');
      navigate('/performance/goals');
    } catch (err) {
      showToast('error', err.message || 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
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
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/performance/goals" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--slate-500)', fontSize: '0.875rem', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back to Goals
        </Link>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="perf-form-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={20} color="white" />
            </div>
            <div>
              <div className="perf-form-title">Assign New Goal</div>
              <div className="perf-form-subtitle">Set a performance objective for an employee</div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--slate-100)', margin: '1.5rem 0' }} />

          {/* Employee */}
          <div className="perf-form-group">
            <label htmlFor="goal-employee">
              <User size={13} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
              Employee <span className="required">*</span>
            </label>
            <select
              id="goal-employee"
              className={`perf-form-select ${errors.employee ? 'error' : ''}`}
              value={form.employee}
              onChange={(e) => handleChange('employee', e.target.value)}
            >
              <option value="">— Select an employee —</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName} ({emp.employeeId})
                </option>
              ))}
            </select>
            {errors.employee && <div className="perf-form-error"><AlertCircle size={13} />{errors.employee}</div>}
          </div>

          {/* Title */}
          <div className="perf-form-group">
            <label htmlFor="goal-title">Goal Title <span className="required">*</span></label>
            <input
              type="text"
              id="goal-title"
              className={`perf-form-input ${errors.title ? 'error' : ''}`}
              placeholder="e.g. Improve customer satisfaction score to 90%"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              maxLength={200}
            />
            {errors.title && <div className="perf-form-error"><AlertCircle size={13} />{errors.title}</div>}
          </div>

          {/* Description */}
          <div className="perf-form-group">
            <label htmlFor="goal-description">Description <span className="required">*</span></label>
            <textarea
              id="goal-description"
              className={`perf-form-textarea ${errors.description ? 'error' : ''}`}
              placeholder="Describe the goal in detail, including expected outcomes and success criteria..."
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
            {errors.description && <div className="perf-form-error"><AlertCircle size={13} />{errors.description}</div>}
          </div>

          {/* Dates */}
          <div className="perf-form-grid">
            <div className="perf-form-group">
              <label htmlFor="goal-start">
                <Calendar size={13} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
                Start Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="goal-start"
                className={`perf-form-input ${errors.startDate ? 'error' : ''}`}
                value={form.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
              {errors.startDate && <div className="perf-form-error"><AlertCircle size={13} />{errors.startDate}</div>}
            </div>
            <div className="perf-form-group">
              <label htmlFor="goal-due">
                <Calendar size={13} style={{ display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
                Due Date <span className="required">*</span>
              </label>
              <input
                type="date"
                id="goal-due"
                className={`perf-form-input ${errors.dueDate ? 'error' : ''}`}
                value={form.dueDate}
                min={form.startDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
              />
              {errors.dueDate && <div className="perf-form-error"><AlertCircle size={13} />{errors.dueDate}</div>}
            </div>
          </div>

          {/* Priority */}
          <div className="perf-form-group">
            <label htmlFor="goal-priority">Priority <span className="required">*</span></label>
            <select
              id="goal-priority"
              className={`perf-form-select ${errors.priority ? 'error' : ''}`}
              value={form.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
            >
              <option value="Low">🟢 Low</option>
              <option value="Medium">🟡 Medium</option>
              <option value="High">🔴 High</option>
            </select>
            {errors.priority && <div className="perf-form-error"><AlertCircle size={13} />{errors.priority}</div>}
          </div>

          {/* Actions */}
          <div className="perf-form-actions">
            <Link to="/performance/goals" className="btn btn-outline">Cancel</Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              id="goal-submit-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {submitting ? <Loader size="sm" /> : <Save size={16} />}
              {submitting ? 'Saving...' : 'Assign Goal'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
