import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Clock,
  Building2,
  ArrowRight,
  AlertTriangle,
  RotateCw,
  FolderMinus,
  Sparkles,
  CalendarRange,
  CheckCircle,
  XCircle,
  IndianRupee,
  Banknote,
  BarChart3,
  FolderCheck,
  ExternalLink,
  CreditCard,
  TrendingUp,
  FileText,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import dashboardService from '../services/dashboardService.js';
import { submissionService } from '../services/submissionService.js';
import { performanceService } from '../services/performanceService.js';
import documentService from '../services/documentService.js';
import announcementService from '../services/announcementService.js';
import adminAttendanceService from '../services/adminAttendanceService.js';
import Loader from '../components/common/Loader.jsx';
import AdminSuperDashboard from '../components/dashboard/AdminSuperDashboard.jsx';
import { formatCurrency } from '../utils/currency.js';
import '../styles/dashboard.css';
import '../styles/leaves.css';
import '../styles/salary.css';
import '../styles/performance.css';
import '../styles/announcements.css';

export const DashboardPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [data, setData] = useState(null);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [perfStats, setPerfStats] = useState(null);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardStats = async () => {
    setLoading(true);
    setError('');

    try {
      const [statsRes, subRes, perfRes, docsRes, annRes, attRes] = await Promise.allSettled([
        dashboardService.getStats(),
        submissionService.getSubmissions({ status: 'Pending Review', limit: 5 }),
        performanceService.getPerformanceStats(),
        documentService.getDocuments({ limit: 5 }),
        announcementService.getAnnouncements({ limit: 5 }),
        adminAttendanceService.getDashboardSummary(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.success) {
        setData(statsRes.value);
      } else if (statsRes.status === 'rejected') {
        throw new Error('Failed to load dashboard metrics');
      }

      if (subRes.status === 'fulfilled' && subRes.value.success && subRes.value.submissions) {
        setPendingSubmissions(subRes.value.submissions);
      }

      if (perfRes.status === 'fulfilled' && perfRes.value.success) {
        setPerfStats(perfRes.value.data);
      }

      if (docsRes.status === 'fulfilled' && docsRes.value.success && docsRes.value.documents) {
        setRecentDocuments(docsRes.value.documents.slice(0, 5));
      }

      if (annRes.status === 'fulfilled' && annRes.value.success && annRes.value.announcements) {
        setRecentAnnouncements(annRes.value.announcements.slice(0, 5));
      }

      if (attRes.status === 'fulfilled' && attRes.value.success && attRes.value.stats) {
        setAttendanceStats(attRes.value.stats);
      }
    } catch (err) {
      console.error('[Dashboard Error]:', err.message);
      setError(err.message || 'Failed to retrieve dashboard statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (name) => {
    if (!name) return 'E';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Active':
        return 'status-active';
      case 'Inactive':
        return 'status-inactive';
      case 'On Leave':
        return 'status-on-leave';
      case 'Pending':
        return 'leave-badge-pending';
      case 'Approved':
        return 'leave-badge-approved';
      case 'Rejected':
        return 'leave-badge-rejected';
      default:
        return '';
    }
  };

  if (loading) {
    return <Loader message="Loading dashboard statistics..." fullScreen={false} />;
  }

  const totalEmployees = data?.totalEmployees || 0;
  const activeEmployees = data?.activeEmployees || 0;
  const inactiveEmployees = data?.inactiveEmployees || 0;
  const onLeaveEmployees = data?.onLeaveEmployees || 0;
  const departmentCount = data?.departmentCount || 0;
  const recentEmployees = data?.recentEmployees || [];
  const departmentDistribution = data?.stats?.departmentDistribution || [];

  // Live Leave Statistics
  const pendingLeaves = data?.pendingLeaves ?? data?.stats?.pendingLeaves ?? 0;
  const approvedLeaves = data?.approvedLeaves ?? data?.stats?.approvedLeaves ?? 0;
  const rejectedLeaves = data?.rejectedLeaves ?? data?.stats?.rejectedLeaves ?? 0;
  const onLeaveToday = data?.onLeaveToday ?? data?.stats?.onLeaveToday ?? 0;
  const recentLeaves = data?.recentLeaves ?? data?.stats?.recentLeaves ?? [];

  // Confidential Salary Overview (Admin Only)
  const salaryOverview = data?.stats?.salaryOverview || data?.salaryOverview || null;

  if (isAdmin) {
    return (
      <div className="dashboard-view animate-fade-in">
        <AdminSuperDashboard />
      </div>
    );
  }

  return (
    <div className="dashboard-view animate-fade-in">
      <header className="dashboard-header">
        <div className="dashboard-header-text">
          <span className="dashboard-date-label">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
          <h1 className="dashboard-heading">Overview Dashboard</h1>
          <p className="dashboard-subheading">
            Real-time workforce distribution, department analytics, and leave metrics
          </p>
        </div>
      </header>

      {error && (
        <div className="error-alert-box" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
          <button className="retry-btn" onClick={fetchDashboardStats}>
            <RotateCw size={14} style={{ marginRight: '0.35rem' }} />
            Retry
          </button>
        </div>
      )}

      {/* Quick Actions Toolbar */}
      <section className="quick-actions-bar" aria-label="Dashboard Quick Actions">
        {isAdmin && (
          <Link to="/employees/add" className="quick-action-card" id="quick-action-add-employee">
            <div className="quick-action-icon primary">
              <UserPlus size={18} />
            </div>
            <span>Add Employee</span>
          </Link>
        )}
        <Link to="/employees" className="quick-action-card" id="quick-action-manage-employees">
          <div className="quick-action-icon success">
            <Users size={18} />
          </div>
          <span>Manage Employees</span>
        </Link>
        <Link to="/leaves" className="quick-action-card" id="quick-action-manage-leaves">
          <div className="quick-action-icon warning">
            <CalendarRange size={18} />
          </div>
          <span>Manage Leave</span>
        </Link>
        <Link to="/reports" className="quick-action-card" id="quick-action-view-reports">
          <div className="quick-action-icon purple">
            <BarChart3 size={18} />
          </div>
          <span>View Reports</span>
        </Link>
        <Link to="/submissions" className="quick-action-card" id="quick-action-work-reviews">
          <div className="quick-action-icon primary" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
            <FolderCheck size={18} />
          </div>
          <span>Work Reviews</span>
        </Link>
      </section>

      {/* 5 Primary Workforce Cards */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Staff</span>
            <span className="stat-value">{totalEmployees}</span>
            <span className="stat-helper">All recorded personnel</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-primary">
            <Users size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Active Staff</span>
            <span className="stat-value">{activeEmployees}</span>
            <span className="stat-helper">
              {totalEmployees > 0 ? `${Math.round((activeEmployees / totalEmployees) * 100)}% of total` : '0%'}
            </span>
          </div>
          <div className="stat-icon-wrapper stat-icon-success">
            <UserCheck size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Inactive</span>
            <span className="stat-value">{inactiveEmployees}</span>
            <span className="stat-helper">Archived or paused</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-danger">
            <UserX size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">On Leave</span>
            <span className="stat-value">{onLeaveEmployees}</span>
            <span className="stat-helper">Away temporarily</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-warning">
            <Clock size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Departments</span>
            <span className="stat-value">{departmentCount}</span>
            <span className="stat-helper">Operational units</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-purple">
            <Building2 size={24} />
          </div>
        </div>
      </section>

      {/* Today's Workforce (Admin & Manager) */}
      {attendanceStats && (
        <section className="dashboard-card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title">
              <Users size={18} color="var(--primary-600)" />
              <span>Today's Workforce</span>
            </h2>
            <Link to="/attendance" className="card-action-link">
              <span>View Attendance</span>
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body">
            <div className="leave-stats-bar">
              <div className="leave-stat-box">
                <div className="leave-stat-info">
                  <span className="leave-stat-label">Total Employees</span>
                  <span className="leave-stat-val">{attendanceStats.totalEmployees}</span>
                </div>
              </div>
              <div className="leave-stat-box">
                <div className="leave-stat-info">
                  <span className="leave-stat-label" style={{color: '#0369a1'}}>Present</span>
                  <span className="leave-stat-val" style={{color: '#0369a1'}}>{attendanceStats.present}</span>
                </div>
              </div>
              <div className="leave-stat-box">
                <div className="leave-stat-info">
                  <span className="leave-stat-label" style={{color: '#166534'}}>Working Now</span>
                  <span className="leave-stat-val" style={{color: '#166534'}}>{attendanceStats.workingNow}</span>
                </div>
              </div>
              <div className="leave-stat-box">
                <div className="leave-stat-info">
                  <span className="leave-stat-label" style={{color: '#b45309'}}>Late</span>
                  <span className="leave-stat-val" style={{color: '#b45309'}}>{attendanceStats.late}</span>
                </div>
              </div>
              <div className="leave-stat-box">
                <div className="leave-stat-info">
                  <span className="leave-stat-label" style={{color: '#991b1b'}}>Absent</span>
                  <span className="leave-stat-val" style={{color: '#991b1b'}}>{attendanceStats.absent}</span>
                </div>
              </div>
              <div className="leave-stat-box">
                <div className="leave-stat-info">
                  <span className="leave-stat-label" style={{color: '#6b21a8'}}>On Leave</span>
                  <span className="leave-stat-val" style={{color: '#6b21a8'}}>{attendanceStats.onLeave}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
      {/* Leave Metrics Mini-Cards */}
      <section style={{ marginTop: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="leave-stats-bar">
          <div className="leave-stat-box">
            <div className="leave-stat-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
              <Clock size={20} />
            </div>
            <div className="leave-stat-info">
              <span className="leave-stat-label">Pending Leaves</span>
              <span className="leave-stat-val">{pendingLeaves}</span>
            </div>
          </div>

          <div className="leave-stat-box">
            <div className="leave-stat-icon" style={{ backgroundColor: '#d1fae5', color: '#059669' }}>
              <CheckCircle size={20} />
            </div>
            <div className="leave-stat-info">
              <span className="leave-stat-label">Approved Leaves</span>
              <span className="leave-stat-val">{approvedLeaves}</span>
            </div>
          </div>

          <div className="leave-stat-box">
            <div className="leave-stat-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
              <XCircle size={20} />
            </div>
            <div className="leave-stat-info">
              <span className="leave-stat-label">Rejected Leaves</span>
              <span className="leave-stat-val">{rejectedLeaves}</span>
            </div>
          </div>

          <div className="leave-stat-box">
            <div className="leave-stat-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
              <UserCheck size={20} />
            </div>
            <div className="leave-stat-info">
              <span className="leave-stat-label">On Leave Today</span>
              <span className="leave-stat-val" style={{ color: '#16a34a' }}>{onLeaveToday}</span>
            </div>
          </div>

          <div className="leave-stat-box">
            <div className="leave-stat-icon" style={{ backgroundColor: '#eff6ff', color: 'var(--primary-600)' }}>
              <CalendarRange size={20} />
            </div>
            <div className="leave-stat-info">
              <span className="leave-stat-label">Total Time-Off</span>
              <span className="leave-stat-val">{pendingLeaves + approvedLeaves + rejectedLeaves}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Confidential Salary Overview (Admin Only) */}
      {isAdmin && salaryOverview && (
        <section style={{ marginBottom: '1.5rem' }}>
          <div className="salary-dashboard-widget">
            <div className="salary-dashboard-header">
              <div className="salary-dashboard-title">
                <IndianRupee size={18} color="var(--primary-600)" />
                <span>Salary & Payroll Overview</span>
              </div>
              <Link to="/salary" className="card-action-link">
                <span>Manage Salary</span>
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="salary-dashboard-row">
              <div className="stat-card" style={{ boxShadow: 'none', border: '1px solid var(--slate-100)' }}>
                <div className="stat-content">
                  <span className="stat-label">Average Salary</span>
                  <span className="stat-value" style={{ fontSize: '1.4rem' }}>
                    {formatCurrency(salaryOverview.averageSalary)}
                  </span>
                  <span className="stat-helper">Mean monthly net compensation</span>
                </div>
                <div className="stat-icon-wrapper stat-icon-success">
                  <IndianRupee size={22} />
                </div>
              </div>

              <div className="stat-card" style={{ boxShadow: 'none', border: '1px solid var(--slate-100)' }}>
                <div className="stat-content">
                  <span className="stat-label">Total Payroll</span>
                  <span className="stat-value" style={{ fontSize: '1.4rem' }}>
                    {formatCurrency(salaryOverview.totalPayroll)}
                  </span>
                  <span className="stat-helper">Cumulative monthly net payroll</span>
                </div>
                <div className="stat-icon-wrapper stat-icon-primary">
                  <Banknote size={22} />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Grid: Department Distribution & Recent Staff */}
      <div className="dashboard-grid-content">
        {/* A. Department Distribution */}
        <section className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">
              <Building2 size={18} color="var(--primary-600)" />
              <span>Department Distribution</span>
            </h2>
          </div>
          <div className="card-body">
            {departmentDistribution.length > 0 ? (
              <div className="department-list">
                {departmentDistribution.map((item) => {
                  const percentage = totalEmployees > 0
                    ? Math.round((item.count / totalEmployees) * 100)
                    : 0;
                  return (
                    <div key={item.department} className="dept-item">
                      <div className="dept-meta">
                        <span className="dept-name">{item.department}</span>
                        <span className="dept-count">
                          {item.count} {item.count === 1 ? 'member' : 'members'} ({percentage}%)
                        </span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon-wrap">
                  <FolderMinus size={24} />
                </div>
                <h3 className="empty-title">No Departments Recorded</h3>
                <p className="empty-description">
                  Departments will appear here as employees are assigned.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* B. Recent Employees Table */}
        <section className="dashboard-card">
          <div className="card-header">
            <h2 className="card-title">
              <Sparkles size={18} color="var(--primary-600)" />
              <span>Recent Employees</span>
            </h2>
            <Link to="/employees" className="card-action-link">
              <span>View All Employees</span>
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {recentEmployees.length > 0 ? (
              <div className="table-responsive">
                <table className="recent-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>ID</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEmployees.map((emp) => (
                      <tr key={emp._id || emp.employeeId}>
                        <td>
                          <div className="employee-cell">
                            {emp.profileImage ? (
                              <img
                                src={emp.profileImage}
                                alt={emp.fullName}
                                className="employee-avatar-circle"
                                style={{ objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="employee-avatar-circle">
                                {getInitials(emp.fullName)}
                              </div>
                            )}
                            <div className="employee-info-cell">
                              <span className="employee-name">{emp.fullName}</span>
                              <span className="employee-email">{emp.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="id-badge">{emp.employeeId}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{emp.department}</span>
                        </td>
                        <td>{emp.designation}</td>
                        <td>
                          <span className={`status-pill ${getStatusBadgeClass(emp.status)}`}>
                            {emp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon-wrap">
                  <Users size={24} />
                </div>
                <h3 className="empty-title">No Employees Found</h3>
                <p className="empty-description">
                  Get started by adding your first employee to populate this dashboard.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Pending Work Reviews Section */}
        <section className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderCheck size={18} color="var(--primary-600)" />
              <h2 className="card-title" style={{ margin: 0 }}>Pending Work Deliverable Reviews</h2>
              {pendingSubmissions.length > 0 && (
                <span
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.55rem',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {pendingSubmissions.length} Pending
                </span>
              )}
            </div>
            <Link to="/submissions" className="card-action-link">
              <span>View All Submissions</span>
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {pendingSubmissions.length > 0 ? (
              <div className="table-responsive">
                <table className="recent-table">
                  <thead>
                    <tr>
                      <th>Deliverable Task</th>
                      <th>Submitted By</th>
                      <th>Submitted On</th>
                      <th>Deliverables</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingSubmissions.map((sub) => (
                      <tr key={sub._id}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>
                            {sub.task?.title || 'Deliverable'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {sub.workDescription}
                          </div>
                        </td>
                        <td>
                          <div className="employee-cell">
                            {sub.submittedBy?.profileImage ? (
                              <img
                                src={sub.submittedBy.profileImage}
                                alt={sub.submittedBy.fullName}
                                className="employee-avatar-circle"
                                style={{ objectFit: 'cover' }}
                              />
                            ) : (
                              <div className="employee-avatar-circle">
                                {getInitials(sub.submittedBy?.fullName)}
                              </div>
                            )}
                            <div className="employee-info-cell">
                              <span className="employee-name">{sub.submittedBy?.fullName || 'Staff Member'}</span>
                              <span className="employee-email">{sub.submittedBy?.designation || sub.submittedBy?.employeeId}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                            {formatDate(sub.submittedAt)}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {sub.githubUrl && (
                              <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: 4, backgroundColor: 'var(--slate-100)', color: 'var(--slate-700)', fontWeight: 600 }}>
                                GitHub
                              </span>
                            )}
                            {sub.liveUrl && (
                              <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: 4, backgroundColor: 'var(--slate-100)', color: 'var(--slate-700)', fontWeight: 600 }}>
                                Live Demo
                              </span>
                            )}
                            {sub.attachments?.length > 0 && (
                              <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: 4, backgroundColor: 'var(--slate-100)', color: 'var(--slate-700)', fontWeight: 600 }}>
                                {sub.attachments.length} File(s)
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link
                            to={`/submissions/${sub._id}`}
                            className="btn-primary"
                            style={{
                              padding: '0.4rem 0.85rem',
                              fontSize: '0.775rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              textDecoration: 'none',
                            }}
                          >
                            <span>Review</span>
                            <ExternalLink size={13} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '2rem 1.5rem' }}>
                <div className="empty-icon-wrap" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                  <FolderCheck size={24} />
                </div>
                <h3 className="empty-title">All Submissions Reviewed</h3>
                <p className="empty-description">
                  No deliverables currently awaiting supervisor evaluation or sign-off.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* C. Recent Leave Requests */}
        <section className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <h2 className="card-title">
              <CalendarRange size={18} color="var(--primary-600)" />
              <span>Recent Leave Requests</span>
            </h2>
            <Link to="/leaves" className="card-action-link">
              <span>View All Requests</span>
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {recentLeaves.length > 0 ? (
              <div className="table-responsive">
                <table className="recent-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>Duration</th>
                      <th>Period</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentLeaves.map((l) => (
                      <tr key={l._id}>
                        <td>
                          <div className="employee-cell">
                            {l.employee?.profileImage ? (
                              <img
                                src={l.employee.profileImage}
                                alt={l.employee.fullName}
                                className="employee-avatar-circle"
                                style={{ objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="employee-avatar-circle">
                                {getInitials(l.employee?.fullName)}
                              </div>
                            )}
                            <div className="employee-info-cell">
                              <span className="employee-name">{l.employee?.fullName || 'Staff Member'}</span>
                              <span className="employee-email">{l.employee?.department || '—'}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{l.leaveType}</span>
                        </td>
                        <td>
                          <span className="duration-badge">
                            {l.duration || 1} {l.duration === 1 ? 'Day' : 'Days'}
                          </span>
                        </td>
                        <td>
                          {formatDate(l.startDate)} &ndash; {formatDate(l.endDate)}
                        </td>
                        <td>
                          <span className={`status-pill ${getStatusBadgeClass(l.status)}`}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '2.5rem 1.5rem' }}>
                <div className="empty-icon-wrap">
                  <CalendarRange size={24} />
                </div>
                <h3 className="empty-title">No Recent Leave Requests</h3>
                <p className="empty-description">
                  Employee leave requests and time-off applications will automatically appear here.
                </p>
                <Link
                  to="/leaves/add"
                  style={{
                    marginTop: '1rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1.2rem',
                    backgroundColor: 'var(--primary-600)',
                    color: '#ffffff',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  Apply Leave Request
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* D. Admin Confidential Payroll Summary Widget */}
        {isAdmin && data?.salaryOverview && (
          <section className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-header">
              <h2 className="card-title">
                <CreditCard size={18} color="var(--primary-600)" />
                <span>Confidential Payroll Overview</span>
              </h2>
              <Link to="/salary" className="card-action-link" id="admin-dash-salary-link">
                <span>Manage Payroll & Salaries</span>
                <ArrowRight size={14} />
              </Link>
            </div>
            <div className="card-body">
              <div className="salary-kpi-grid" style={{ marginBottom: 0 }}>
                <div className="salary-kpi-card">
                  <div className="kpi-icon-wrap indigo">
                    <IndianRupee size={22} />
                  </div>
                  <div className="kpi-content">
                    <span className="kpi-value">{formatCurrency(data.salaryOverview.totalPayroll)}</span>
                    <span className="kpi-label">Total Payroll</span>
                  </div>
                </div>

                <div className="salary-kpi-card">
                  <div className="kpi-icon-wrap emerald">
                    <UserCheck size={22} />
                  </div>
                  <div className="kpi-content">
                    <span className="kpi-value">{data.salaryOverview.paidEmployees || 0}</span>
                    <span className="kpi-label">Employees Paid</span>
                  </div>
                </div>

                <div className="salary-kpi-card">
                  <div className="kpi-icon-wrap amber">
                    <Clock size={22} />
                  </div>
                  <div className="kpi-content">
                    <span className="kpi-value">{formatCurrency(data.salaryOverview.pendingPayroll)}</span>
                    <span className="kpi-label">Pending Payroll</span>
                  </div>
                </div>

                <div className="salary-kpi-card">
                  <div className="kpi-icon-wrap violet">
                    <TrendingUp size={22} />
                  </div>
                  <div className="kpi-content">
                    <span className="kpi-value">{formatCurrency(data.salaryOverview.averageSalary)}</span>
                    <span className="kpi-label">Average Salary</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Performance Overview Widget */}
      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <TrendingUp size={20} style={{ color: 'var(--primary-600)' }} />
            <span className="card-title">Performance Overview</span>
          </div>
          <Link to="/performance" className="link-action" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--primary-600)', textDecoration: 'none', fontWeight: 600 }}>
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div className="card-body">
          <div className="performance-kpi-grid" style={{ marginBottom: 0 }}>
            <div className="perf-kpi-card blue">
              <div className="perf-kpi-icon"><Users size={20} /></div>
              <div className="perf-kpi-content">
                <div className="perf-kpi-value">{perfStats?.employeesReviewed ?? '—'}</div>
                <div className="perf-kpi-label">Reviewed</div>
              </div>
            </div>
            <div className="perf-kpi-card amber">
              <div className="perf-kpi-icon">⭐</div>
              <div className="perf-kpi-content">
                <div className="perf-kpi-value">{perfStats?.avgRating ? `${perfStats.avgRating}` : '—'}</div>
                <div className="perf-kpi-label">Avg Rating</div>
              </div>
            </div>
            <div className="perf-kpi-card green">
              <div className="perf-kpi-icon">✅</div>
              <div className="perf-kpi-content">
                <div className="perf-kpi-value">{perfStats?.goalsCompleted ?? '—'}</div>
                <div className="perf-kpi-label">Goals Done</div>
              </div>
            </div>
            <div className="perf-kpi-card rose">
              <div className="perf-kpi-icon"><Clock size={20} /></div>
              <div className="perf-kpi-content">
                <div className="perf-kpi-value">{perfStats?.pendingReviews ?? '—'}</div>
                <div className="perf-kpi-label">Pending Reviews</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Documents Widget (Step 21) */}
      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <FileText size={20} style={{ color: 'var(--primary-600)' }} />
            <span className="card-title">Recent Documents</span>
          </div>
          <Link
            to="/documents"
            className="link-action"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--primary-600)', textDecoration: 'none', fontWeight: 600 }}
            id="admin-dash-view-docs"
          >
            View Documents <ArrowRight size={14} />
          </Link>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {recentDocuments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--slate-400)', fontSize: '0.875rem' }}>
              No recent documents uploaded.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--slate-50)', textAlign: 'left', borderBottom: '1px solid var(--slate-200)' }}>
                    <th style={{ padding: '0.75rem 1.25rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-600)' }}>Employee</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-600)' }}>Document</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-600)' }}>Uploaded Date</th>
                    <th style={{ padding: '0.75rem 1.25rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-600)', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocuments.map((doc) => (
                    <tr key={doc._id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                      <td style={{ padding: '0.75rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--slate-900)', fontSize: '0.875rem' }}>
                          {doc.employee?.fullName || '—'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                          {doc.employee?.employeeId} • {doc.employee?.department || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--slate-800)', fontSize: '0.85rem' }}>
                          {doc.title}
                        </div>
                        <span style={{ fontSize: '0.725rem', color: 'var(--primary-700)', background: '#eef2ff', padding: '0.15rem 0.45rem', borderRadius: 4, fontWeight: 600 }}>
                          {doc.documentType}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.825rem', color: 'var(--slate-600)' }}>
                        {formatDate(doc.createdAt)}
                      </td>
                      <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>
                        <Link
                          to={`/documents/${doc._id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '0.375rem',
                            background: '#eef2ff',
                            color: 'var(--primary-600)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          <span>View</span>
                          <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Recent Announcements Widget (Step 22) */}
      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <Megaphone size={20} style={{ color: 'var(--primary-600)' }} />
            <span className="card-title">Recent Announcements</span>
          </div>
          <Link
            to="/announcements"
            className="link-action"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--primary-600)', textDecoration: 'none', fontWeight: 600 }}
            id="admin-dash-view-announcements"
          >
            Manage Announcements <ArrowRight size={14} />
          </Link>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {recentAnnouncements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--slate-400)', fontSize: '0.875rem' }}>
              No announcements created yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--slate-50)', textAlign: 'left', borderBottom: '1px solid var(--slate-200)' }}>
                    <th style={{ padding: '0.75rem 1.25rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-600)' }}>Announcement</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-600)' }}>Priority</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-600)' }}>Audience</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-600)' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-600)' }}>Published Date</th>
                    <th style={{ padding: '0.75rem 1.25rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-600)', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAnnouncements.map((ann) => (
                    <tr key={ann._id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                      <td style={{ padding: '0.75rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--slate-900)', fontSize: '0.875rem' }}>
                          {ann.title}
                        </div>
                        <span className={`category-pill category-${ann.category?.toLowerCase() || 'general'}`} style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', marginTop: '0.2rem', display: 'inline-block' }}>
                          {ann.category}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`priority-badge priority-${ann.priority?.toLowerCase() || 'medium'}`} style={{ fontSize: '0.725rem' }}>
                          {ann.priority}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`audience-badge audience-${ann.audience?.toLowerCase() || 'all'}`} style={{ fontSize: '0.725rem' }}>
                          {ann.audience === 'Department' ? (ann.department?.name || 'Dept') : ann.audience}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`status-badge status-${ann.status?.toLowerCase() || 'draft'}`} style={{ fontSize: '0.725rem' }}>
                          {ann.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.825rem', color: 'var(--slate-600)' }}>
                        {formatDate(ann.publishDate || ann.createdAt)}
                      </td>
                      <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>
                        <Link
                          to={`/announcements/${ann._id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '0.375rem',
                            background: '#eef2ff',
                            color: 'var(--primary-600)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          <span>View</span>
                          <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
