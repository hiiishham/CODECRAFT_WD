import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  RotateCw,
  FolderMinus,
  Users,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import salaryService from '../services/salaryService.js';
import departmentService from '../services/departmentService.js';
import { useToast } from '../context/ToastContext.jsx';
import DeleteModal from '../components/common/DeleteModal.jsx';
import Loader from '../components/common/Loader.jsx';
import { formatCurrency, CURRENCY_CONFIG } from '../utils/currency.js';
import '../styles/salary.css';
import '../styles/employees.css';
import '../styles/dashboard.css';

const SORT_OPTIONS = [
  { value: '', label: 'Default (Newest)' },
  { value: 'salary_asc', label: 'Salary: Low → High' },
  { value: 'salary_desc', label: 'Salary: High → Low' },
  { value: 'name_asc', label: 'Employee Name: A → Z' },
  { value: 'name_desc', label: 'Employee Name: Z → A' },
  { value: 'effective_newest', label: 'Newest Effective Date' },
  { value: 'effective_oldest', label: 'Oldest Effective Date' },
];

export const SalaryListPage = () => {
  const { showSuccess, showError } = useToast();

  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Stats
  const [stats, setStats] = useState(null);

  // Search, Filter, Sort & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [sortBy, setSortBy] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Departments for dynamic filter
  const [departments, setDepartments] = useState([]);

  const searchTimerRef = useRef(null);

  // Load departments dynamically
  useEffect(() => {
    const loadDepts = async () => {
      try {
        const res = await departmentService.getDepartments({ status: 'Active' });
        if (res.success && res.departments) {
          setDepartments(res.departments);
        }
      } catch {
        /* Non-critical department load failure */
      }
    };
    loadDepts();
  }, []);

  // Status and period filter
  const [statusFilter, setStatusFilter] = useState('All');

  // Search debounce
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(searchTimerRef.current);
  }, [search]);

  // Fetch salary records + stats
  const fetchSalaries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, statsRes] = await Promise.all([
        salaryService.getSalaries({
          page: currentPage,
          limit,
          search: debouncedSearch,
          department,
          status: statusFilter,
          sort: sortBy,
        }),
        salaryService.getStats(),
      ]);

      if (listRes.success) {
        setSalaries(listRes.salaries || []);
        setTotalPages(listRes.totalPages || 1);
        setTotalRecords(listRes.totalRecords || 0);
      }
      if (statsRes.success) {
        setStats(statsRes.stats);
      }
    } catch (err) {
      setError(err.message || 'Failed to load salary records');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, department, statusFilter, sortBy]);

  useEffect(() => {
    fetchSalaries();
  }, [fetchSalaries]);

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.status && deleteTarget.status !== 'Draft') {
      showError('Only Draft salary records can be deleted. Processed or Paid records are locked for audit integrity.');
      setDeleteTarget(null);
      return;
    }
    setIsDeleting(true);
    try {
      const res = await salaryService.deleteSalary(deleteTarget._id);
      if (res.success) {
        showSuccess('Draft salary record deleted successfully');
        setDeleteTarget(null);
        fetchSalaries();
      }
    } catch (err) {
      showError(err.message || 'Failed to delete salary record');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setDepartment('All');
    setStatusFilter('All');
    setSortBy('');
    setCurrentPage(1);
  };

  const hasFilters = debouncedSearch || department !== 'All' || statusFilter !== 'All' || sortBy;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
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

  const startRecord = totalRecords > 0 ? (currentPage - 1) * limit + 1 : 0;
  const endRecord = Math.min(currentPage * limit, totalRecords);

  if (loading && salaries.length === 0) {
    return <Loader message="Loading salary records..." fullScreen={false} />;
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="employee-header-bar">
        <div className="employee-title-group">
          <h1>Salary Management</h1>
          <p>Manage employee salary information.</p>
        </div>
        <Link to="/salary/add" className="btn-primary" id="add-salary-btn">
          <Plus size={18} />
          Add Salary Record
        </Link>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="error-alert-box" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
          <button className="retry-btn" onClick={fetchSalaries}>
            <RotateCw size={14} style={{ marginRight: '0.35rem' }} />
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards: Total Payroll, Employees Paid, Pending Payroll, Average Salary */}
      <section className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Payroll</span>
            <span className="stat-value" style={{ fontSize: '1.35rem' }}>
              {stats ? formatCurrency(stats.totalPayroll) : `${CURRENCY_CONFIG.symbol}0`}
            </span>
            <span className="stat-helper">Total net disbursement</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-primary">
            <IndianRupee size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Employees Paid</span>
            <span className="stat-value">
              {stats ? stats.paidEmployees ?? 0 : '0'}
            </span>
            <span className="stat-helper">Salaries marked as Paid</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-success">
            <Users size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Pending Payroll</span>
            <span className="stat-value" style={{ fontSize: '1.35rem' }}>
              {stats ? formatCurrency(stats.pendingPayroll) : `${CURRENCY_CONFIG.symbol}0`}
            </span>
            <span className="stat-helper">Draft & processed payout</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-warning">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Average Salary</span>
            <span className="stat-value" style={{ fontSize: '1.35rem' }}>
              {stats ? formatCurrency(stats.averageSalary) : `${CURRENCY_CONFIG.symbol}0`}
            </span>
            <span className="stat-helper">Mean net compensation</span>
          </div>
          <div className="stat-icon-wrapper stat-icon-primary" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <TrendingUp size={24} />
          </div>
        </div>
      </section>

      {/* Search, Filters, Sorting & Reset */}
      <div className="salary-controls-bar">
        <div className="salary-search-box">
          <Search size={16} className="salary-search-icon" />
          <input
            type="text"
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="salary-search-input"
            aria-label="Search employee by name or ID"
            id="salary-search-input"
          />
        </div>

        <div className="salary-filters-group">
          <select
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setCurrentPage(1);
            }}
            className="sort-select"
            aria-label="Filter by department"
            id="salary-dept-filter"
          >
            <option value="All">All Departments</option>
            {departments.map((d) => (
              <option key={d._id || d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="sort-select"
            aria-label="Filter by payroll status"
            id="salary-status-filter"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Processed">Processed</option>
            <option value="Paid">Paid</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            className="sort-select"
            aria-label="Sort salary records"
            id="salary-sort-select"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={handleClearFilters}
              className="btn-secondary"
              style={{ padding: '0.5rem 0.85rem' }}
              title="Clear all filters"
            >
              <RotateCcw size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Responsive Table */}
      {salaries.length > 0 ? (
        <>
          <div className="table-responsive salary-table-wrap">
            <table className="recent-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee ID</th>
                  <th>Department</th>
                  <th>Pay Period</th>
                  <th>Basic Salary</th>
                  <th>Allowances</th>
                  <th>Deductions</th>
                  <th>Net Salary</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((s) => {
                  const allowTotal = Array.isArray(s.allowances)
                    ? s.allowances.reduce((acc, a) => acc + (Number(a.amount) || 0), 0)
                    : Number(s.allowances) || 0;

                  const deductTotal = Array.isArray(s.deductions)
                    ? s.deductions.reduce((acc, d) => acc + (Number(d.amount) || 0), 0)
                    : Number(s.deductions) || 0;

                  const isDraft = !s.status || s.status === 'Draft';

                  return (
                    <tr key={s._id}>
                      <td>
                        <div className="employee-cell">
                          <div className="employee-avatar-circle">
                            {getInitials(s.employee?.fullName)}
                          </div>
                          <div className="employee-info-cell">
                            <span className="employee-name">{s.employee?.fullName || 'Unknown Employee'}</span>
                            <span className="employee-email">{s.employee?.email || '—'}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="id-badge">{s.employee?.employeeId || '—'}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{s.employee?.department || '—'}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>
                          {s.payMonth ? `${s.payMonth.toString().padStart(2, '0')}/${s.payYear}` : formatDate(s.effectiveFrom)}
                        </span>
                      </td>
                      <td>
                        <span className="currency-value">{formatCurrency(s.basicSalary)}</span>
                      </td>
                      <td>
                        <span className="currency-value">{formatCurrency(allowTotal)}</span>
                      </td>
                      <td>
                        <span className="currency-value" style={{ color: deductTotal > 0 ? 'var(--danger-text)' : undefined }}>
                          {formatCurrency(deductTotal)}
                        </span>
                      </td>
                      <td>
                        <span className="currency-value highlight">{formatCurrency(s.netSalary)}</span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            s.status === 'Paid'
                              ? 'badge-success'
                              : s.status === 'Processed'
                              ? 'badge-primary'
                              : 'badge-warning'
                          }`}
                        >
                          {s.status || 'Draft'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          <Link
                            to={`/salary/${s._id}`}
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem' }}
                            title="View Salary Details"
                          >
                            <Eye size={14} />
                          </Link>
                          <Link
                            to={`/salary/${s._id}/edit`}
                            className="btn-secondary"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem' }}
                            title="Edit Salary Record"
                          >
                            <Pencil size={14} />
                          </Link>
                          <button
                            className="btn-danger"
                            style={{
                              padding: '0.35rem 0.55rem',
                              fontSize: '0.8rem',
                              opacity: isDraft ? 1 : 0.45,
                              cursor: isDraft ? 'pointer' : 'not-allowed',
                            }}
                            onClick={() => {
                              if (!isDraft) {
                                showError('Cannot delete Paid or Processed salary records. Only Draft records can be deleted.');
                                return;
                              }
                              setDeleteTarget(s);
                            }}
                            title={isDraft ? 'Delete Draft Record' : 'Protected: Only Draft records can be deleted'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Backend Pagination */}
          <div className="salary-pagination-bar">
            <span className="salary-pagination-info">
              Showing {startRecord}–{endRecord} of {totalRecords} records
            </span>
            <div className="salary-pagination-buttons">
              <button
                className="btn-secondary"
                style={{ padding: '0.4rem 0.65rem' }}
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={currentPage === pageNum ? 'btn-primary' : 'btn-secondary'}
                    style={{ padding: '0.4rem 0.75rem', minWidth: '36px' }}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                className="btn-secondary"
                style={{ padding: '0.4rem 0.65rem' }}
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div style={{ background: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)' }}>
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <FolderMinus size={24} />
            </div>
            <h3 className="empty-title">
              {hasFilters ? 'No Matching Salary Records' : 'No Salary Records'}
            </h3>
            <p className="empty-description">
              {hasFilters
                ? 'Try adjusting your search criteria or resetting filters.'
                : 'Get started by creating the first employee salary record.'}
            </p>
            {!hasFilters && (
              <Link to="/salary/add" className="btn-primary" style={{ marginTop: '1rem' }}>
                <Plus size={16} /> Add Salary Record
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <DeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Salary Record?"
        message="Are you sure you want to delete this salary record? This action cannot be undone."
        itemName={deleteTarget?.employee?.fullName || 'Selected Employee'}
        itemLabel="Employee"
        confirmText="Delete Record"
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default SalaryListPage;
