import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  User,
  Briefcase,
  CreditCard,
  Shield,
} from 'lucide-react';
import salaryService from '../services/salaryService';
import Loader from '../components/common/Loader';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/currency.js';
import StaffPulseLogo from '../components/common/StaffPulseLogo.jsx';
import '../styles/salary.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Simple helper to convert number to words (Indian / Western style)
function numberToWords(num) {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n === 0) return '';
    if (n < 20) return a[n] + ' ';
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10] + ' ';
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + inWords(n % 100);
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000);
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000);
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000);
  }

  const rounded = Math.round(Number(num));
  return `${inWords(rounded).trim()} Rupees Only`;
}

const PayslipPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError } = useToast();

  const [salary, setSalary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayslip();
  }, [id]);

  const fetchPayslip = async () => {
    try {
      setLoading(true);
      let res;
      if (user?.role === 'employee') {
        res = await salaryService.getMySalaryById(id);
      } else if (user?.role === 'admin') {
        res = await salaryService.getSalaryById(id);
      } else {
        throw new Error('You are not authorized to view this payslip');
      }

      if (res.success && res.salary) {
        setSalary(res.salary);
      } else {
        throw new Error(res.message || 'Unable to retrieve payslip details');
      }
    } catch (error) {
      console.error('Error loading payslip:', error);
      showError(error.message || 'Error fetching payslip');
      navigate(user?.role === 'employee' ? '/employee/salary' : '/salary');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <Loader message="Generating official payslip statement..." />;
  }

  if (!salary) {
    return (
      <div className="empty-state-card">
        <h3>Payslip Not Found</h3>
        <button
          onClick={() => navigate(user?.role === 'employee' ? '/employee/salary' : '/salary')}
          className="btn btn-primary"
        >
          Return to Salary Records
        </button>
      </div>
    );
  }

  const employee = salary.employee || {};
  const allowances = Array.isArray(salary.allowances) ? salary.allowances : [];
  const deductions = Array.isArray(salary.deductions) ? salary.deductions : [];
  const maxRows = Math.max(allowances.length + 1, deductions.length);

  return (
    <div className="payslip-page-wrapper">
      {/* Top action bar (hidden during print) */}
      <div className="payslip-top-bar no-print">
        <button
          onClick={() => navigate(user?.role === 'employee' ? '/employee/salary' : '/salary')}
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          id="payslip-back-btn"
        >
          <ArrowLeft size={16} />
          Back to Salaries
        </button>

        <button
          onClick={handlePrint}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          id="print-payslip-btn"
        >
          <Printer size={16} />
          Print / Save PDF
        </button>
      </div>

      {/* Corporate Payslip Statement Paper */}
      <div className="payslip-paper" id="printable-payslip">
        {/* Corporate Header */}
        <div className="payslip-corp-header">
          <div>
            <div className="payslip-brand-logo" style={{ marginBottom: '0.4rem' }}>
              <StaffPulseLogo variant="full" height={36} />
            </div>
            <div className="payslip-brand-sub">StaffPulse Enterprise Solutions Pvt. Ltd.</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '2px' }}>
              Cyber City, Tower B, Level 8, Tech Park • support@staffpulse.com
            </div>
          </div>
          <div className="payslip-header-right">
            <div className="payslip-doc-title">PAYSLIP / SALARY STATEMENT</div>
            <div className="payslip-doc-period">
              {MONTH_NAMES[(salary.payMonth || 1) - 1]} {salary.payYear}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '4px' }}>
              Issue Date: {new Date(salary.effectiveFrom || salary.createdAt).toLocaleDateString('en-GB')}
            </div>
          </div>
        </div>

        {/* Employee & Payment Metadata Grid */}
        <div className="payslip-meta-grid">
          <div className="payslip-meta-col">
            <div className="payslip-meta-row">
              <span className="payslip-meta-label">Employee Name:</span>
              <span className="payslip-meta-val">{employee.fullName || 'N/A'}</span>
            </div>
            <div className="payslip-meta-row">
              <span className="payslip-meta-label">Employee ID:</span>
              <span className="payslip-meta-val">{employee.employeeId || 'EMP-N/A'}</span>
            </div>
            <div className="payslip-meta-row">
              <span className="payslip-meta-label">Designation:</span>
              <span className="payslip-meta-val">{employee.designation || 'Specialist'}</span>
            </div>
            <div className="payslip-meta-row">
              <span className="payslip-meta-label">Department:</span>
              <span className="payslip-meta-val">{employee.department || 'Operations'}</span>
            </div>
          </div>

          <div className="payslip-meta-col">
            <div className="payslip-meta-row">
              <span className="payslip-meta-label">Pay Period:</span>
              <span className="payslip-meta-val">
                {MONTH_NAMES[(salary.payMonth || 1) - 1]} {salary.payYear}
              </span>
            </div>
            <div className="payslip-meta-row">
              <span className="payslip-meta-label">Payment Method:</span>
              <span className="payslip-meta-val">{salary.paymentMethod || 'Direct Bank Transfer'}</span>
            </div>
            <div className="payslip-meta-row">
              <span className="payslip-meta-label">Payroll Status:</span>
              <span className="payslip-meta-val" style={{ color: salary.status === 'Paid' ? '#059669' : '#d97706' }}>
                ● {salary.status || 'Paid'}
              </span>
            </div>
            <div className="payslip-meta-row">
              <span className="payslip-meta-label">Email:</span>
              <span className="payslip-meta-val">{employee.email || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Earnings & Deductions Breakdown Table */}
        <table className="payslip-statement-table">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>Earnings / Allowances</th>
              <th style={{ width: '15%', textAlign: 'right' }} className="section-divider">
                Amount (₹)
              </th>
              <th style={{ width: '35%' }}>Deductions</th>
              <th style={{ width: '15%', textAlign: 'right' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {/* Row 0: Basic Salary */}
            <tr>
              <td style={{ fontWeight: 600 }}>Basic Salary</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }} className="section-divider">
                {formatCurrency(salary.basicSalary)}
              </td>
              <td>{deductions[0]?.name || '-'}</td>
              <td style={{ textAlign: 'right' }}>
                {deductions[0] ? formatCurrency(deductions[0].amount) : '-'}
              </td>
            </tr>

            {/* Subsequent rows */}
            {Array.from({ length: maxRows - 1 }).map((_, i) => {
              const allow = allowances[i];
              const deduct = deductions[i + 1];

              return (
                <tr key={i}>
                  <td>{allow?.name || '-'}</td>
                  <td style={{ textAlign: 'right' }} className="section-divider">
                    {allow ? formatCurrency(allow.amount) : '-'}
                  </td>
                  <td>{deduct?.name || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {deduct ? formatCurrency(deduct.amount) : '-'}
                  </td>
                </tr>
              );
            })}

            {/* Total Row */}
            <tr style={{ background: 'var(--slate-50)', fontWeight: 700 }}>
              <td>Total Gross Earnings</td>
              <td style={{ textAlign: 'right', color: '#059669' }} className="section-divider">
                {formatCurrency(salary.grossSalary)}
              </td>
              <td>Total Deductions</td>
              <td style={{ textAlign: 'right', color: '#dc2626' }}>
                {formatCurrency(salary.totalDeductions)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Net Salary Summary Box */}
        <div className="payslip-net-summary">
          <div>
            <div className="net-summary-label">NET TAKE-HOME PAY</div>
            <div style={{ fontSize: '0.85rem', color: '#166534', marginTop: '3px' }}>
              {numberToWords(salary.netSalary)}
            </div>
          </div>
          <div className="net-summary-amount">
            {formatCurrency(salary.netSalary)}
          </div>
        </div>

        {/* Notes & Verification */}
        <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', lineHeight: '1.5' }}>
          * This is a computer-generated salary statement authorized by StaffPulse Enterprise Payroll Systems.
          No physical signature is required for electronic verification. For queries, contact hr@staffpulse.com.
        </div>

        {/* Signature Blocks */}
        <div className="payslip-signatures">
          <div className="sig-block">
            <div className="sig-line"></div>
            <div className="sig-title">Employee Signature</div>
          </div>

          <div className="sig-block">
            <div className="sig-line"></div>
            <div className="sig-title">Authorized Signatory</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>StaffPulse Payroll Dept.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayslipPage;
