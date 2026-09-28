import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  ArrowLeft,
  Save,
  AlertCircle,
  Calendar,
  Clock,
  Building2,
  User,
  Flag,
  FileText,
} from 'lucide-react';
import { taskService } from '../services/taskService.js';
import { employeeService } from '../services/employeeService.js';
import { departmentService } from '../services/departmentService.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/tasks.css';

export const AddTaskPage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Form Fields
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    department: '',
    priority: 'Medium',
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    estimatedHours: 8,
  });

  const [errors, setErrors] = useState({});

  // Load real employees and departments
  useEffect(() => {
    const loadResources = async () => {
      try {
        const [empRes, deptRes] = await Promise.all([
          employeeService.getEmployees({ limit: 200 }),
          departmentService.getDepartments({ limit: 100 }),
        ]);

        const allEmployees = empRes.success ? empRes.employees || [] : [];
        const allDepartments = deptRes.success ? deptRes.departments || [] : [];

        let filteredEmps = allEmployees;
        if (user?.role === 'manager') {
          const mgrId = user.id || user._id;
          const userDept = (user.department || '').toLowerCase();
          const isRahul = user.email === 'rahul.menon@staffpulse.local' || user.username === 'rahul.menon' || userDept === 'engineering';
          const isAnjali = user.email === 'anjali.nair@staffpulse.local' || user.username === 'anjali.nair' || userDept === 'hr';

          filteredEmps = allEmployees.filter((e) => {
            if (e.manager && String(e.manager) === String(mgrId)) return true;
            const empDept = (e.department || '').toLowerCase();
            if (isRahul && ['engineering', 'design'].includes(empDept)) return true;
            if (isAnjali && ['hr', 'sales', 'marketing', 'finance'].includes(empDept)) return true;
            return empDept === userDept;
          });
        }

        setEmployees(filteredEmps);
        setDepartments(allDepartments);

        // Pre-fill department for manager
        if (user?.role === 'manager') {
          const mgrDept = (user.department || 'Engineering').toLowerCase();
          const matchedDept = allDepartments.find((d) => d.name.toLowerCase() === mgrDept);
          if (matchedDept) {
            setFormData((prev) => ({ ...prev, department: matchedDept._id }));
          }
        }
      } catch (err) {
        showError('Failed to load employee and department lists');
      } finally {
        setLoadingData(false);
      }
    };
    loadResources();
  }, [showError, user]);

  // When an employee is chosen, automatically set department if employee has one
  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    setFormData((prev) => {
      const selected = employees.find((emp) => emp._id === empId);
      let matchedDeptId = prev.department;
      if (selected && selected.department && departments.length > 0) {
        const found = departments.find(
          (d) => d.name.toLowerCase() === selected.department.toLowerCase()
        );
        if (found) matchedDeptId = found._id;
      }
      return {
        ...prev,
        assignedTo: empId,
        department: matchedDeptId,
      };
    });
    if (errors.assignedTo) {
      setErrors((prev) => ({ ...prev, assignedTo: null }));
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = 'Task title is required';
    if (!formData.description.trim()) errs.description = 'Task description is required';
    if (!formData.assignedTo) errs.assignedTo = 'Please assign an employee';
    if (!formData.department) errs.department = 'Please select a department';
    if (!formData.startDate) errs.startDate = 'Start date is required';
    if (!formData.dueDate) errs.dueDate = 'Due date is required';

    if (formData.startDate && formData.dueDate) {
      const start = new Date(formData.startDate);
      const due = new Date(formData.dueDate);
      if (due < start) {
        errs.dueDate = 'Due date cannot be earlier than the start date';
      }
    }

    if (formData.estimatedHours < 0) {
      errs.estimatedHours = 'Estimated hours cannot be negative';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const res = await taskService.createTask(formData);
      if (res.success) {
        showSuccess('Task created and assigned successfully!');
        navigate('/tasks');
      } else {
        showError(res.message || 'Failed to create task');
      }
    } catch (err) {
      showError(err.message || 'Error occurred while creating task');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return <Loader message="Loading task setup details..." />;
  }

  return (
    <div className="task-page animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Breadcrumb Navigation */}
      <div className="task-breadcrumb">
        <Link to="/tasks" className="breadcrumb-link">
          Tasks
        </Link>
        <span>/</span>
        <span>Create New Task</span>
      </div>

      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckSquare size={26} color="var(--primary-600)" />
            <span>Create New Task</span>
          </h1>
          <p className="dashboard-subtitle">
            Assign work deliverables, target deadlines, and priorities to team members.
          </p>
        </div>

        <div>
          <Link
            to="/tasks"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={16} />
            <span>Cancel</span>
          </Link>
        </div>
      </div>

      {/* Form Container */}
      <div
        style={{
          maxWidth: '840px',
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--slate-200)',
          boxShadow: 'var(--shadow-sm)',
          padding: '2rem',
        }}
      >
        <form onSubmit={handleSubmit}>
          {/* Section: Basic Information */}
          <div style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--slate-800)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--slate-100)',
              }}
            >
              <FileText size={18} color="var(--primary-600)" />
              <span>Task Details</span>
            </h2>

            {/* Task Title */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--slate-700)',
                  marginBottom: '0.4rem',
                }}
              >
                Task Title <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Implement User Authentication & Role System"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (errors.title) setErrors({ ...errors, title: null });
                }}
                className="task-search-input"
                style={{ padding: '0.75rem 1rem' }}
              />
              {errors.title && (
                <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={13} />
                  <span>{errors.title}</span>
                </div>
              )}
            </div>

            {/* Task Description */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--slate-700)',
                  marginBottom: '0.4rem',
                }}
              >
                Detailed Description <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={5}
                placeholder="Provide complete instructions, acceptance criteria, and expected deliverables..."
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (errors.description) setErrors({ ...errors, description: null });
                }}
                className="task-search-input"
                style={{
                  padding: '0.75rem 1rem',
                  resize: 'vertical',
                  lineHeight: '1.5',
                }}
              />
              {errors.description && (
                <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={13} />
                  <span>{errors.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Assignment & Department */}
          <div style={{ marginBottom: '2rem' }}>
            <h2
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--slate-800)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--slate-100)',
              }}
            >
              <User size={18} color="var(--primary-600)" />
              <span>Assignment</span>
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {/* Assign Employee */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--slate-700)',
                    marginBottom: '0.4rem',
                  }}
                >
                  Assign Employee <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={formData.assignedTo}
                  onChange={handleEmployeeChange}
                  className="task-select"
                  style={{ width: '100%', padding: '0.75rem 2rem 0.75rem 1rem' }}
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.employeeId} - {emp.department})
                    </option>
                  ))}
                </select>
                {errors.assignedTo && (
                  <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={13} />
                    <span>{errors.assignedTo}</span>
                  </div>
                )}
              </div>

              {/* Department */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--slate-700)',
                    marginBottom: '0.4rem',
                  }}
                >
                  Department <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={formData.department}
                  disabled={user?.role === 'manager'}
                  onChange={(e) => {
                    setFormData({ ...formData, department: e.target.value });
                    if (errors.department) setErrors({ ...errors, department: null });
                  }}
                  className="task-select"
                  style={{ width: '100%', padding: '0.75rem 2rem 0.75rem 1rem', ...(user?.role === 'manager' ? { opacity: 0.85, cursor: 'not-allowed', backgroundColor: '#f8fafc' } : {}) }}
                >
                  <option value="">Select Department...</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={13} />
                    <span>{errors.department}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Deadlines, Priority & Estimation */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h2
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--slate-800)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--slate-100)',
              }}
            >
              <Flag size={18} color="var(--primary-600)" />
              <span>Timeline & Priority</span>
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              {/* Priority */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--slate-700)',
                    marginBottom: '0.4rem',
                  }}
                >
                  Priority <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="task-select"
                  style={{ width: '100%', padding: '0.75rem 2rem 0.75rem 1rem' }}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--slate-700)',
                    marginBottom: '0.4rem',
                  }}
                >
                  Start Date <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    setFormData({ ...formData, startDate: e.target.value });
                    if (errors.startDate) setErrors({ ...errors, startDate: null });
                  }}
                  className="task-search-input"
                  style={{ padding: '0.75rem 1rem' }}
                />
                {errors.startDate && (
                  <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={13} />
                    <span>{errors.startDate}</span>
                  </div>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--slate-700)',
                    marginBottom: '0.4rem',
                  }}
                >
                  Due Date <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => {
                    setFormData({ ...formData, dueDate: e.target.value });
                    if (errors.dueDate) setErrors({ ...errors, dueDate: null });
                  }}
                  className="task-search-input"
                  style={{ padding: '0.75rem 1rem' }}
                />
                {errors.dueDate && (
                  <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={13} />
                    <span>{errors.dueDate}</span>
                  </div>
                )}
              </div>

              {/* Estimated Hours */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--slate-700)',
                    marginBottom: '0.4rem',
                  }}
                >
                  Estimated Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.estimatedHours}
                  onChange={(e) => {
                    setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) || 0 });
                    if (errors.estimatedHours) setErrors({ ...errors, estimatedHours: null });
                  }}
                  className="task-search-input"
                  style={{ padding: '0.75rem 1rem' }}
                />
                {errors.estimatedHours && (
                  <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={13} />
                    <span>{errors.estimatedHours}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--slate-200)',
            }}
          >
            <Link to="/tasks" className="btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              id="submit-task-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.75rem',
              }}
            >
              <Save size={18} />
              <span>{submitting ? 'Assigning Task...' : 'Assign Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTaskPage;
