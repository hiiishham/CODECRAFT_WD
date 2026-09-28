import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { submissionService } from '../services/submissionService.js';
import { departmentService } from '../services/departmentService.js';
import { employeeService } from '../services/employeeService.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/submissions.css';
import '../styles/tasks.css';

export const AdminSubmissionsPage = () => {
  const { user } = useAuth();
  const { showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pendingReview: 0,
    approved: 0,
    changesRequested: 0,
  });

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Filter & Pagination state
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedEmp, setSelectedEmp] = useState('All');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Load dropdown resources
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [deptRes, empRes] = await Promise.all([
          departmentService.getDepartments({ limit: 100 }),
          employeeService.getEmployees({ limit: 200 }),
        ]);
        if (deptRes.success) setDepartments(deptRes.departments || []);
        if (empRes.success) {
          const allEmps = empRes.employees || [];
          if (user?.role === 'manager' && user?.department) {
            setEmployees(allEmps.filter((e) => e.department?.toLowerCase() === user.department.toLowerCase()));
          } else {
            setEmployees(allEmps);
          }
        }
      } catch (err) {
        console.error('Failed to load filter dropdowns:', err);
      }
    };
    loadDropdownData();
  }, [user]);

  const fetchSubmissionsData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await submissionService.getSubmissions({
        search,
        status: selectedStatus,
        department: selectedDept,
        employee: selectedEmp,
        page,
        limit,
      });

      if (res.success) {
        setSubmissions(res.submissions || []);
        setTotalPages(res.totalPages || 1);
        setTotalRecords(res.totalRecords || 0);
        if (res.stats) setStats(res.stats);
      } else {
        showError(res.message || 'Failed to load submissions');
      }
    } catch (err) {
      showError(err.message || 'Error fetching submissions');
    } finally {
      setLoading(false);
    }
  }, [search, selectedStatus, selectedDept, selectedEmp, page, limit, showError]);

  useEffect(() => {
    fetchSubmissionsData();
  }, [fetchSubmissionsData]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending Review':
        return (
          <span className="badge-sub-status badge-sub-pending">
            🟡 Pending Review
          </span>
        );
      case 'Approved':
        return (
          <span className="badge-sub-status badge-sub-approved">
            🟢 Approved
          </span>
        );
      case 'Changes Requested':
        return (
          <span className="badge-sub-status badge-sub-changes">
            🔴 Changes Requested
          </span>
        );
      default:
        return <span className="badge-sub-status">{status}</span>;
    }
  };

  return (
    <div className="task-page animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileCheck size={26} color="var(--primary-600)" />
            <span>Work Submissions Review</span>
          </h1>
          <p className="dashboard-subtitle">
            Inspect completed employee task deliverables, audit repositories, and approve or request revisions.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={fetchSubmissionsData}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 0.85rem' }}
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 1. Statistics Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Submissions</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)' }}>
              <Layers size={20} />
            </div>
          </div>
          <div className="stat-card-value">{stats.total}</div>
          <p className="stat-card-subtitle">All deliverable submissions</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Pending Review</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#b45309' }}>{stats.pendingReview}</div>
          <p className="stat-card-subtitle">Awaiting evaluation</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Approved</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#15803d' }}>{stats.approved}</div>
          <p className="stat-card-subtitle">Accepted deliverables</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Changes Requested</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: stats.changesRequested > 0 ? '#b91c1c' : 'inherit' }}>
            {stats.changesRequested}
          </div>
          <p className="stat-card-subtitle">Feedback returned to staff</p>
        </div>
      </div>

      {/* 2. Controls & Filters Bar */}
      <div className="task-controls-bar">
        <div className="task-search-box">
          <Search className="task-search-icon" size={16} />
          <input
            type="text"
            className="task-search-input"
            placeholder="Search by employee name or task title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="task-filters-group">
          {/* Status Filter */}
          <select
            className="task-select"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Pending Review">Pending Review</option>
            <option value="Approved">Approved</option>
            <option value="Changes Requested">Changes Requested</option>
          </select>

          {/* Department Filter */}
          {user?.role === 'admin' ? (
            <select
              className="task-select"
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setPage(1);
              }}
            >
              <option value="All">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          ) : (
            <div
              className="task-select"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'var(--slate-100)',
                color: 'var(--slate-700)',
                fontWeight: 600,
                fontSize: '0.85rem',
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-md)',
              }}
            >
              Dept: {user?.department || 'My Team'}
            </div>
          )}

          {/* Employee Filter */}
          <select
            className="task-select"
            value={selectedEmp}
            onChange={(e) => {
              setSelectedEmp(e.target.value);
              setPage(1);
            }}
          >
            <option value="All">All Employees</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.fullName} ({emp.employeeId})
              </option>
            ))}
          </select>

          {/* Page Size */}
          <select
            className="task-select"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>

      {/* 3. Submissions Table */}
      {loading ? (
        <Loader message="Loading work submissions..." />
      ) : submissions.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3.5rem 1rem',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            border: '1px dashed var(--slate-300)',
          }}
        >
          <FileCheck size={40} color="var(--slate-400)" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)', margin: '0 0 0.35rem' }}>
            No submissions found
          </h3>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem', margin: 0 }}>
            {search || selectedStatus !== 'All' || selectedDept !== 'All'
              ? 'No submissions match your selected filters. Try resetting filters.'
              : 'Work submissions from employees will appear here once tasks are completed.'}
          </p>
        </div>
      ) : (
        <>
          <div className="submission-table-wrapper">
            <table className="submission-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Task Deliverable</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Reviewed By</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub._id}>
                    {/* Employee Profile */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary-100)',
                            color: 'var(--primary-700)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            overflow: 'hidden',
                          }}
                        >
                          {sub.employee?.profileImage ? (
                            <img
                              src={sub.employee.profileImage}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            sub.employee?.fullName?.charAt(0) || 'E'
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: '0.85rem' }}>
                            {sub.employee?.fullName || 'Staff Member'}
                          </div>
                          <div style={{ fontSize: '0.725rem', color: 'var(--slate-500)' }}>
                            {sub.employee?.department} • {sub.employee?.employeeId}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Task Title */}
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>
                        <Link
                          to={`/submissions/${sub._id}`}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                          onMouseOver={(e) => (e.target.style.color = 'var(--primary-600)')}
                          onMouseOut={(e) => (e.target.style.color = 'inherit')}
                        >
                          {sub.task?.title || 'Deliverable'}
                        </Link>
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--slate-400)' }}>
                        Priority: {sub.task?.priority || 'Medium'}
                      </div>
                    </td>

                    {/* Submitted Date */}
                    <td>
                      <span style={{ fontSize: '0.825rem', color: 'var(--slate-700)' }}>
                        {formatDate(sub.submittedAt || sub.createdAt)}
                      </span>
                    </td>

                    {/* Status */}
                    <td>{getStatusBadge(sub.status)}</td>

                    {/* Reviewed By */}
                    <td>
                      <span style={{ fontSize: '0.825rem', color: 'var(--slate-700)', fontWeight: sub.reviewedBy ? 600 : 400 }}>
                        {sub.reviewedBy?.name || '—'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/submissions/${sub._id}`}
                        className={sub.status === 'Pending Review' ? 'btn-primary' : 'btn-secondary'}
                        style={{
                          padding: '0.4rem 0.85rem',
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <Eye size={14} />
                        <span>{sub.status === 'Pending Review' ? 'Review' : 'View'}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              padding: '0.5rem 0',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalRecords)} of {totalRecords} submissions
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)', padding: '0 0.5rem' }}>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                className="btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminSubmissionsPage;
