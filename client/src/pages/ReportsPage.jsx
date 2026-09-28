import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Users,
  UserCheck,
  UserX,
  Clock,
  Building2,
  CalendarRange,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  RotateCcw,
  AlertTriangle,
  RotateCw,
  TrendingUp,
  FileSpreadsheet,
  FolderMinus,
  Loader2,
} from 'lucide-react';
import reportService from '../services/reportService.js';
import departmentService from '../services/departmentService.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/reports.css';
import '../styles/dashboard.css';

export const ReportsPage = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const isAdmin = user?.role === 'admin';

  // Data State
  const [overview, setOverview] = useState(null);
  const [deptReport, setDeptReport] = useState(null);
  const [leaveReport, setLeaveReport] = useState(null);
  const [joiningTrends, setJoiningTrends] = useState(null);
  const [departments, setDepartments] = useState([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportingEmployees, setExportingEmployees] = useState(false);
  const [exportingLeaves, setExportingLeaves] = useState(false);

  // Filter State
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [department, setDepartment] = useState('All');
  const [appliedFilters, setAppliedFilters] = useState({ from: '', to: '', department: 'All' });

  // Load active departments for filter dropdown
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const res = await departmentService.getDepartments({ status: 'Active' });
        if (res.success && res.departments) {
          setDepartments(res.departments);
        }
      } catch {
        // Non-critical — dropdown will just show "All Departments"
      }
    };
    loadDepartments();
  }, []);

  // Fetch all report data
  const fetchReports = useCallback(async (filters = {}) => {
    setLoading(true);
    setError('');

    try {
      const params = {
        from: filters.from || '',
        to: filters.to || '',
        department: filters.department || 'All',
      };

      const [overviewRes, deptRes, leaveRes, trendsRes] = await Promise.all([
        reportService.getOverview(params),
        reportService.getDepartmentReport(params),
        reportService.getLeaveReport(params),
        reportService.getJoiningTrends(params),
      ]);

      if (overviewRes.success) setOverview(overviewRes.overview);
      if (deptRes.success) setDeptReport(deptRes);
      if (leaveRes.success) setLeaveReport(leaveRes);
      if (trendsRes.success) setJoiningTrends(trendsRes.trends);
    } catch (err) {
      console.error('[Reports Error]:', err.message);
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(appliedFilters);
  }, [fetchReports, appliedFilters]);

  // ──────────────────────────────
  // Filter Handlers
  // ──────────────────────────────
  const handleApplyFilters = () => {
    setAppliedFilters({ from: fromDate, to: toDate, department });
  };

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setDepartment('All');
    setAppliedFilters({ from: '', to: '', department: 'All' });
  };

  const hasActiveFilters = appliedFilters.from || appliedFilters.to || appliedFilters.department !== 'All';

  // ──────────────────────────────
  // CSV Export Utilities
  // ──────────────────────────────
  const formatDateCSV = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const downloadCSV = (csvContent, filename) => {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getDateSuffix = () => {
    return new Date().toISOString().split('T')[0];
  };

  const handleExportEmployees = async () => {
    setExportingEmployees(true);
    try {
      const params = {
        from: appliedFilters.from,
        to: appliedFilters.to,
        department: appliedFilters.department,
      };
      const res = await reportService.getEmployeeExport(params);

      if (!res.success || !res.employees || res.employees.length === 0) {
        showError('No employee data available to export.');
        return;
      }

      const headers = ['Employee ID', 'Full Name', 'Email', 'Phone', 'Department', 'Designation', 'Joining Date', 'Salary', 'Status'];
      const rows = res.employees.map((e) => [
        escapeCSV(e.employeeId),
        escapeCSV(e.fullName),
        escapeCSV(e.email),
        escapeCSV(e.phone),
        escapeCSV(e.department),
        escapeCSV(e.designation),
        formatDateCSV(e.joiningDate),
        e.salary ?? '',
        escapeCSV(e.status),
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      downloadCSV(csv, `staffpulse-employees-${getDateSuffix()}.csv`);
      showSuccess(`Exported ${res.employees.length} employees to CSV`);
    } catch (err) {
      showError(err.message || 'Failed to export employee data');
    } finally {
      setExportingEmployees(false);
    }
  };

  const handleExportLeaves = async () => {
    setExportingLeaves(true);
    try {
      const params = {
        from: appliedFilters.from,
        to: appliedFilters.to,
        department: appliedFilters.department,
      };
      const res = await reportService.getLeaveReport(params);

      if (!res.success || !res.leaves || res.leaves.length === 0) {
        showError('No leave data available to export.');
        return;
      }

      const headers = ['Employee', 'Employee ID', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Duration', 'Reason', 'Status', 'Requested Date'];
      const rows = res.leaves.map((l) => {
        const startD = new Date(l.startDate);
        const endD = new Date(l.endDate);
        const duration = Math.ceil(Math.abs(endD - startD) / (1000 * 60 * 60 * 24)) + 1;
        return [
          escapeCSV(l.employee?.fullName || ''),
          escapeCSV(l.employee?.employeeId || ''),
          escapeCSV(l.employee?.department || ''),
          escapeCSV(l.leaveType),
          formatDateCSV(l.startDate),
          formatDateCSV(l.endDate),
          duration,
          escapeCSV(l.reason),
          escapeCSV(l.status),
          formatDateCSV(l.createdAt),
        ].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      downloadCSV(csv, `staffpulse-leave-report-${getDateSuffix()}.csv`);
      showSuccess(`Exported ${res.leaves.length} leave records to CSV`);
    } catch (err) {
      showError(err.message || 'Failed to export leave data');
    } finally {
      setExportingLeaves(false);
    }
  };

  // ──────────────────────────────
  // Render Helpers
  // ──────────────────────────────
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  if (loading && !overview) {
    return <Loader message="Loading reports and analytics..." fullScreen={false} />;
  }

  const total = overview?.totalEmployees || 0;
  const active = overview?.activeEmployees || 0;
  const inactive = overview?.inactiveEmployees || 0;
  const onLeave = overview?.onLeaveEmployees || 0;
  const deptCount = overview?.totalDepartments || 0;

  const leaveStats = leaveReport?.stats || {};
  const leaveTypeDist = leaveReport?.leaveTypeDistribution || [];

  const deptDistribution = deptReport?.departments || [];
  const maxDeptCount = deptDistribution.length > 0 ? Math.max(...deptDistribution.map((d) => d.count)) : 1;

  const trends = joiningTrends || [];
  const maxTrendCount = trends.length > 0 ? Math.max(...trends.map((t) => t.count)) : 1;

  return (
    <div className="reports-view animate-fade-in">
      {/* Header */}
      <header className="reports-header">
        <h1 className="reports-title">Reports &amp; Analytics</h1>
        <p className="reports-subtitle">Analyze employee and workforce data.</p>
      </header>

      {/* Error State */}
      {error && (
        <div className="error-alert-box" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
          <button className="retry-btn" onClick={() => fetchReports(appliedFilters)}>
            <RotateCw size={14} style={{ marginRight: '0.35rem' }} />
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <section className="reports-filters">
        <div className="filters-row">
          <div className="filter-group">
            <label htmlFor="report-from">From Date</label>
            <input
              id="report-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="report-to">To Date</label>
            <input
              id="report-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="report-department">Department</label>
            <select
              id="report-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-actions">
            <button className="btn-filter-apply" onClick={handleApplyFilters}>
              <Filter size={14} />
              Apply
            </button>
            {hasActiveFilters && (
              <button className="btn-filter-clear" onClick={handleClearFilters}>
                <RotateCcw size={14} />
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Export Buttons */}
      <section className="export-toolbar">
        {isAdmin && (
          <button
            className="btn-export"
            onClick={handleExportEmployees}
            disabled={exportingEmployees}
          >
            {exportingEmployees ? <Loader2 className="animate-spin" size={16} /> : <FileSpreadsheet size={16} />}
            Export Employees CSV
          </button>
        )}
        <button
          className="btn-export"
          onClick={handleExportLeaves}
          disabled={exportingLeaves}
        >
          {exportingLeaves ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
          Export Leave Report CSV
        </button>
      </section>

      {/* Overview Statistics */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Employees</span>
            <span className="stat-value">{total}</span>
            <span className="stat-helper">All recorded personnel</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-primary">
            <Users size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Active</span>
            <span className="stat-value">{active}</span>
            <span className="stat-helper">
              {total > 0 ? `${Math.round((active / total) * 100)}% of total` : '0%'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-success">
            <UserCheck size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Inactive</span>
            <span className="stat-value">{inactive}</span>
            <span className="stat-helper">Archived or paused</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-danger">
            <UserX size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">On Leave</span>
            <span className="stat-value">{onLeave}</span>
            <span className="stat-helper">Away temporarily</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-warning">
            <Clock size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Departments</span>
            <span className="stat-value">{deptCount}</span>
            <span className="stat-helper">Operational units</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-purple">
            <Building2 size={24} />
          </div>
        </div>
      </section>

      {/* Department + Status Reports */}
      <div className="reports-grid-2col">
        {/* Department Distribution */}
        <section className="report-section">
          <div className="report-section-header">
            <h2 className="report-section-title">
              <Building2 size={18} color="var(--primary-600)" />
              Department Distribution
            </h2>
          </div>
          <div className="report-section-body">
            {deptDistribution.length > 0 ? (
              <div className="distribution-list">
                {deptDistribution.map((d, idx) => (
                  <div key={d.department} className="distribution-item">
                    <div className="distribution-meta">
                      <span className="distribution-name">{d.department}</span>
                      <span className="distribution-stats">
                        {d.count} employee{d.count !== 1 ? 's' : ''} ({d.percentage}%)
                      </span>
                    </div>
                    <div className="distribution-bar-track">
                      <div
                        className={`distribution-bar-fill bar-color-${idx % 8}`}
                        style={{ width: `${maxDeptCount > 0 ? (d.count / maxDeptCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon-wrap"><FolderMinus size={24} /></div>
                <h3 className="empty-title">No Department Data</h3>
                <p className="empty-description">Department distribution will appear once employees are added.</p>
              </div>
            )}
          </div>
        </section>

        {/* Employee Status Report */}
        <section className="report-section">
          <div className="report-section-header">
            <h2 className="report-section-title">
              <UserCheck size={18} color="var(--primary-600)" />
              Employee Status Distribution
            </h2>
          </div>
          <div className="report-section-body">
            {total > 0 ? (
              <div className="status-visual">
                <div className="status-segments">
                  {active > 0 && (
                    <div
                      className="status-segment segment-active"
                      style={{ width: `${(active / total) * 100}%` }}
                      title={`Active: ${active}`}
                    />
                  )}
                  {inactive > 0 && (
                    <div
                      className="status-segment segment-inactive"
                      style={{ width: `${(inactive / total) * 100}%` }}
                      title={`Inactive: ${inactive}`}
                    />
                  )}
                  {onLeave > 0 && (
                    <div
                      className="status-segment segment-on-leave"
                      style={{ width: `${(onLeave / total) * 100}%` }}
                      title={`On Leave: ${onLeave}`}
                    />
                  )}
                </div>

                <div className="status-legend">
                  <div className="legend-item">
                    <span className="legend-dot legend-dot-active" />
                    Active
                    <span className="legend-value">{active} ({Math.round((active / total) * 100)}%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot legend-dot-inactive" />
                    Inactive
                    <span className="legend-value">{inactive} ({Math.round((inactive / total) * 100)}%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot legend-dot-on-leave" />
                    On Leave
                    <span className="legend-value">{onLeave} ({Math.round((onLeave / total) * 100)}%)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon-wrap"><Users size={24} /></div>
                <h3 className="empty-title">No Employee Data</h3>
                <p className="empty-description">Employee status distribution will appear once employees are added.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Joining Trends */}
      <section className="report-section">
        <div className="report-section-header">
          <h2 className="report-section-title">
            <TrendingUp size={18} color="var(--primary-600)" />
            Joining Trends
          </h2>
        </div>
        <div className="report-section-body">
          {trends.length > 0 ? (
            <div className="trend-chart">
              {trends.map((t, idx) => (
                <div key={`${t.year}-${t.month}`} className="trend-bar-group">
                  <span className="trend-bar-count">{t.count}</span>
                  <div
                    className="trend-bar"
                    style={{
                      height: `${maxTrendCount > 0 ? Math.max((t.count / maxTrendCount) * 100, 5) : 5}%`,
                    }}
                    title={`${t.label}: ${t.count} employee${t.count !== 1 ? 's' : ''}`}
                  />
                  <span className="trend-bar-label">{t.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon-wrap"><TrendingUp size={24} /></div>
              <h3 className="empty-title">No Joining Data</h3>
              <p className="empty-description">
                Monthly joining trends will appear once employees with joining dates are recorded.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Leave Analytics */}
      <div className="reports-grid-2col">
        {/* Leave Statistics */}
        <section className="report-section">
          <div className="report-section-header">
            <h2 className="report-section-title">
              <CalendarRange size={18} color="var(--primary-600)" />
              Leave Statistics
            </h2>
          </div>
          <div className="report-section-body">
            {(leaveStats.totalLeaves || 0) > 0 ? (
              <div className="leave-stats-bar" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="leave-stat-box">
                  <div className="leave-stat-icon" style={{ backgroundColor: '#eff6ff', color: 'var(--primary-600)' }}>
                    <CalendarRange size={20} />
                  </div>
                  <div className="leave-stat-info">
                    <span className="leave-stat-label">Total Requests</span>
                    <span className="leave-stat-val">{leaveStats.totalLeaves}</span>
                  </div>
                </div>
                <div className="leave-stat-box">
                  <div className="leave-stat-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                    <Clock size={20} />
                  </div>
                  <div className="leave-stat-info">
                    <span className="leave-stat-label">Pending</span>
                    <span className="leave-stat-val">{leaveStats.pendingLeaves}</span>
                  </div>
                </div>
                <div className="leave-stat-box">
                  <div className="leave-stat-icon" style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
                    <CheckCircle size={20} />
                  </div>
                  <div className="leave-stat-info">
                    <span className="leave-stat-label">Approved</span>
                    <span className="leave-stat-val">{leaveStats.approvedLeaves}</span>
                  </div>
                </div>
                <div className="leave-stat-box">
                  <div className="leave-stat-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                    <XCircle size={20} />
                  </div>
                  <div className="leave-stat-info">
                    <span className="leave-stat-label">Rejected</span>
                    <span className="leave-stat-val">{leaveStats.rejectedLeaves}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon-wrap"><CalendarRange size={24} /></div>
                <h3 className="empty-title">No Leave Data</h3>
                <p className="empty-description">Leave statistics will appear once leave requests are created.</p>
              </div>
            )}
          </div>
        </section>

        {/* Leave Type Distribution */}
        <section className="report-section">
          <div className="report-section-header">
            <h2 className="report-section-title">
              <BarChart3 size={18} color="var(--primary-600)" />
              Leave by Type
            </h2>
          </div>
          <div className="report-section-body">
            {leaveTypeDist.length > 0 ? (
              <div className="distribution-list">
                {leaveTypeDist.map((lt, idx) => (
                  <div key={lt.type} className="distribution-item">
                    <div className="distribution-meta">
                      <span className="distribution-name">{lt.type}</span>
                      <span className="distribution-stats">
                        {lt.count} request{lt.count !== 1 ? 's' : ''} ({lt.percentage}%)
                      </span>
                    </div>
                    <div className="distribution-bar-track">
                      <div
                        className={`distribution-bar-fill bar-color-${idx % 8}`}
                        style={{
                          width: `${(leaveStats.totalLeaves || 0) > 0 ? (lt.count / (leaveStats.totalLeaves || 1)) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon-wrap"><BarChart3 size={24} /></div>
                <h3 className="empty-title">No Leave Type Data</h3>
                <p className="empty-description">Leave type distribution will appear once leave requests are created.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ReportsPage;
