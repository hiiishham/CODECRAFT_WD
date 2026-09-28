import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Loader2, UserPlus, AlertCircle } from 'lucide-react';
import employeeService from '../services/employeeService.js';
import departmentService from '../services/departmentService.js';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/employees.css';

const STATUSES = ['Active', 'Inactive', 'On Leave'];

export const AddEmployeePage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  const [formData, setFormData] = useState({
    fullName: '',
    employeeId: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: '',
    status: 'Active',
    role: 'employee',
    password: '',
    confirmPassword: '',
    profileImage: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Load active departments on mount
  useEffect(() => {
    const fetchActiveDepartments = async () => {
      setLoadingDepartments(true);
      try {
        const response = await departmentService.getDepartments({ status: 'Active' });
        if (response.success && response.departments) {
          setDepartments(response.departments);
          if (response.departments.length > 0) {
            setFormData((prev) => ({
              ...prev,
              department: prev.department || response.departments[0].name,
            }));
          }
        }
      } catch (err) {
        console.error('[AddEmployee] Failed to load departments:', err.message);
      } finally {
        setLoadingDepartments(false);
      }
    };

    fetchActiveDepartments();
  }, []);

  const validateForm = () => {
    const errs = {};

    if (!formData.fullName.trim()) {
      errs.fullName = 'Full Name is required';
    } else if (formData.fullName.trim().length < 2) {
      errs.fullName = 'Full Name must be at least 2 characters';
    }

    if (!formData.employeeId.trim()) {
      errs.employeeId = 'Employee ID is required';
    }

    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is required';
    } else if (!/^[+0-9\s-]{7,20}$/.test(formData.phone.trim())) {
      errs.phone = 'Please enter a valid phone number';
    }

    if (!formData.department) {
      errs.department = 'Department is required';
    }

    if (!formData.designation.trim()) {
      errs.designation = 'Designation is required';
    }

    if (!formData.joiningDate) {
      errs.joiningDate = 'Joining Date is required';
    }

    if (formData.salary === '' || formData.salary === null) {
      errs.salary = 'Salary is required';
    } else if (isNaN(Number(formData.salary)) || Number(formData.salary) < 0) {
      errs.salary = 'Salary must be a valid positive number';
    }

    if (!formData.status) {
      errs.status = 'Status is required';
    }

    if (formData.password) {
      if (formData.password.length < 6) {
        errs.password = 'Initial password must be at least 6 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        errs.confirmPassword = 'Passwords do not match';
      }
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
        ...formData,
        role: formData.role || 'employee',
        password: formData.password || undefined,
        confirmPassword: formData.confirmPassword || undefined,
        employeeId: formData.employeeId.trim().toUpperCase(),
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        designation: formData.designation.trim(),
        salary: Number(formData.salary),
        profileImage: formData.profileImage.trim(),
      };

      const response = await employeeService.createEmployee(payload);

      if (response.success) {
        showSuccess(`${formData.role === 'manager' ? 'Manager' : 'Employee'} added successfully`);
        navigate('/employees');
      } else {
        throw new Error(response.message || 'Failed to add employee');
      }
    } catch (err) {
      console.error('[Add Employee Error]:', err.message);
      setServerError(err.message || 'Failed to add employee. Please check input values.');
      showError(err.message || 'Failed to create employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <nav className="breadcrumb-nav">
        <Link to="/employees">
          <ArrowLeft size={16} />
          <span>Employees</span>
        </Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--slate-800)', fontWeight: 600 }}>Add Employee</span>
      </nav>

      <div className="form-card">
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Add New Employee
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
            Fill in the required information to onboard a new staff member
          </p>
        </header>

        {serverError && (
          <div className="form-alert" role="alert" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={18} />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            {/* Account Role Selection */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">
                Account Role <span className="field-required">*</span>
              </label>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '10px',
                  border: formData.role === 'employee' ? '2px solid #FF6B2C' : '1px solid #e2e8f0',
                  background: formData.role === 'employee' ? '#fff7ed' : '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: formData.role === 'employee' ? '#c2410c' : '#475569'
                }}>
                  <input
                    type="radio"
                    name="role"
                    value="employee"
                    checked={formData.role === 'employee'}
                    onChange={handleChange}
                    style={{ accentColor: '#FF6B2C' }}
                  />
                  <span>Employee (Team Member)</span>
                </label>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '10px',
                  border: formData.role === 'manager' ? '2px solid #6366f1' : '1px solid #e2e8f0',
                  background: formData.role === 'manager' ? '#eef2ff' : '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: formData.role === 'manager' ? '#4338ca' : '#475569'
                }}>
                  <input
                    type="radio"
                    name="role"
                    value="manager"
                    checked={formData.role === 'manager'}
                    onChange={handleChange}
                    style={{ accentColor: '#6366f1' }}
                  />
                  <span>Manager (Department Lead)</span>
                </label>
              </div>
            </div>

            {/* Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">
                Full Name <span className="field-required">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                className={`form-input ${errors.fullName ? 'has-error' : ''}`}
                style={{ paddingLeft: '0.9rem' }}
                placeholder="e.g. Alex Johnson"
                value={formData.fullName}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.fullName && <span className="field-error">{errors.fullName}</span>}
            </div>

            {/* Employee ID */}
            <div className="form-group">
              <label className="form-label" htmlFor="employeeId">
                Employee ID <span className="field-required">*</span>
              </label>
              <input
                type="text"
                id="employeeId"
                name="employeeId"
                className={`form-input ${errors.employeeId ? 'has-error' : ''}`}
                style={{ paddingLeft: '0.9rem' }}
                placeholder="e.g. EMP-1050"
                value={formData.employeeId}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.employeeId && <span className="field-error">{errors.employeeId}</span>}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address <span className="field-required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className={`form-input ${errors.email ? 'has-error' : ''}`}
                style={{ paddingLeft: '0.9rem' }}
                placeholder="alex.johnson@company.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="form-label" htmlFor="phone">
                Phone Number <span className="field-required">*</span>
              </label>
              <input
                type="text"
                id="phone"
                name="phone"
                className={`form-input ${errors.phone ? 'has-error' : ''}`}
                style={{ paddingLeft: '0.9rem' }}
                placeholder="e.g. +1-555-0199"
                value={formData.phone}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </div>

            {/* Department */}
            <div className="form-group">
              <label className="form-label" htmlFor="department">
                Department <span className="field-required">*</span>
              </label>
              <select
                id="department"
                name="department"
                className="filter-select"
                style={{ width: '100%', height: '42px' }}
                value={formData.department}
                onChange={handleChange}
                disabled={isSubmitting || loadingDepartments}
              >
                {loadingDepartments ? (
                  <option value="">Loading active departments...</option>
                ) : departments.length > 0 ? (
                  departments.map((dept) => (
                    <option key={dept._id || dept.name} value={dept.name}>
                      {dept.name}
                    </option>
                  ))
                ) : (
                  <option value="">No active departments found</option>
                )}
              </select>
              {errors.department && <span className="field-error">{errors.department}</span>}
            </div>

            {/* Designation */}
            <div className="form-group">
              <label className="form-label" htmlFor="designation">
                Designation / Job Title <span className="field-required">*</span>
              </label>
              <input
                type="text"
                id="designation"
                name="designation"
                className={`form-input ${errors.designation ? 'has-error' : ''}`}
                style={{ paddingLeft: '0.9rem' }}
                placeholder="e.g. Frontend Engineer"
                value={formData.designation}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.designation && <span className="field-error">{errors.designation}</span>}
            </div>

            {/* Joining Date */}
            <div className="form-group">
              <label className="form-label" htmlFor="joiningDate">
                Joining Date <span className="field-required">*</span>
              </label>
              <input
                type="date"
                id="joiningDate"
                name="joiningDate"
                className={`form-input ${errors.joiningDate ? 'has-error' : ''}`}
                style={{ paddingLeft: '0.9rem' }}
                value={formData.joiningDate}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.joiningDate && <span className="field-error">{errors.joiningDate}</span>}
            </div>

            {/* Salary */}
            <div className="form-group">
              <label className="form-label" htmlFor="salary">
                Annual Salary ($) <span className="field-required">*</span>
              </label>
              <input
                type="number"
                id="salary"
                name="salary"
                min="0"
                step="1000"
                className={`form-input ${errors.salary ? 'has-error' : ''}`}
                style={{ paddingLeft: '0.9rem' }}
                placeholder="e.g. 85000"
                value={formData.salary}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.salary && <span className="field-error">{errors.salary}</span>}
            </div>

            {/* Status */}
            <div className="form-group">
              <label className="form-label" htmlFor="status">
                Status <span className="field-required">*</span>
              </label>
              <select
                id="status"
                name="status"
                className="filter-select"
                style={{ width: '100%', height: '42px' }}
                value={formData.status}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              {errors.status && <span className="field-error">{errors.status}</span>}
            </div>

            {/* Profile Image (Optional) */}
            <div className="form-group">
              <label className="form-label" htmlFor="profileImage">
                Profile Image URL (Optional)
              </label>
              <input
                type="url"
                id="profileImage"
                name="profileImage"
                className="form-input"
                style={{ paddingLeft: '0.9rem' }}
                placeholder="https://example.com/photo.jpg"
                value={formData.profileImage}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            {/* Initial Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Initial Temporary Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                className={`form-input ${errors.password ? 'has-error' : ''}`}
                style={{ paddingLeft: '0.9rem' }}
                placeholder="Leave blank to auto-generate"
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
              <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                User must change this temporary password on their first login.
              </span>
            </div>

            {/* Confirm Initial Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirm Initial Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className={`form-input ${errors.confirmPassword ? 'has-error' : ''}`}
                style={{ paddingLeft: '0.9rem' }}
                placeholder="Re-type initial password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="form-actions">
            <Link to="/employees" className="btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              id="submit-add-employee-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Adding Employee...</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Add Employee</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployeePage;
