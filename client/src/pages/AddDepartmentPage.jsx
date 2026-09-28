import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft, Loader2, Building2, AlertCircle } from 'lucide-react';
import departmentService from '../services/departmentService.js';
import { useToast } from '../context/ToastContext.jsx';
import '../styles/departments.css';
import '../styles/employees.css';

export const AddDepartmentPage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'Active',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const validateForm = () => {
    const errs = {};

    if (!formData.name.trim()) {
      errs.name = 'Department Name is required';
    } else if (formData.name.trim().length < 2) {
      errs.name = 'Department Name must be at least 2 characters long';
    } else if (formData.name.trim().length > 60) {
      errs.name = 'Department Name cannot exceed 60 characters';
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
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
      };

      const response = await departmentService.createDepartment(payload);

      if (response.success) {
        showSuccess('Department created successfully');
        navigate('/departments');
      } else {
        throw new Error(response.message || 'Failed to create department');
      }
    } catch (err) {
      console.error('[Add Department Error]:', err.message);
      setServerError(err.message || 'Failed to create department. Please verify your input.');
      showError(err.message || 'Failed to create department');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '720px', margin: '0 auto' }}>
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb-nav">
        <Link to="/departments">
          <ArrowLeft size={16} />
          <span>Departments</span>
        </Link>
        <ChevronRight size={14} />
        <span style={{ color: 'var(--slate-800)', fontWeight: 600 }}>Add Department</span>
      </nav>

      <div className="form-card">
        <header style={{ marginBottom: '2rem' }}>
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
              <Building2 size={20} />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
              Add Department
            </h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', margin: 0 }}>
            Establish a new department to categorize and structure your workforce.
          </p>
        </header>

        {serverError && (
          <div className="form-alert" role="alert" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={18} />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Department Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="dept-name-input">
                Department Name <span className="field-required">*</span>
              </label>
              <input
                type="text"
                id="dept-name-input"
                name="name"
                className={`form-input ${errors.name ? 'has-error' : ''}`}
                style={{ paddingLeft: '0.9rem' }}
                placeholder="e.g. Quality Assurance"
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
                autoFocus
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label" htmlFor="dept-desc-input">
                Description
              </label>
              <textarea
                id="dept-desc-input"
                name="description"
                rows={4}
                className="form-input"
                style={{
                  paddingLeft: '0.9rem',
                  paddingTop: '0.75rem',
                  minHeight: '100px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
                placeholder="Brief summary of department responsibilities, objectives, and domain..."
                value={formData.description}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.25rem' }}>
                Optional. Maximum 300 characters.
              </span>
            </div>

            {/* Status */}
            <div className="form-group">
              <label className="form-label" htmlFor="dept-status-select">
                Status <span className="field-required">*</span>
              </label>
              <select
                id="dept-status-select"
                name="status"
                className="filter-select"
                style={{ width: '100%', height: '42px' }}
                value={formData.status}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              {errors.status && <span className="field-error">{errors.status}</span>}
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="form-actions" style={{ marginTop: '2rem' }}>
            <Link to="/departments" className="btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              id="submit-create-department-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Creating Department...</span>
                </>
              ) : (
                <>
                  <Building2 size={16} />
                  <span>Create Department</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDepartmentPage;
