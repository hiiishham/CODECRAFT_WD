import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  ArrowLeft,
  Loader2,
  IndianRupee,
  AlertCircle,
  AlertTriangle,
  Plus,
  Trash2,
} from 'lucide-react';
import salaryService from '../services/salaryService.js';
import employeeService from '../services/employeeService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import { formatCurrency, CURRENCY_CONFIG } from '../utils/currency.js';
import '../styles/salary.css';
import '../styles/employees.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const EditSalaryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [employees, setEmployees] = useState([]);

  const [formData, setFormData] = useState({
    employee: '',
    basicSalary: '',
    payMonth: 1,
    payYear: new Date().getFullYear(),
    effectiveFrom: '',
    paymentMethod: 'Bank Transfer',
    status: 'Draft',
  });

  const [allowances, setAllowances] = useState([]);
  const [deductions, setDeductions] = useState([]);

  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Fetch existing salary data & employees
  useEffect(() => {
    const loadSalaryAndEmployees = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const [salaryRes, employeeRes] = await Promise.all([
          salaryService.getSalaryById(id),
          employeeService.getEmployees({ limit: 300 }),
        ]);

        if (salaryRes.success && salaryRes.salary) {
          const s = salaryRes.salary;
          const effDate = s.effectiveFrom
            ? new Date(s.effectiveFrom).toISOString().split('T')[0]
            : '';

          setFormData({
            employee: s.employee?._id || s.employee || '',
            basicSalary: s.basicSalary !== undefined ? String(s.basicSalary) : '',
            payMonth: s.payMonth || (s.effectiveFrom ? new Date(s.effectiveFrom).getMonth() + 1 : 1),
            payYear: s.payYear || (s.effectiveFrom ? new Date(s.effectiveFrom).getFullYear() : new Date().getFullYear()),
            effectiveFrom: effDate,
            paymentMethod: s.paymentMethod || 'Bank Transfer',
            status: s.status || 'Draft',
          });

          // Populate allowances
          if (Array.isArray(s.allowances) && s.allowances.length > 0) {
            setAllowances(s.allowances.map((a) => ({ name: a.name || 'Allowance', amount: a.amount || '' })));
          } else if (typeof s.allowances === 'number' && s.allowances > 0) {
            setAllowances([{ name: 'Standard Allowance', amount: s.allowances }]);
          } else {
            setAllowances([{ name: 'House Rent Allowance (HRA)', amount: '' }]);
          }

          // Populate deductions
          if (Array.isArray(s.deductions) && s.deductions.length > 0) {
            setDeductions(s.deductions.map((d) => ({ name: d.name || 'Deduction', amount: d.amount || '' })));
          } else if (typeof s.deductions === 'number' && s.deductions > 0) {
            setDeductions([{ name: 'Standard Deduction', amount: s.deductions }]);
          } else {
            setDeductions([{ name: 'Provident Fund (PF)', amount: '' }]);
          }

          if (s.employee) {
            setEmployeeInfo(s.employee);
          }
        } else {
          throw new Error(salaryRes.message || 'Salary record not found');
        }

        if (employeeRes.success && employeeRes.employees) {
          setEmployees(employeeRes.employees);
        }
      } catch (err) {
        setLoadError(err.message || 'Failed to load salary record');
      } finally {
        setLoading(false);
      }
    };

    loadSalaryAndEmployees();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  };

  // Dynamic Allowances Management
  const handleAllowanceChange = (index, field, val) => {
    setAllowances((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const addAllowance = () => {
    setAllowances((prev) => [...prev, { name: '', amount: '' }]);
  };

  const removeAllowance = (index) => {
    setAllowances((prev) => prev.filter((_, i) => i !== index));
  };

  // Dynamic Deductions Management
  const handleDeductionChange = (index, field, val) => {
    setDeductions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const addDeduction = () => {
    setDeductions((prev) => [...prev, { name: '', amount: '' }]);
  };

  const removeDeduction = (index) => {
    setDeductions((prev) => prev.filter((_, i) => i !== index));
  };

  // Real-time net salary calculation
  const basic = Number(formData.basicSalary) || 0;
  const allowTotal = allowances.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
  const deductTotal = deductions.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const grossSalary = basic + allowTotal;
  const netSalary = Math.max(0, grossSalary - deductTotal);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.employee) {
      newErrors.employee = 'Employee selection is required';
    }

    if (formData.basicSalary === '' || formData.basicSalary === null) {
      newErrors.basicSalary = 'Basic salary is required';
    } else if (Number(formData.basicSalary) <= 0) {
      newErrors.basicSalary = 'Basic salary must be a positive number greater than 0';
    }

    for (let i = 0; i < allowances.length; i++) {
      const item = allowances[i];
      if (item.amount && Number(item.amount) < 0) {
        newErrors.allowances = 'Allowance amounts cannot be negative';
      }
    }

    for (let i = 0; i < deductions.length; i++) {
      const item = deductions[i];
      if (item.amount && Number(item.amount) < 0) {
        newErrors.deductions = 'Deduction amounts cannot be negative';
      }
    }

    if (!formData.effectiveFrom) {
      newErrors.effectiveFrom = 'Effective date is required';
    }

    if (deductTotal > grossSalary) {
      newErrors.deductions = 'Total deductions exceed gross earnings';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setServerError('');

    try {
      const cleanedAllowances = allowances
        .filter((a) => a.name.trim() && Number(a.amount) > 0)
        .map((a) => ({ name: a.name.trim(), amount: Number(a.amount) }));

      const cleanedDeductions = deductions
        .filter((d) => d.name.trim() && Number(d.amount) > 0)
        .map((d) => ({ name: d.name.trim(), amount: Number(d.amount) }));

      const payload = {
        employee: formData.employee,
        basicSalary: Number(formData.basicSalary),
        allowances: cleanedAllowances,
        deductions: cleanedDeductions,
        payMonth: Number(formData.payMonth),
        payYear: Number(formData.payYear),
        effectiveFrom: formData.effectiveFrom,
        paymentMethod: formData.paymentMethod,
        status: formData.status,
      };

      const res = await salaryService.updateSalary(id, payload);
      if (res.success) {
        showSuccess('Salary record updated successfully');
        navigate('/salary');
      }
    } catch (err) {
      const msg = err.message || 'Failed to update salary record';
      setServerError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <Loader message="Loading salary record..." fullScreen={false} />;
  }

  if (loadError) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: 640, margin: '2rem auto' }}>
        <div className="error-alert-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={20} />
            <span>{loadError}</span>
          </div>
          <Link to="/salary" className="btn-secondary" style={{ padding: '0.4rem 0.8rem' }}>
            Back to Salary List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="salary-breadcrumb">
        <Link to="/salary" className="breadcrumb-link">
          Salary
        </Link>
        <ChevronRight size={14} />
        <span>Edit Salary Record</span>
      </div>

      <div className="salary-form-container">
        {/* Header with Back Button */}
        <div className="salary-form-header">
          <Link to="/salary" className="btn-secondary" style={{ padding: '0.45rem 0.65rem' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="salary-form-title">Edit Salary Record</h1>
            <p className="salary-form-desc">
              Update compensation details for {employeeInfo?.fullName || 'Employee'}
            </p>
          </div>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="error-alert-box" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} />
              <span>{serverError}</span>
            </div>
          </div>
        )}

        {/* Live Recalculated Net Salary Banner */}
        <div className="salary-calc-banner">
          <div>
            <span className="salary-calc-label">Live Salary Preview</span>
            <div style={{ fontSize: '0.75rem', color: 'var(--slate-600)', marginTop: '0.15rem' }}>
              Gross: {formatCurrency(grossSalary)} &bull; Deductions: -{formatCurrency(deductTotal)}
            </div>
          </div>
          <span className="salary-calc-value">
            {formatCurrency(netSalary)}
          </span>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="salary-form-card">
          {/* Employee Selection */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Employee *</label>
            <select
              name="employee"
              value={formData.employee}
              onChange={handleChange}
              className={`salary-select-input ${errors.employee ? 'input-error' : ''}`}
              id="edit-salary-employee-select"
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName} ({emp.employeeId}) &mdash; {emp.department}
                </option>
              ))}
            </select>
            {errors.employee && <span className="error-hint">{errors.employee}</span>}
          </div>

          {/* Pay Period Grid */}
          <div className="salary-input-grid">
            <div className="form-group">
              <label className="form-label">Pay Month *</label>
              <select
                name="payMonth"
                value={formData.payMonth}
                onChange={handleChange}
                className="salary-select-input"
                id="edit-salary-pay-month"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name} ({i + 1})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Pay Year *</label>
              <input
                type="number"
                name="payYear"
                value={formData.payYear}
                onChange={handleChange}
                min="2020"
                max="2035"
                className="salary-input-field"
                id="edit-salary-pay-year"
              />
            </div>
          </div>

          {/* Basic Salary */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">
              Basic Salary ({CURRENCY_CONFIG.symbol}) *
            </label>
            <input
              type="number"
              name="basicSalary"
              value={formData.basicSalary}
              onChange={handleChange}
              min="1"
              step="1"
              placeholder="e.g. 40000"
              className={`salary-input-field ${errors.basicSalary ? 'input-error' : ''}`}
              id="edit-salary-basic-input"
            />
            {errors.basicSalary && <span className="error-hint">{errors.basicSalary}</span>}
          </div>

          {/* Dynamic Allowances Section */}
          <div className="dynamic-items-section">
            <div className="items-section-header">
              <span className="items-section-title">
                <IndianRupee size={16} color="#059669" />
                Allowances (Earnings)
              </span>
              <button
                type="button"
                onClick={addAllowance}
                className="btn-add-item"
                id="edit-add-allowance-btn"
              >
                <Plus size={14} /> Add Allowance
              </button>
            </div>

            {allowances.map((item, idx) => (
              <div className="dynamic-item-row" key={idx}>
                <div className="dynamic-item-name">
                  <input
                    type="text"
                    placeholder="Allowance Title (e.g. HRA, Bonus)"
                    value={item.name}
                    onChange={(e) => handleAllowanceChange(idx, 'name', e.target.value)}
                    className="salary-input-field"
                  />
                </div>
                <div className="dynamic-item-amount">
                  <input
                    type="number"
                    min="0"
                    placeholder="Amount (₹)"
                    value={item.amount}
                    onChange={(e) => handleAllowanceChange(idx, 'amount', e.target.value)}
                    className="salary-input-field"
                  />
                </div>
                {allowances.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeAllowance(idx)}
                    className="btn-remove-item"
                    title="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {errors.allowances && <span className="error-hint">{errors.allowances}</span>}
          </div>

          {/* Dynamic Deductions Section */}
          <div className="dynamic-items-section">
            <div className="items-section-header">
              <span className="items-section-title">
                <IndianRupee size={16} color="#dc2626" />
                Deductions
              </span>
              <button
                type="button"
                onClick={addDeduction}
                className="btn-add-item"
                id="edit-add-deduction-btn"
              >
                <Plus size={14} /> Add Deduction
              </button>
            </div>

            {deductions.map((item, idx) => (
              <div className="dynamic-item-row" key={idx}>
                <div className="dynamic-item-name">
                  <input
                    type="text"
                    placeholder="Deduction Title (e.g. PF, Health Ins.)"
                    value={item.name}
                    onChange={(e) => handleDeductionChange(idx, 'name', e.target.value)}
                    className="salary-input-field"
                  />
                </div>
                <div className="dynamic-item-amount">
                  <input
                    type="number"
                    min="0"
                    placeholder="Amount (₹)"
                    value={item.amount}
                    onChange={(e) => handleDeductionChange(idx, 'amount', e.target.value)}
                    className="salary-input-field"
                  />
                </div>
                {deductions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDeduction(idx)}
                    className="btn-remove-item"
                    title="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {errors.deductions && <span className="error-hint">{errors.deductions}</span>}
          </div>

          {/* Status, Payment Method & Effective Date Grid */}
          <div className="salary-input-grid">
            <div className="form-group">
              <label className="form-label">Payroll Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="salary-select-input"
                id="edit-salary-status-select"
              >
                <option value="Draft">Draft</option>
                <option value="Processed">Processed</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="salary-select-input"
                id="edit-salary-method-select"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>

          {/* Effective Date */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Effective Date *</label>
            <input
              type="date"
              name="effectiveFrom"
              value={formData.effectiveFrom}
              onChange={handleChange}
              className={`salary-input-field ${errors.effectiveFrom ? 'input-error' : ''}`}
              id="edit-salary-effective-input"
            />
            {errors.effectiveFrom && <span className="error-hint">{errors.effectiveFrom}</span>}
          </div>

          {/* Action Buttons */}
          <div className="salary-form-actions">
            <Link to="/salary" className="btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              id="edit-salary-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Updating Record...
                </>
              ) : (
                <>
                  <IndianRupee size={16} /> Update Salary Record
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSalaryPage;
