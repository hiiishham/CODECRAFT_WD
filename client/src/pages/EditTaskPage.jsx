import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  ArrowLeft,
  Save,
  AlertCircle,
  FileText,
  User,
  Flag,
} from 'lucide-react';
import { taskService } from '../services/taskService.js';
import { employeeService } from '../services/employeeService.js';
import { departmentService } from '../services/departmentService.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/tasks.css';

export const EditTaskPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    department: '',
    priority: 'Medium',
    status: 'Assigned',
    startDate: '',
    dueDate: '',
    estimatedHours: 0,
    progress: 0,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const loadTaskAndResources = async () => {
      setLoading(true);
      try {
        const [taskRes, empRes, deptRes] = await Promise.all([
          taskService.getTaskById(id),
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

        if (taskRes.success && taskRes.task) {
          const t = taskRes.task;
          setFormData({
            title: t.title || '',
            description: t.description || '',
            assignedTo: t.assignedTo?._id || t.assignedTo || '',
            department: t.department?._id || t.department || '',
            priority: t.priority || 'Medium',
            status: t.status || 'Assigned',
            startDate: t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : '',
            dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : '',
            estimatedHours: t.estimatedHours || 0,
            progress: t.progress || 0,
          });
        } else {
          showError(taskRes.message || 'Task not found');
        }
      } catch (err) {
        showError(err.message || 'Failed to load task for editing');
      } finally {
        setLoading(false);
      }
    };
    loadTaskAndResources();
  }, [id, showError]);

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = 'Title is required';
    if (!formData.description.trim()) errs.description = 'Description is required';
    if (!formData.assignedTo) errs.assignedTo = 'Assigned employee is required';
    if (!formData.department) errs.department = 'Department is required';
    if (!formData.startDate) errs.startDate = 'Start date is required';
    if (!formData.dueDate) errs.dueDate = 'Due date is required';

    if (formData.startDate && formData.dueDate) {
      if (new Date(formData.dueDate) < new Date(formData.startDate)) {
        errs.dueDate = 'Due date cannot be earlier than start date';
      }
    }

    if (formData.estimatedHours < 0) {
      errs.estimatedHours = 'Estimated hours cannot be negative';
    }

    if (formData.progress < 0 || formData.progress > 100) {
      errs.progress = 'Progress must be between 0 and 100';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const res = await taskService.updateTask(id, formData);
      if (res.success) {
        showSuccess('Task updated successfully!');
        navigate(`/tasks/${id}`);
      } else {
        showError(res.message || 'Failed to update task');
      }
    } catch (err) {
      showError(err.message || 'Error occurred while saving task');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader message="Loading task details for editing..." />;
  }

  return (
    <div className="task-page animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Breadcrumb Navigation */}
      <div className="task-breadcrumb">
        <Link to="/tasks" className="breadcrumb-link">
          Tasks
        </Link>
        <span>/</span>
        <Link to={`/tasks/${id}`} className="breadcrumb-link">
          {formData.title || 'Details'}
        </Link>
        <span>/</span>
        <span>Edit</span>
      </div>

      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckSquare size={26} color="var(--primary-600)" />
            <span>Edit Task</span>
          </h1>
          <p className="dashboard-subtitle">
            Update deadlines, priorities, assignees, or overall deliverable status.
          </p>
        </div>

        <div>
          <Link
            to={`/tasks/${id}`}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={16} />
            <span>Cancel</span>
          </Link>
        </div>
      </div>

      {/* Form Card */}
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
          {/* Section: Task Title & Description */}
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

            {/* Description */}
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
                Task Description <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={5}
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  if (errors.description) setErrors({ ...errors, description: null });
                }}
                className="task-search-input"
                style={{ padding: '0.75rem 1rem', resize: 'vertical', lineHeight: '1.5' }}
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
                  Assigned Employee <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => {
                    const empId = e.target.value;
                    const selected = employees.find((emp) => emp._id === empId);
                    let matchedDeptId = formData.department;
                    if (selected && selected.department && departments.length > 0) {
                      const found = departments.find(
                        (d) => d.name.toLowerCase() === selected.department.toLowerCase()
                      );
                      if (found) matchedDeptId = found._id;
                    }
                    setFormData({
                      ...formData,
                      assignedTo: empId,
                      department: matchedDeptId,
                    });
                    if (errors.assignedTo) setErrors({ ...errors, assignedTo: null });
                  }}
                  className="task-select"
                  style={{ width: '100%', padding: '0.75rem 2rem 0.75rem 1rem' }}
                >
                  <option value="">Select Employee...</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.employeeId})
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

          {/* Section: Priority, Status, Timeline & Progress */}
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
              <span>Status & Timeline</span>
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

              {/* Status */}
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
                  Status <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="task-select"
                  style={{ width: '100%', padding: '0.75rem 2rem 0.75rem 1rem' }}
                >
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
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
                  onChange={(e) => setFormData({ ...formData, estimatedHours: parseFloat(e.target.value) || 0 })}
                  className="task-search-input"
                  style={{ padding: '0.75rem 1rem' }}
                />
              </div>

              {/* Progress (%) */}
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
                  Progress ({formData.progress}%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value, 10) || 0 })}
                  className="task-search-input"
                  style={{ padding: '0.75rem 1rem' }}
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid var(--slate-200)',
            }}
          >
            <Link to={`/tasks/${id}`} className="btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.75rem',
              }}
            >
              <Save size={18} />
              <span>{saving ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTaskPage;
