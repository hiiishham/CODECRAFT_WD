import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import salaryService from '../services/salaryService';
import Loader from '../components/common/Loader';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/currency.js';
import '../styles/salary.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const EmployeeSalaryPage = () => {
  const [latestSalary, setLatestSalary] = useState(null);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showError } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSalaryData();
  }, []);

  const fetchSalaryData = async () => {
    try {
      setLoading(true);
      const [latestRes, historyRes] = await Promise.all([
        salaryService.getMySalary().catch(() => ({ success: false, salary: null })),
        salaryService.getMySalaryHistory().catch(() => ({ success: false, salaries: [] })),
      ]);

      if (latestRes.success && latestRes.salary) {
        setLatestSalary(latestRes.salary);
      }
      if (historyRes.success && Array.isArray(historyRes.salaries)) {
        setSalaryHistory(historyRes.salaries);
      }
    } catch (error) {
      console.error('Error fetching employee salary data:', error);
      showError(error.message || 'Failed to load salary information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="badge badge-success">
            <CheckCircle2 size={12} style={{ marginRight: '4px' }} />
            Paid
          </span>
        );
      case 'Processed':
        return (
          <span className="badge badge-primary">
            <Clock size={12} style={{ marginRight: '4px' }} />
            Processed
          </span>
        );
      case 'Draft':
      default:
        return (
          <span className="badge badge-warning">
            <AlertCircle size={12} style={{ marginRight: '4px' }} />
            Draft
          </span>
        );
    }
  };

  if (loading) {
    return <Loader message="Loading your salary records..." />;
  }

  return (
    <div className="employee-salary-container">
      {/* Breadcrumbs */}
      <div className="salary-breadcrumb">
        <Link to="/employee/dashboard" className="breadcrumb-link">
          Dashboard
        </Link>
        <span>/</span>
        <span>My Salary</span>
      </div>

      {/* Hero Card */}
      {latestSalary ? (
        <div className="employee-salary-hero">
          <div>
            <div className="hero-sub">Current Net Salary</div>
            <div className="hero-net-amount">
              {formatCurrency(latestSalary.netSalary)}
            </div>
            <div className="hero-period-tag">
              <Calendar size={14} />
              <span>
                {MONTH_NAMES[(latestSalary.payMonth || 1) - 1]} {latestSalary.payYear}
              </span>
              <span style={{ margin: '0 4px' }}>•</span>
              {getStatusBadge(latestSalary.status)}
            </div>
          </div>

          <div className="hero-actions">
            <button
              onClick={() => navigate(`/employee/salary/${latestSalary._id}`)}
              className="btn btn-primary"
              style={{
                backgroundColor: '#ffffff',
                color: 'var(--primary-700)',
                border: 'none',
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
              id="view-latest-payslip-btn"
            >
              <FileText size={16} />
              View Latest Payslip
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-state-card" style={{ marginBottom: '2rem' }}>
          <AlertCircle size={36} color="var(--slate-400)" />
          <h3>No Salary Records Found</h3>
          <p>Your compensation and payroll information will appear here once issued by administration.</p>
        </div>
      )}

      {/* Salary Breakdown (Earnings vs Deductions) */}
      {latestSalary && (
        <div className="salary-breakdown-grid">
          {/* Earnings Card */}
          <div className="breakdown-card">
            <div className="breakdown-card-header">
              <div className="breakdown-card-title earnings">
                <TrendingUp size={18} />
                <span>Earnings Breakdown</span>
              </div>
              <span className="badge badge-success">Gross Pay</span>
            </div>

            <div className="breakdown-list">
              <div className="breakdown-item">
                <span className="breakdown-item-name">Basic Salary</span>
                <span className="breakdown-item-amount">
                  {formatCurrency(latestSalary.basicSalary)}
                </span>
              </div>

              {Array.isArray(latestSalary.allowances) && latestSalary.allowances.length > 0 ? (
                latestSalary.allowances.map((allowance, idx) => (
                  <div className="breakdown-item" key={idx}>
                    <span className="breakdown-item-name">{allowance.name}</span>
                    <span className="breakdown-item-amount">
                      {formatCurrency(allowance.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="breakdown-item text-muted" style={{ fontSize: '0.82rem' }}>
                  No extra allowances
                </div>
              )}
            </div>

            <div className="breakdown-card-total">
              <span className="total-label">Gross Earnings</span>
              <span className="total-value green">
                {formatCurrency(latestSalary.grossSalary)}
              </span>
            </div>
          </div>

          {/* Deductions Card */}
          <div className="breakdown-card">
            <div className="breakdown-card-header">
              <div className="breakdown-card-title deductions">
                <TrendingDown size={18} />
                <span>Deductions Breakdown</span>
              </div>
              <span className="badge badge-warning">Itemized</span>
            </div>

            <div className="breakdown-list">
              {Array.isArray(latestSalary.deductions) && latestSalary.deductions.length > 0 ? (
                latestSalary.deductions.map((deduction, idx) => (
                  <div className="breakdown-item" key={idx}>
                    <span className="breakdown-item-name">{deduction.name}</span>
                    <span className="breakdown-item-amount" style={{ color: '#dc2626' }}>
                      -{formatCurrency(deduction.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="breakdown-item text-muted" style={{ fontSize: '0.82rem' }}>
                  No deductions recorded
                </div>
              )}
            </div>

            <div className="breakdown-card-total">
              <span className="total-label">Total Deductions</span>
              <span className="total-value red">
                -{formatCurrency(latestSalary.totalDeductions)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Salary History Table */}
      <div className="salary-table-wrap">
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--slate-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)' }}>
              Salary & Payslip History
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--slate-500)', marginTop: '2px' }}>
              Historical compensation statements and official payslips
            </p>
          </div>
          <span className="badge badge-primary">{salaryHistory.length} Statements</span>
        </div>

        {salaryHistory.length > 0 ? (
          <table className="custom-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Pay Period</th>
                <th>Basic</th>
                <th>Allowances</th>
                <th>Deductions</th>
                <th>Net Salary</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {salaryHistory.map((record) => {
                const allowTotal = Array.isArray(record.allowances)
                  ? record.allowances.reduce((acc, a) => acc + (Number(a.amount) || 0), 0)
                  : 0;
                const deductTotal = Array.isArray(record.deductions)
                  ? record.deductions.reduce((acc, d) => acc + (Number(d.amount) || 0), 0)
                  : 0;

                return (
                  <tr key={record._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar color="var(--primary-500)" size={16} />
                        <strong>
                          {MONTH_NAMES[(record.payMonth || 1) - 1]} {record.payYear}
                        </strong>
                      </div>
                    </td>
                    <td>{formatCurrency(record.basicSalary)}</td>
                    <td style={{ color: '#059669' }}>+{formatCurrency(allowTotal)}</td>
                    <td style={{ color: '#dc2626' }}>-{formatCurrency(deductTotal)}</td>
                    <td>
                      <strong style={{ color: 'var(--primary-700)' }}>
                        {formatCurrency(record.netSalary)}
                      </strong>
                    </td>
                    <td>{getStatusBadge(record.status)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => navigate(`/employee/salary/${record._id}`)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                        id={`view-payslip-${record._id}`}
                      >
                        <Eye size={14} />
                        View Payslip
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-500)' }}>
            No past salary records found.
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeSalaryPage;
