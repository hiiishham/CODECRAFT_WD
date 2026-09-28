import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight,
  ArrowLeft,
  Loader2,
  IndianRupee,
  AlertCircle,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
} from 'lucide-react';
import salaryService from '../services/salaryService.js';
import employeeService from '../services/employeeService.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatCurrency, CURRENCY_CONFIG } from '../utils/currency.js';
import '../styles/salary.css';
import '../styles/employees.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const AddSalaryPage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [formData, setFormData] = useState({
    employee: '',
    basicSalary: '',
    payMonth: currentMonth,
    payYear: currentYear,
    effectiveFrom: currentDate.toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    status: 'Draft',
  });

  const [allowances, setAllowances] = useState([
    { name: 'House Rent Allowance (HRA)', amount: '' },
  ]);

  const [deductions, setDeductions] = useState([
    { name: 'Provident Fund (PF)', amount: '' },
  ]);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Load employees
  useEffect(() => {
    const fetchData = async () => {
      setLoadingEmployees(true);
      try {
        const empRes = await employeeService.getEmployees({ limit: 300, status: 'Active' });
        if (empRes.success && empRes.employees) {
          setEmployees(empRes.employees);
        }
      } catch (err) {
        console.error('[AddSalary] Failed to load employees:', err.message);
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchData();
  }, []);

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

  // Real-time calculations
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

    // Validate allowances
    for (let i = 0; i < allowances.length; i++) {
      const item = allowances[i];
      if (item.amount && Number(item.amount) < 0) {
        newErrors.allowances = 'Allowance amounts cannot be negative';
      }
      if (item.amount && !item.name.trim()) {
        newErrors.allowances = 'Each allowance item requires a title or name';
      }
    }

    // Validate deductions
    for (let i = 0; i < deductions.length; i++) {
      const item = deductions[i];
      if (item.amount && Number(item.amount) < 0) {
        newErrors.deductions = 'Deduction amounts cannot be negative';
      }
      if (item.amount && !item.name.trim()) {
        newErrors.deductions = 'Each deduction item requires a title or name';
      }
    }

    if (!formData.effectiveFrom) {
      newErrors.effectiveFrom = 'Effective date is required';
    }

    if (deductTotal > grossSalary) {
      newErrors.deductions = 'Total deductions exceed gross earnings (Basic + Allowances)';
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
      // Filter out empty allowance/deduction items
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

      const res = await salaryService.createSalary(payload);
      if (res.success) {
        showSuccess('Salary record created successfully');
        navigate('/salary');
      }
    } catch (err) {
      const msg = err.message || 'Failed to create salary record';
      setServerError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="salary-breadcrumb">
        <Link to="/salary" className="breadcrumb-link">
          Salary
        </Link>
        <ChevronRight size={14} />
        <span>Add Salary Record</span>
      </div>

      <div className="salary-form-container">
        {/* Page Heading with Back Button */}
        <div className="salary-form-header">
          <Link to="/salary" className="btn-secondary" style={{ padding: '0.45rem 0.65rem' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="salary-form-title">Add Salary Record</h1>
            <p className="salary-form-desc">Define itemized compensation for an employee pay period</p>
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

        {/* Real-time Net Salary Calculator Banner */}
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
          {/* Employee Dropdown */}
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Employee *</label>
            {loadingEmployees ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--slate-500)', fontSize: '0.85rem' }}>
                <Loader2 className="animate-spin" size={16} /> Loading employees...
              </div>
            ) : (
              <select
                name="employee"
                value={formData.employee}
                onChange={handleChange}
                className={`salary-select-input ${errors.employee ? 'input-error' : ''}`}
                id="salary-employee-select"
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} ({emp.employeeId}) &mdash; {emp.department}
                  </option>
                ))}
              </select>
            )}
            {errors.employee && <span className="error-hint">{errors.employee}</span>}
          </div>

          {/* Pay Period & Status Grid */}
          <div className="salary-input-grid">
            <div className="form-group">
              <label className="form-label">Pay Month *</label>
              <select
                name="payMonth"
                value={formData.payMonth}
                onChange={handleChange}
                className="salary-select-input"
                id="salary-pay-month"
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
                id="salary-pay-year"
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
              placeholder="e.g. 50000"
              className={`salary-input-field ${errors.basicSalary ? 'input-error' : ''}`}
              id="salary-basic-input"
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
                id="add-allowance-btn"
              >
                <Plus size={14} /> Add Allowance
              </button>
            </div>

            {allowances.map((item, idx) => (
              <div className="dynamic-item-row" key={idx}>
                <div className="dynamic-item-name">
                  <input
                    type="text"
                    placeholder="Allowance Title (e.g. HRA, Travel)"
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
                id="add-deduction-btn"
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

          {/* Status, Payment Method & Effective From Grid */}
          <div className="salary-input-grid">
            <div className="form-group">
              <label className="form-label">Payroll Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="salary-select-input"
                id="salary-status-select"
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
                id="salary-method-select"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
          </div>

          {/* Effective From */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Effective Date *</label>
            <input
              type="date"
              name="effectiveFrom"
              value={formData.effectiveFrom}
              onChange={handleChange}
              className={`salary-input-field ${errors.effectiveFrom ? 'input-error' : ''}`}
              id="salary-effective-input"
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
              id="salary-submit-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Saving Record...
                </>
              ) : (
                <>
                  <IndianRupee size={16} /> Save Salary Record
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSalaryPage;
