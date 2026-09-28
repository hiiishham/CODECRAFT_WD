import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  ArrowLeft,
  Pencil,
  Trash2,
  Building2,
  Briefcase,
  Calendar,
  AlertTriangle,
  User,
  Hash,
  CreditCard,
  PlusCircle,
  MinusCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import salaryService from '../services/salaryService.js';
import { useToast } from '../context/ToastContext.jsx';
import DeleteModal from '../components/common/DeleteModal.jsx';
import Loader from '../components/common/Loader.jsx';
import { formatCurrency } from '../utils/currency.js';
import '../styles/salary.css';
import '../styles/employees.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const SalaryDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [salary, setSalary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchSalary = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await salaryService.getSalaryById(id);
        if (res.success && res.salary) {
          setSalary(res.salary);
        } else {
          throw new Error(res.message || 'Salary record not found');
        }
      } catch (err) {
        setError(err.message || 'Failed to retrieve salary details');
      } finally {
        setLoading(false);
      }
    };

    fetchSalary();
  }, [id]);

  const handleDeleteConfirm = async () => {
    if (salary.status && salary.status !== 'Draft') {
      showError('Only Draft salary records can be deleted. Processed or Paid records are protected.');
      setShowDeleteModal(false);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await salaryService.deleteSalary(id);
      if (res.success) {
        showSuccess('Salary record deleted successfully');
        navigate('/salary');
      }
    } catch (err) {
      showError(err.message || 'Failed to delete salary record');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (name) => {
    if (!name) return 'E';
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return <Loader message="Loading salary details..." fullScreen={false} />;
  }

  if (error || !salary) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: 640, margin: '2rem auto' }}>
        <div className="error-alert-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={20} />
            <span>{error || 'Salary record not found'}</span>
          </div>
          <Link to="/salary" className="btn-secondary" style={{ padding: '0.4rem 0.8rem' }}>
            Back to Salary List
          </Link>
        </div>
      </div>
    );
  }

  const emp = salary.employee || {};
  const allowances = Array.isArray(salary.allowances) ? salary.allowances : [];
  const deductions = Array.isArray(salary.deductions) ? salary.deductions : [];
  const isDraft = !salary.status || salary.status === 'Draft';

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="salary-breadcrumb">
        <Link to="/salary" className="breadcrumb-link">
          Salary
        </Link>
        <ChevronRight size={14} />
        <span>Salary Details</span>
      </div>

      {/* Top Header & Actions */}
      <div className="employee-header-bar" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link to="/salary" className="btn-secondary" style={{ padding: '0.45rem 0.65rem' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              Salary Summary
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '0.15rem' }}>
              Compensation details for {emp.fullName || 'Employee'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link
            to={`/employee/salary/${id}`}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            id="view-printable-payslip-btn"
          >
            <FileText size={16} /> View Payslip
          </Link>
          <Link to={`/salary/${id}/edit`} className="btn-primary" id="edit-salary-btn">
            <Pencil size={16} /> Edit Salary
          </Link>
          <button
            className="btn-danger"
            onClick={() => {
              if (!isDraft) {
                showError('Cannot delete Paid or Processed salary records. Only Draft records can be deleted.');
                return;
              }
              setShowDeleteModal(true);
            }}
            style={{
              opacity: isDraft ? 1 : 0.5,
              cursor: isDraft ? 'pointer' : 'not-allowed',
            }}
            id="delete-salary-btn"
            title={isDraft ? 'Delete Draft Record' : 'Protected: Only Draft records can be deleted'}
          >
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="salary-detail-grid">
        {/* Card 1: Employee Information */}
        <div className="salary-info-card">
          <div className="salary-info-header">
            <User size={18} color="var(--primary-600)" />
            <span>Employee Profile</span>
          </div>

          <div className="salary-emp-profile">
            <div className="salary-emp-avatar">
              {getInitials(emp.fullName)}
            </div>
            <div className="salary-emp-info">
              <span className="salary-emp-name">{emp.fullName || 'Unknown Employee'}</span>
              <span className="salary-emp-meta">{emp.email || '—'}</span>
              {salary.status && (
                <span
                  className={`badge ${
                    salary.status === 'Paid'
                      ? 'badge-success'
                      : salary.status === 'Processed'
                      ? 'badge-primary'
                      : 'badge-warning'
                  }`}
                  style={{ alignSelf: 'flex-start', marginTop: '0.35rem' }}
                >
                  {salary.status}
                </span>
              )}
            </div>
          </div>

          <div className="salary-info-body" style={{ paddingTop: '0.5rem' }}>
            <div className="salary-info-row">
              <span className="salary-info-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Hash size={14} /> Employee ID
              </span>
              <span className="salary-info-value">
                <span className="id-badge">{emp.employeeId || '—'}</span>
              </span>
            </div>

            <div className="salary-info-row">
              <span className="salary-info-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Building2 size={14} /> Department
              </span>
              <span className="salary-info-value">{emp.department || '—'}</span>
            </div>

            <div className="salary-info-row">
              <span className="salary-info-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Briefcase size={14} /> Designation
              </span>
              <span className="salary-info-value">{emp.designation || '—'}</span>
            </div>

            <div className="salary-info-row">
              <span className="salary-info-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} /> Pay Period
              </span>
              <span className="salary-info-value">
                {salary.payMonth ? `${MONTH_NAMES[salary.payMonth - 1]} ${salary.payYear}` : '—'}
              </span>
            </div>

            <div className="salary-info-row">
              <span className="salary-info-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CreditCard size={14} /> Payment Method
              </span>
              <span className="salary-info-value">{salary.paymentMethod || 'Bank Transfer'}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Salary Breakdown */}
        <div className="salary-info-card">
          <div className="salary-info-header">
            <CreditCard size={18} color="var(--primary-600)" />
            <span>Itemized Breakdown</span>
          </div>

          <div className="salary-info-body">
            <div className="salary-info-row">
              <span className="salary-info-label" style={{ fontWeight: 600 }}>Basic Salary</span>
              <span className="salary-info-value currency-value">
                {formatCurrency(salary.basicSalary)}
              </span>
            </div>

            {/* Allowances List */}
            {allowances.length > 0 ? (
              allowances.map((a, i) => (
                <div className="salary-info-row" key={i}>
                  <span className="salary-info-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <PlusCircle size={14} color="#059669" /> {a.name}
                  </span>
                  <span className="salary-info-value currency-value" style={{ color: '#059669' }}>
                    +{formatCurrency(a.amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="salary-info-row">
                <span className="salary-info-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <PlusCircle size={14} color="#059669" /> Allowances
                </span>
                <span className="salary-info-value currency-value">₹0</span>
              </div>
            )}

            {/* Gross Salary Subtotal */}
            <div className="salary-info-row" style={{ background: 'var(--slate-50)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)' }}>
              <span className="salary-info-label" style={{ fontWeight: 700 }}>Total Gross Earnings</span>
              <span className="salary-info-value currency-value" style={{ color: '#059669', fontWeight: 700 }}>
                {formatCurrency(salary.grossSalary)}
              </span>
            </div>

            {/* Deductions List */}
            {deductions.length > 0 ? (
              deductions.map((d, i) => (
                <div className="salary-info-row" key={i}>
                  <span className="salary-info-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MinusCircle size={14} color="#dc2626" /> {d.name}
                  </span>
                  <span className="salary-info-value currency-value" style={{ color: '#dc2626' }}>
                    &minus;{formatCurrency(d.amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="salary-info-row">
                <span className="salary-info-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MinusCircle size={14} color="#dc2626" /> Deductions
                </span>
                <span className="salary-info-value currency-value">₹0</span>
              </div>
            )}

            {/* Total Deductions Subtotal */}
            <div className="salary-info-row" style={{ background: 'var(--slate-50)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)' }}>
              <span className="salary-info-label" style={{ fontWeight: 700 }}>Total Deductions</span>
              <span className="salary-info-value currency-value" style={{ color: '#dc2626', fontWeight: 700 }}>
                &minus;{formatCurrency(salary.totalDeductions)}
              </span>
            </div>

            {/* Net Salary Highlight */}
            <div className="salary-info-row net-row">
              <span className="salary-info-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle2 size={18} color="var(--primary-600)" /> Net Salary
              </span>
              <span className="salary-info-value currency-value highlight">
                {formatCurrency(salary.netSalary)}
              </span>
            </div>

            <div className="salary-info-row" style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--slate-100)' }}>
              <span className="salary-info-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} /> Effective Date
              </span>
              <span className="salary-info-value">{formatDate(salary.effectiveFrom)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Draft Salary Record?"
        message="Are you sure you want to delete this draft salary record? This action cannot be undone."
        itemName={emp.fullName || 'Employee'}
        itemLabel="Employee"
        confirmText="Delete Record"
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default SalaryDetailsPage;
