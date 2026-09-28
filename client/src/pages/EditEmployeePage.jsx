import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Loader2, Save, AlertCircle, RotateCw } from 'lucide-react';
import employeeService from '../services/employeeService.js';
import departmentService from '../services/departmentService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/employees.css';

const STATUSES = ['Active', 'Inactive', 'On Leave'];

export const EditEmployeePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    employeeId: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    joiningDate: '',
    salary: '',
    status: 'Active',
    profileImage: '',
  });

  const [errors, setErrors] = useState({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [serverError, setServerError] = useState('');

  // Fetch initial employee record and departments to populate form
  const fetchEmployee = useCallback(async () => {
    setInitialLoading(true);
    setLoadError('');

    try {
      const [empRes, deptRes] = await Promise.all([
        employeeService.getEmployeeById(id),
        departmentService.getDepartments({ status: 'Active' }),
      ]);

      if (empRes.success && empRes.employee) {
        const emp = empRes.employee;
        let activeDepts = (deptRes.success && deptRes.departments) ? deptRes.departments : [];

        // If employee has a department not currently in active list, retain it as an option
        if (emp.department && !activeDepts.some((d) => d.name === emp.department)) {
          activeDepts = [{ name: emp.department }, ...activeDepts];
        }

        setDepartments(activeDepts);

        setFormData({
          fullName: emp.fullName || '',
          employeeId: emp.employeeId || '',
          email: emp.email || '',
          phone: emp.phone || '',
          department: emp.department || (activeDepts[0]?.name || ''),
          designation: emp.designation || '',
          joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
          salary: emp.salary !== undefined && emp.salary !== null ? emp.salary : '',
          status: emp.status || 'Active',
          profileImage: emp.profileImage || '',
        });
      } else {
        throw new Error(empRes?.message || 'Employee not found');
      }
    } catch (err) {
      console.error('[Edit Employee Load Error]:', err.message);
      setLoadError(err.message || 'Unable to load employee data');
    } finally {
      setInitialLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchEmployee();
    }
  }, [id, fetchEmployee]);

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
        employeeId: formData.employeeId.trim().toUpperCase(),
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        designation: formData.designation.trim(),
        salary: Number(formData.salary),
        profileImage: formData.profileImage.trim(),
      };

      const response = await employeeService.updateEmployee(id, payload);

      if (response.success) {
        showSuccess('Employee updated successfully');
        navigate(`/employees/${id}`);
      } else {
        throw new Error(response.message || 'Failed to update employee');
      }
    } catch (err) {
      console.error('[Edit Employee Submit Error]:', err.message);
      setServerError(err.message || 'Failed to update employee. Please check inputs.');
      showError(err.message || 'Failed to update employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (initialLoading) {
    return <Loader message="Loading employee for editing..." fullScreen={false} />;
  }

  if (loadError) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <div className="error-alert-box" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={20} />
            <span>{loadError}</span>
          </div>
          <button className="retry-btn" onClick={fetchEmployee}>
            <RotateCw size={14} style={{ marginRight: '0.35rem' }} />
            Retry
          </button>
        </div>
        <Link to="/employees" className="btn-secondary" style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Employees</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Breadcrumbs */}
      <nav className="breadcrumb-nav">
        <Link to="/employees">
          <ArrowLeft size={16} />
          <span>Employees</span>
        </Link>
        <ChevronRight size={14} />
        <Link to={`/employees/${id}`}>{formData.fullName || 'Profile'}</Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--slate-800)', fontWeight: 600 }}>Edit</span>
      </nav>

      <div className="form-card">
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Edit Employee Details
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
            Update contact, employment, and status information for {formData.fullName}
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
                disabled={isSubmitting}
              >
                {departments.length > 0 ? (
                  departments.map((dept) => (
                    <option key={dept._id || dept.name} value={dept.name}>
                      {dept.name}
                    </option>
                  ))
                ) : (
                  <option value={formData.department || ''}>
                    {formData.department || 'No active departments'}
                  </option>
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

            {/* Profile Image */}
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
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <Link to={`/employees/${id}`} className="btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              id="submit-edit-employee-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEmployeePage;
