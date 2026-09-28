import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  CalendarRange,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Clock3,
  CalendarCheck,
  LogIn,
  LogOut,
  Timer
} from 'lucide-react';
import attendanceService from '../services/attendanceService.js';
import Loader from '../components/common/Loader.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useUrlFilters } from '../hooks/useUrlFilters.js';
import { AdvancedFilters, FilterSelect } from '../components/common/AdvancedFilters.jsx';
import '../styles/dashboard.css';
import '../styles/leaves.css';

// Calculate live working elapsed time from checkIn timestamp
const calculateElapsed = (checkInDate) => {
  if (!checkInDate) return null;
  const start = new Date(checkInDate).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - start);
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
};

export const MyAttendancePage = () => {
  const { showSuccess, showError } = useToast();

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Today's attendance & live timer state
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [elapsed, setElapsed] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Default month: Current Year-Month (e.g. "2026-09")
  const currentYearMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const { filters, setFilter, clearFilters, activeCount } = useUrlFilters({
    month: currentYearMonth(),
    status: 'All',
    page: '1',
  });

  const { month: selectedMonth, status: selectedStatus } = filters;
  const page = parseInt(filters.page, 10) || 1;

  const fetchTodayAttendance = async () => {
    try {
      const res = await attendanceService.getTodayAttendance();
      if (res.success) {
        setTodayAttendance(res.attendance || null);
      }
    } catch {
      // silent fallback
    }
  };

  const fetchAttendanceData = useCallback(async () => {
    setLoading(true);
    try {
      const [historyRes, summaryRes] = await Promise.allSettled([
        attendanceService.getMyAttendance({
          page,
          limit: 10,
          month: selectedMonth,
          status: selectedStatus,
        }),
        attendanceService.getAttendanceSummary({
          month: selectedMonth,
        }),
      ]);

      if (historyRes.status === 'fulfilled' && historyRes.value.success) {
        setRecords(historyRes.value.attendance || []);
        setTotalPages(historyRes.value.totalPages || 1);
        setTotalCount(historyRes.value.count || 0);
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value.success) {
        setSummary(summaryRes.value.summary);
      }
    } catch {
      showError('Failed to retrieve your attendance records');
    } finally {
      setLoading(false);
    }
  }, [page, selectedMonth, selectedStatus, showError]);

  useEffect(() => {
    fetchTodayAttendance();
  }, []);

  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  // Live timer interval: ticks every 1 second when checked in but not checked out
  useEffect(() => {
    let timer;
    if (todayAttendance?.checkIn && !todayAttendance?.checkOut) {
      setElapsed(calculateElapsed(todayAttendance.checkIn));
      timer = setInterval(() => {
        setElapsed(calculateElapsed(todayAttendance.checkIn));
      }, 1000);
    } else {
      setElapsed(null);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [todayAttendance]);

  // Handle Check-in
  const handleCheckIn = async () => {
    if (actionLoading) return;
    setActionLoading(true);

    try {
      const res = await attendanceService.checkIn();
      if (res.success) {
        setTodayAttendance(res.attendance);
        showSuccess(res.message || 'Checked in successfully! Have a productive day.');
        fetchAttendanceData();
      } else {
        showError(res.message || 'Check-in failed');
      }
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Already checked in today or request failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Check-out
  const handleCheckOut = async () => {
    if (actionLoading) return;
    setActionLoading(true);

    try {
      const res = await attendanceService.checkOut();
      if (res.success) {
        setTodayAttendance(res.attendance);
        showSuccess(res.message || 'Checked out successfully! Work day recorded.');
        fetchAttendanceData();
      } else {
        showError(res.message || 'Check-out failed');
      }
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Failed to complete check out');
    } finally {
      setActionLoading(false);
    }
  };

  const formatRecordDate = (dateStr) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatRecordTime = (timeStr) => {
    if (!timeStr) return '--:--';
    const d = new Date(timeStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatHours = (hours) => {
    if (!hours && hours !== 0) return '00h 00m';
    const mins = Math.round(hours * 60);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Present':
        return (
          <span className="badge badge-approved" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <CheckCircle2 size={12} /> Present
          </span>
        );
      case 'Late':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: '#fff7ed',
              color: '#c2410c',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: '1px solid #ffedd5',
            }}
          >
            <AlertTriangle size={12} /> Late
          </span>
        );
      case 'Half Day':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: '#fef3c7',
              color: '#b45309',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: '1px solid #fde68a',
            }}
          >
            <Clock3 size={12} /> Half Day
          </span>
        );
      case 'On Leave':
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: '#eff6ff',
              color: '#1d4ed8',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: '1px solid #dbeafe',
            }}
          >
            <CalendarRange size={12} /> On Leave
          </span>
        );
      default:
        return (
          <span className="badge badge-pending" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            {status}
          </span>
        );
    }
  };

  const isWorking = todayAttendance?.checkIn && !todayAttendance?.checkOut;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Navigation Breadcrumb & Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <Link
          to="/employee/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            color: 'var(--slate-500)',
            textDecoration: 'none',
            marginBottom: '0.75rem',
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0 }}>
              My Attendance
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--slate-500)', margin: '0.35rem 0 0' }}>
              Record your daily work shifts, track live working hours, and view historical attendance logs.
            </p>
          </div>

          <button
            onClick={() => {
              fetchTodayAttendance();
              fetchAttendanceData();
            }}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            title="Refresh attendance records"
          >
            <RotateCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Today's Shift Card with Live Timer & Check-in / Check-out */}
      <div
        style={{
          background: 'white',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--slate-200)',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Calendar size={16} color="var(--primary-600)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Today's Work Shift
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--slate-400)' }}>•</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--slate-700)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>Status:</span>
              {isWorking ? (
                <span className="status-badge status-working" style={{ fontSize: '0.85rem' }}>
                  <span className="live-indicator"></span> Working Live
                </span>
              ) : todayAttendance?.checkOut ? (
                <span className="status-badge status-present" style={{ fontSize: '0.85rem' }}>
                  <CheckCircle2 size={13} /> Completed ({todayAttendance.status})
                </span>
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--slate-400)', fontWeight: 500 }}>
                  Not Checked In
                </span>
              )}
            </div>

            {todayAttendance?.checkIn && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem', color: 'var(--slate-600)' }}>
                <Clock size={15} color="var(--slate-400)" />
                <span>In: <strong>{formatRecordTime(todayAttendance.checkIn)}</strong></span>
                {todayAttendance.checkOut && (
                  <span>• Out: <strong>{formatRecordTime(todayAttendance.checkOut)}</strong></span>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          {isWorking && elapsed && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
              title="Elapsed shift duration"
            >
              <Timer size={18} className="live-indicator" />
              <span>{elapsed}</span>
            </div>
          )}

          {!todayAttendance ? (
            <button
              id="attendance-checkin-btn"
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: actionLoading ? 'not-allowed' : 'pointer',
              }}
            >
              <LogIn size={16} />
              <span>{actionLoading ? 'Checking in...' : 'Check In'}</span>
            </button>
          ) : !todayAttendance.checkOut ? (
            <button
              id="attendance-checkout-btn"
              onClick={handleCheckOut}
              disabled={actionLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'white',
                backgroundColor: '#dc2626',
                border: '1px solid #b91c1c',
                borderRadius: 'var(--radius-md)',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <LogOut size={16} />
              <span>{actionLoading ? 'Checking out...' : 'Check Out'}</span>
            </button>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#059669',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              <CheckCircle2 size={16} />
              <span>Shift Completed: {formatHours(todayAttendance.totalHours)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Working Days</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)' }}>
              <CalendarCheck size={20} />
            </div>
          </div>
          <div className="stat-card-value">{summary?.totalWorkingDays ?? 0} Days</div>
          <p className="stat-card-subtitle">Recorded in selected period</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Present Days</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#059669' }}>
            {summary?.presentDays ?? 0}
          </div>
          <p className="stat-card-subtitle">On-time shifts</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Days Late</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#fff7ed', color: '#ea580c' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: (summary?.lateDays || 0) > 0 ? '#ea580c' : 'inherit' }}>
            {summary?.lateDays ?? 0}
          </div>
          <p className="stat-card-subtitle">Checked in after scheduled start</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Avg Daily Hours</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#16a34a' }}>
            {summary?.averageWorkingHours ? `${summary.averageWorkingHours}h` : '0h'}
          </div>
          <p className="stat-card-subtitle">
            Total: {summary?.totalWorkingHours ?? 0}h logged
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <AdvancedFilters onClear={clearFilters} activeCount={activeCount}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', gridColumn: 'span 1' }}>
          <Calendar size={16} color="var(--slate-500)" />
          <input
            id="month-selector"
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              setFilter('month', e.target.value);
              setFilter('page', '1');
            }}
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--slate-200)',
              fontSize: '0.85rem',
              color: 'var(--slate-800)',
              backgroundColor: 'var(--slate-50)',
              width: '100%'
            }}
          />
        </div>

        <FilterSelect
          label="Status"
          value={selectedStatus}
          onChange={(val) => {
            setFilter('status', val);
            setFilter('page', '1');
          }}
          options={[
            { label: 'Present', value: 'Present' },
            { label: 'Late', value: 'Late' },
            { label: 'Half Day', value: 'Half Day' },
            { label: 'On Leave', value: 'On Leave' }
          ]}
        />
      </AdvancedFilters>

      {/* Table Container */}
      <div
        className="chart-card"
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--slate-200)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {loading ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Loader message="Loading attendance records..." />
          </div>
        ) : records.length > 0 ? (
          <>
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
                    <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Date
                    </th>
                    <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Check In
                    </th>
                    <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Check Out
                    </th>
                    <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Working Hours
                    </th>
                    <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Status
                    </th>
                    <th style={{ padding: '0.85rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr
                      key={record._id}
                      style={{
                        borderBottom: '1px solid var(--slate-100)',
                        transition: 'background var(--transition-fast)',
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate-800)' }}>
                        {formatRecordDate(record.date)}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--slate-700)' }}>
                        {formatRecordTime(record.checkIn)}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--slate-700)' }}>
                        {record.checkOut ? formatRecordTime(record.checkOut) : <span style={{ color: '#059669', fontWeight: 600 }}>Active</span>}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', fontWeight: 700, color: record.totalHours > 0 ? 'var(--slate-900)' : 'var(--slate-400)' }}>
                        {record.totalHours > 0 ? formatHours(record.totalHours) : '--'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {getStatusBadge(record.status)}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                        {record.notes || 'Standard shift'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.5rem',
                borderTop: '1px solid var(--slate-100)',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
                Showing page {page} of {totalPages} ({totalCount} {totalCount === 1 ? 'record' : 'records'})
              </span>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setFilter('page', String(Math.max(page - 1, 1)))}
                  disabled={page <= 1}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <button
                  onClick={() => setFilter('page', String(Math.min(page + 1, totalPages)))}
                  disabled={page >= totalPages}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--slate-500)' }}>
            <Calendar size={40} color="var(--slate-300)" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-800)', margin: '0 0 0.35rem' }}>
              No Attendance Records Found
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', margin: '0 0 1rem' }}>
              No check-in entries match your selected month ({selectedMonth}) and status filter.
            </p>
            <button
              onClick={clearFilters}
              className="btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAttendancePage;
