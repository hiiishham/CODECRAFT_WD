import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  CalendarRange,
  CalendarCheck,
  CalendarX,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Bell,
  User,
  ListTodo,
  Loader2,
  Calendar,
  LogOut,
  Building2,
  Briefcase,
  IdCard,
  FolderCheck,
  CreditCard,
  IndianRupee,
  FileText,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import attendanceService from '../services/attendanceService.js';
import notificationService from '../services/notificationService.js';
import taskService from '../services/taskService.js';
import { submissionService } from '../services/submissionService.js';
import leaveService from '../services/leaveService.js';
import salaryService from '../services/salaryService.js';
import { performanceService } from '../services/performanceService.js';
import { goalService } from '../services/goalService.js';
import documentService from '../services/documentService.js';
import announcementService from '../services/announcementService.js';
import { employeeDashboardService } from '../services/employeeDashboardService.js';
import { formatTimeAgo } from '../utils/timeAgo.js';
import '../styles/dashboard.css';
import '../styles/leaves.css';
import '../styles/tasks.css';
import '../styles/performance.css';

export const EmployeeDashboardPage = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [todayAttendance, setTodayAttendance] = useState(null);
  const [summary, setSummary] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [latestSalary, setLatestSalary] = useState(null);
  const [perfSummary, setPerfSummary] = useState(null);
  const [myGoals, setMyGoals] = useState([]);
  const [myRecentDocs, setMyRecentDocs] = useState([]);
  const [latestAnnouncements, setLatestAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [elapsed, setElapsed] = useState(null);

  // Dynamic greeting based on current local hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Format timestamp e.g. "09:04 AM"
  const formatTime = (dateStr) => {
    if (!dateStr) return '--:--';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format completed total hours e.g. "08h 58m"
  const formatHoursDuration = (totalHours) => {
    if (!totalHours && totalHours !== 0) return '00h 00m';
    const totalMinutes = Math.round(totalHours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  };

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

  // Fetch initial dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const res = await employeeDashboardService.getStats();
      if (res.success && res.data) {
        const d = res.data;
        setTodayAttendance(d.attendance?.today || null);
        setSummary({
          totalPresent: d.attendance?.monthly?.present || 0,
          totalAbsent: d.attendance?.monthly?.absent || 0,
          totalLate: d.attendance?.monthly?.late || 0,
          totalLeave: d.attendance?.monthly?.leave || 0
        });
        setUpcomingTasks(d.tasks?.upcoming || []);
        setLeaveBalance(d.leave?.usedSummary || null);
        setRecentLeaves(d.leave?.pending || []);
        setLatestSalary(d.salary || null);
        setPerfSummary(d.performance || null);
        setMyGoals(d.goals || []);
        setNotifications(d.notifications || []);
        setLatestAnnouncements(d.announcements || []);
      }
    } catch {
      showError('Unable to load some employee dashboard information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

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
        // Refresh summary counts
        const summaryRes = await attendanceService.getAttendanceSummary();
        if (summaryRes.success) setSummary(summaryRes.summary);
      } else {
        showError(res.message || 'Check-in failed');
      }
    } catch (err) {
      showError(err.message || 'Already checked in today or request failed');
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
        // Refresh summary counts
        const summaryRes = await attendanceService.getAttendanceSummary();
        if (summaryRes.success) setSummary(summaryRes.summary);
      } else {
        showError(res.message || 'Check-out failed');
      }
    } catch (err) {
      showError(err.message || 'Failed to complete check out');
    } finally {
      setActionLoading(false);
    }
  };

  const todayFormattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const isCheckedIn = !!todayAttendance?.checkIn;
  const isCheckedOut = !!todayAttendance?.checkOut;

  return (
    <div className="dashboard-page animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* 1. Header Banner */}
      <div className="dashboard-header" style={{ marginBottom: '1.75rem' }}>
        <div className="dashboard-header-text">
          <span className="dashboard-date-label">
            {todayFormattedDate}
          </span>
          <h1
            className="dashboard-heading"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', margin: 0 }}
          >
            <span>
              {getGreeting()}, {user?.name || 'Staff Member'}
            </span>
            <span role="img" aria-label="wave">
              👋
            </span>
          </h1>
          <p className="dashboard-subheading">
            Here's your work overview for today.
          </p>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link
            to="/employee/salary"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            id="emp-dash-salary-btn"
          >
            <CreditCard size={16} />
            <span>My Salary</span>
          </Link>
          <Link
            to="/employee/attendance"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Clock size={16} />
            <span>Attendance History</span>
          </Link>
        </div>
      </div>

      {/* 2. Employee Profile Mini Ribbon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1rem 1.25rem',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--slate-200)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--primary-100)',
              color: 'var(--primary-700)',
              fontWeight: 700,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user?.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              getInitials(user?.name)
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--slate-900)' }}>
              {user?.name || 'Employee'}
            </div>
            <div
              style={{
                fontSize: '0.775rem',
                color: 'var(--slate-500)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <IdCard size={13} color="var(--slate-400)" />
                {user?.employeeId || 'EMP-100'}
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Building2 size={13} color="var(--slate-400)" />
                {user?.department || 'General'}
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <Briefcase size={13} color="var(--slate-400)" />
                {user?.designation || 'Staff Member'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: '#ecfdf5',
              color: '#065f46',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: '1px solid #a7f3d0',
            }}
          >
            <ShieldCheck size={14} />
            Verified Active Employee
          </span>
        </div>
      </div>

      {/* 3. Large Prominent Today's Attendance Card */}
      <div
        className="chart-card"
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--slate-200)',
          boxShadow: 'var(--shadow-sm)',
          padding: '1.75rem',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: isCheckedOut
              ? 'linear-gradient(90deg, #10b981, #059669)'
              : isCheckedIn
              ? 'linear-gradient(90deg, var(--primary-500), #0284c7)'
              : 'linear-gradient(90deg, #f59e0b, #d97706)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--slate-400)',
              }}
            >
              Today's Attendance
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-900)', margin: '0.2rem 0 0' }}>
              {isCheckedOut
                ? 'Work Day Completed'
                : isCheckedIn
                ? 'Currently on Duty'
                : 'Not Checked In Yet'}
            </h2>
          </div>

          <div>
            {isCheckedOut ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid #a7f3d0',
                }}
              >
                <CheckCircle2 size={16} />
                Shift Completed
              </span>
            ) : isCheckedIn ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#f0fdf4',
                  color: '#15803d',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid #bbf7d0',
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    backgroundColor: '#22c55e',
                    display: 'inline-block',
                    boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.25)',
                  }}
                />
                🟢 Working
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  border: '1px solid #fde68a',
                }}
              >
                <Clock size={16} />
                Not Checked In
              </span>
            )}
          </div>
        </div>

        {/* State A: Before Check In */}
        {!isCheckedIn && !isCheckedOut && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.5rem',
              padding: '1.25rem',
              backgroundColor: 'var(--slate-50)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--slate-300)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: '0.2rem' }}>
                Scheduled Working Shift:
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                09:00 AM – 06:00 PM
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', margin: '0.25rem 0 0' }}>
                Please check in upon beginning your daily shift deliverables.
              </p>
            </div>

            <button
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="btn-primary"
              id="attendance-checkin-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1rem',
                padding: '0.75rem 1.75rem',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Recording Check In...</span>
                </>
              ) : (
                <>
                  <Clock size={18} />
                  <span>CHECK IN</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* State B: After Check In (Working & Live Timer) */}
        {isCheckedIn && !isCheckedOut && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.5rem',
              padding: '1.5rem',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--slate-200)',
            }}
          >
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                  Check In Time
                </span>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  {formatTime(todayAttendance.checkIn)}
                </div>
                <div style={{ fontSize: '0.75rem', color: todayAttendance.status === 'Late' ? '#d97706' : '#059669', fontWeight: 600 }}>
                  Status: {todayAttendance.status}
                </div>
              </div>

              <div style={{ borderLeft: '1px solid var(--slate-200)', paddingLeft: '2rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase' }}>
                  Live Working Duration
                </span>
                <div
                  style={{
                    fontSize: '1.6rem',
                    fontWeight: 900,
                    color: 'var(--primary-600)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '0.02em',
                  }}
                  id="live-working-timer"
                >
                  {elapsed || '00h 00m 00s'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                  Timer active • Auto-calculated
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckOut}
              disabled={actionLoading}
              className="btn-danger"
              id="attendance-checkout-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '1rem',
                padding: '0.75rem 1.75rem',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Recording Check Out...</span>
                </>
              ) : (
                <>
                  <LogOut size={18} />
                  <span>CHECK OUT</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* State C: After Checkout (Work Day Completed) */}
        {isCheckedOut && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.5rem',
              padding: '1.25rem 1.5rem',
              backgroundColor: '#f0fdf4',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid #bbf7d0',
            }}
          >
            <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  Check In
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#14532d' }}>
                  {formatTime(todayAttendance.checkIn)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  Check Out
                </span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#14532d' }}>
                  {formatTime(todayAttendance.checkOut)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  Total Working Hours
                </span>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#15803d' }}>
                  {formatHoursDuration(todayAttendance.totalHours)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  Outcome Status
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#15803d' }}>
                  {todayAttendance.status}
                </div>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.825rem', color: '#15803d', fontWeight: 600 }}>
                ✓ Today's shift logged securely
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Monthly Attendance Summary Cards (Real Backend Metrics) */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        {/* Total Working Days Recorded */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Attendance This Month</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)' }}>
              <CalendarCheck size={20} />
            </div>
          </div>
          <div className="stat-card-value">{summary?.totalWorkingDays ?? 0} Days</div>
          <p className="stat-card-subtitle">
            <span>Logged active working sessions</span>
          </p>
        </div>

        {/* Days Present */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Days Present</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#059669' }}>
            {summary?.presentDays ?? 0}
          </div>
          <p className="stat-card-subtitle">
            <span>On-time attendance records</span>
          </p>
        </div>

        {/* Days Late */}
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
          <p className="stat-card-subtitle">
            <span>Checked in after 09:00 AM</span>
          </p>
        </div>

        {/* Leave Days */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Leave Days</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
              <CalendarRange size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: (summary?.leaveDays || 0) > 0 ? '#d97706' : 'inherit' }}>
            {summary?.leaveDays ?? 0}
          </div>
          <p className="stat-card-subtitle">
            <span>Approved absence in cycle</span>
          </p>
        </div>
      </div>

      {/* 4b. Leave Balance Cards Ribbon */}
      {leaveBalance && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <CalendarRange size={18} color="var(--primary-600)" />
              <span>My Leave Balances ({new Date().getFullYear()})</span>
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link
                to="/employee/leave/add"
                className="btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', textDecoration: 'none' }}
              >
                + Request Leave
              </Link>
              <Link
                to="/employee/leave"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--primary-600)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
              >
                <span>View Portal</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {Object.entries(leaveBalance).map(([type, bal]) => {
              const pct = bal.total > 0 ? Math.round((bal.used / bal.total) * 100) : 0;
              return (
                <div
                  key={type}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-xl)',
                    border: '1px solid var(--slate-200)',
                    padding: '1rem',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--slate-700)' }}>
                      {type}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                      {bal.used}/{bal.total}d
                    </span>
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: bal.remaining > 0 ? 'var(--slate-900)' : '#dc2626', marginBottom: '0.5rem' }}>
                    {bal.remaining} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)' }}>days left</span>
                  </div>
                  <div style={{ height: 6, backgroundColor: 'var(--slate-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: pct > 80 ? '#dc2626' : pct > 50 ? '#f59e0b' : '#10b981',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4c. My Salary & Compensation Card */}
      {latestSalary && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--slate-200)',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: 'linear-gradient(90deg, var(--primary-500), #f97316)',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <h2
              style={{
                fontSize: '1.05rem',
                fontWeight: 700,
                color: 'var(--slate-900)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                margin: 0,
              }}
            >
              <CreditCard size={18} color="var(--primary-600)" />
              <span>Current Compensation & Payroll</span>
            </h2>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link
                to={`/employee/salary/${latestSalary._id}`}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', textDecoration: 'none' }}
                id="dash-view-payslip-link"
              >
                View Payslip
              </Link>
              <Link
                to="/employee/salary"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--primary-600)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
              >
                <span>Salary History</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.5rem',
              backgroundColor: 'var(--slate-50)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              border: '1px solid var(--slate-200)',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--slate-500)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Net Take-Home Pay
              </span>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  color: 'var(--primary-700)',
                  lineHeight: '1.2',
                  marginTop: '0.2rem',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                ₹{Number(latestSalary.netSalary || 0).toLocaleString('en-IN')}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.4rem',
                  fontSize: '0.8rem',
                  color: 'var(--slate-600)',
                }}
              >
                <span>
                  Period: {latestSalary.payMonth ? `${latestSalary.payMonth.toString().padStart(2, '0')}/${latestSalary.payYear}` : 'Current'}
                </span>
                <span>•</span>
                <span
                  className={`badge ${
                    latestSalary.status === 'Paid'
                      ? 'badge-success'
                      : latestSalary.status === 'Processed'
                      ? 'badge-primary'
                      : 'badge-warning'
                  }`}
                >
                  {latestSalary.status || 'Paid'}
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))',
                gap: '1.25rem',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600 }}>
                  Basic Salary
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-800)', marginTop: '2px' }}>
                  ₹{Number(latestSalary.basicSalary || 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600 }}>
                  Gross Earnings
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#059669', marginTop: '2px' }}>
                  ₹{Number(latestSalary.grossSalary || 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600 }}>
                  Total Deductions
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#dc2626', marginTop: '2px' }}>
                  -₹{Number(latestSalary.totalDeductions || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Main Grid: Quick Actions, Upcoming Work & Recent Notifications */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Quick Actions & Upcoming Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Actions Shortcuts */}
          <div
            className="chart-card"
            style={{
              padding: '1.5rem',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--slate-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 1rem' }}>
              Quick Actions
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: '0.75rem' }}>
              <Link
                to="/employee/attendance"
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  padding: '0.65rem',
                }}
              >
                <Clock size={16} color="var(--primary-600)" />
                <span>My Attendance</span>
              </Link>
              <Link
                to="/employee/submissions"
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  padding: '0.65rem',
                }}
              >
                <FolderCheck size={16} color="var(--primary-600)" />
                <span>My Submissions</span>
              </Link>
              <Link
                to="/profile"
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  padding: '0.65rem',
                }}
              >
                <User size={16} color="var(--primary-600)" />
                <span>My Profile</span>
              </Link>
              <Link
                to="/employee/leave"
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  padding: '0.65rem',
                }}
              >
                <CalendarRange size={16} color="var(--primary-600)" />
                <span>My Leave</span>
              </Link>
              <Link
                to="/employee/leave/add"
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  padding: '0.65rem',
                }}
              >
                <CalendarCheck size={16} color="var(--primary-600)" />
                <span>Request Leave</span>
              </Link>
              <Link
                to="/notifications"
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  padding: '0.65rem',
                }}
              >
                <Bell size={16} color="var(--primary-600)" />
                <span>Notifications</span>
              </Link>
              <button
                type="button"
                onClick={loadDashboardData}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  padding: '0.65rem',
                }}
              >
                <Sparkles size={16} color="var(--primary-600)" />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>

          {/* Upcoming Work (Real Live Tasks) */}
          <div
            className="chart-card"
            style={{
              padding: '1.5rem',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--slate-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <ListTodo size={18} color="var(--primary-600)" />
                <span>My Tasks</span>
              </h2>
              <Link
                to="/employee/tasks"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--primary-600)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
              >
                <span>View All Tasks</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {upcomingTasks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {upcomingTasks.map((task) => {
                  const isOverdue = task.isOverdue;
                  const dueLabel = (() => {
                    if (!task.dueDate) return '';
                    const d = new Date(task.dueDate);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    const dMid = new Date(d);
                    dMid.setHours(0, 0, 0, 0);
                    if (dMid.getTime() === now.getTime()) return 'Due Today';
                    return `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                  })();

                  return (
                    <div
                      key={task._id}
                      style={{
                        padding: '0.9rem',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: 'var(--slate-50)',
                        border: '1px solid var(--slate-200)',
                        borderLeft: isOverdue
                          ? '3px solid #dc2626'
                          : task.status === 'Completed'
                          ? '3px solid #10b981'
                          : '3px solid var(--primary-500)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <Link
                          to={`/employee/tasks/${task._id}`}
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: 'var(--slate-900)',
                            textDecoration: 'none',
                          }}
                          onMouseOver={(e) => (e.target.style.color = 'var(--primary-600)')}
                          onMouseOut={(e) => (e.target.style.color = 'var(--slate-900)')}
                        >
                          {task.title}
                        </Link>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                          <span
                            className={`badge-priority ${
                              task.priority === 'Low'
                                ? 'badge-priority-low'
                                : task.priority === 'High'
                                ? 'badge-priority-high'
                                : task.priority === 'Urgent'
                                ? 'badge-priority-urgent'
                                : 'badge-priority-medium'
                            }`}
                            style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem' }}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: '0.4rem' }}>
                        <span style={{ color: isOverdue ? '#dc2626' : 'var(--slate-600)', fontWeight: isOverdue ? 700 : 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          {isOverdue && <span className="badge-overdue" style={{ fontSize: '0.65rem' }}>OVERDUE</span>}
                          <span>{dueLabel}</span>
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--slate-700)' }}>
                          {task.progress}%
                        </span>
                      </div>

                      <div className="task-progress-container">
                        <div className="task-progress-track" style={{ height: 6 }}>
                          <div
                            className={`task-progress-fill ${task.progress === 100 ? 'completed' : ''}`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--slate-200)',
                }}
              >
                <Calendar size={32} color="var(--slate-400)" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ fontWeight: 600, color: 'var(--slate-700)', margin: '0 0 0.25rem', fontSize: '0.9rem' }}>
                  No tasks assigned yet.
                </p>
                <p style={{ color: 'var(--slate-500)', fontSize: '0.8rem', margin: 0 }}>
                  Your schedule is clear. Check back later or reach out to your team lead.
                </p>
              </div>
            )}
          </div>

          {/* Recent Work Deliverables & Reviews */}
          <div
            className="chart-card"
            style={{
              padding: '1.5rem',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--slate-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <FolderCheck size={18} color="var(--primary-600)" />
                <span>My Deliverable Submissions</span>
              </h2>
              <Link
                to="/employee/submissions"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--primary-600)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
              >
                <span>View All</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {recentSubmissions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {recentSubmissions.map((sub) => {
                  const statusColor =
                    sub.status === 'Approved'
                      ? '#16a34a'
                      : sub.status === 'Changes Requested'
                      ? '#dc2626'
                      : '#d97706';
                  const statusBg =
                    sub.status === 'Approved'
                      ? '#dcfce7'
                      : sub.status === 'Changes Requested'
                      ? '#fee2e2'
                      : '#fef3c7';

                  return (
                    <div
                      key={sub._id}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: 'var(--slate-50)',
                        border: '1px solid var(--slate-200)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--slate-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sub.task?.title || 'Deliverable Submission'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
                          Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: statusBg,
                            color: statusColor,
                          }}
                        >
                          {sub.status}
                        </span>

                        <Link
                          to={`/employee/submissions/${sub._id}`}
                          className="btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--slate-200)',
                }}
              >
                <p style={{ fontWeight: 600, color: 'var(--slate-700)', margin: '0 0 0.25rem', fontSize: '0.875rem' }}>
                  No submissions yet
                </p>
                <p style={{ color: 'var(--slate-500)', fontSize: '0.775rem', margin: 0 }}>
                  Deliverables for completed tasks will appear here.
                </p>
              </div>
            )}
          </div>

          {/* Recent Leave Requests */}
          <div
            className="chart-card"
            style={{
              padding: '1.5rem',
              background: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--slate-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <CalendarRange size={18} color="var(--primary-600)" />
                <span>My Recent Leaves</span>
              </h2>
              <Link
                to="/employee/leave"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--primary-600)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                }}
              >
                <span>View All</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {recentLeaves.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {recentLeaves.map((leave) => {
                  const badgeClass =
                    leave.status === 'Approved'
                      ? 'leave-badge-approved'
                      : leave.status === 'Rejected'
                      ? 'leave-badge-rejected'
                      : leave.status === 'Cancelled'
                      ? 'leave-badge-cancelled'
                      : 'leave-badge-pending';

                  return (
                    <div
                      key={leave._id}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: 'var(--slate-50)',
                        border: '1px solid var(--slate-200)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--slate-900)' }}>
                          {leave.leaveType} &bull; {leave.duration || 1} {leave.duration === 1 ? 'Day' : 'Days'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
                          {new Date(leave.startDate).toLocaleDateString()} – {new Date(leave.endDate).toLocaleDateString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <span className={`status-pill ${badgeClass}`} style={{ fontSize: '0.75rem' }}>
                          {leave.status}
                        </span>

                        <Link
                          to={`/employee/leave/${leave._id}`}
                          className="btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--slate-50)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--slate-200)',
                }}
              >
                <p style={{ fontWeight: 600, color: 'var(--slate-700)', margin: '0 0 0.25rem', fontSize: '0.875rem' }}>
                  No leave requests yet
                </p>
                <p style={{ color: 'var(--slate-500)', fontSize: '0.775rem', margin: '0 0 0.75rem' }}>
                  Need time off? Submit a leave request online.
                </p>
                <Link
                  to="/employee/leave/add"
                  className="btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', textDecoration: 'none' }}
                >
                  + Apply Leave
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recent Notifications */}
        <div
          className="chart-card"
          style={{
            padding: '1.5rem',
            background: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--slate-200)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Bell size={18} color="var(--primary-600)" />
              Recent Notifications
            </h2>
            <Link
              to="/notifications"
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--primary-600)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {notifications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {notifications.map((notif) => (
                <div
                  key={notif._id}
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: notif.isRead ? 'var(--slate-50)' : '#f8fafc',
                    borderLeft: notif.isRead ? '3px solid var(--slate-200)' : '3px solid var(--primary-500)',
                    borderTop: '1px solid var(--slate-100)',
                    borderRight: '1px solid var(--slate-100)',
                    borderBottom: '1px solid var(--slate-100)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: notif.isRead ? 600 : 700, color: 'var(--slate-900)' }}>
                      {notif.title}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--slate-600)', margin: 0, lineHeight: 1.4 }}>
                    {notif.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: '2.5rem 1rem',
                textAlign: 'center',
                backgroundColor: 'var(--slate-50)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed var(--slate-200)',
              }}
            >
              <Bell size={32} color="var(--slate-400)" style={{ margin: '0 auto 0.5rem' }} />
              <p style={{ fontWeight: 600, color: 'var(--slate-700)', margin: '0 0 0.25rem', fontSize: '0.9rem' }}>
                No new notifications
              </p>
              <p style={{ color: 'var(--slate-500)', fontSize: '0.8rem', margin: 0 }}>
                You're all caught up with your latest team updates.
              </p>
            </div>
          )}

          <div style={{ marginTop: '1.25rem' }}>
            <Link
              to="/notifications"
              className="btn-primary"
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontSize: '0.85rem',
              }}
            >
              <Bell size={16} />
              <span>Open Notification Center</span>
            </Link>
            </div>
          </div>
        </div>
      {/* Performance & Goals Widget */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--slate-200)', borderRadius: 16, padding: '1.5rem', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📈 My Performance
          </div>
          <Link to="/employee/performance" style={{ fontSize: '0.8rem', color: 'var(--primary-600)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            View All <ArrowRight size={13} />
          </Link>
        </div>

        {/* Rating + Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 90px), 1fr))', gap: '0.875rem', marginBottom: '1.25rem' }}>
          <div style={{ textAlign: 'center', background: 'var(--slate-50)', borderRadius: 12, padding: '1rem' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', letterSpacing: '-0.02em' }}>
              {perfSummary?.latestReview?.overallRating ? `${perfSummary.latestReview.overallRating}⭐` : '—'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', fontWeight: 500, marginTop: '0.2rem' }}>Rating</div>
          </div>
          <div style={{ textAlign: 'center', background: 'var(--slate-50)', borderRadius: 12, padding: '1rem' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', letterSpacing: '-0.02em' }}>
              {perfSummary?.goalStats?.completionRate != null ? `${perfSummary.goalStats.completionRate}%` : '—'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', fontWeight: 500, marginTop: '0.2rem' }}>Goals Done</div>
          </div>
          <div style={{ textAlign: 'center', background: 'var(--slate-50)', borderRadius: 12, padding: '1rem' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-600)', letterSpacing: '-0.02em' }}>
              {perfSummary?.taskStats?.completed ?? '—'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--slate-500)', fontWeight: 500, marginTop: '0.2rem' }}>Tasks Done</div>
          </div>
        </div>

        {/* Latest Feedback */}
        {perfSummary?.latestReview?.managerFeedback && (
          <div style={{ background: 'var(--slate-50)', borderLeft: '3px solid var(--primary-500)', padding: '0.75rem 1rem', borderRadius: '0 8px 8px 0', marginBottom: '1.25rem', fontSize: '0.82rem', color: 'var(--slate-600)', fontStyle: 'italic', lineHeight: 1.5 }}>
            "{perfSummary.latestReview.managerFeedback.length > 120
              ? perfSummary.latestReview.managerFeedback.slice(0, 120) + '...'
              : perfSummary.latestReview.managerFeedback}"
          </div>
        )}

        {/* Active Goals */}
        {myGoals.length > 0 && (
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>Active Goals</div>
            {myGoals.map((goal) => {
              const pct = goal.progress || 0;
              const color = pct === 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : 'var(--primary-600)';
              return (
                <Link key={goal._id} to={`/employee/performance/goals/${goal._id}`} style={{ display: 'block', textDecoration: 'none', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--slate-800)' }}>{goal.title}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--slate-200)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.5s' }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!perfSummary?.latestReview && myGoals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--slate-400)', fontSize: '0.85rem' }}>
            No performance data yet. Check back after your first review.
          </div>
        )}
      </div>

      {/* My Documents Widget (Step 21) */}
      <div style={{ background: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)', padding: '1.25rem', marginTop: '1.5rem', boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText size={18} style={{ color: 'var(--primary-600)' }} />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--slate-900)' }}>My Documents</h3>
          </div>
          <Link
            to="/employee/documents"
            style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-600)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            id="emp-dash-view-all-docs"
          >
            View All Documents <ArrowRight size={14} />
          </Link>
        </div>

        {myRecentDocs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.25rem', color: 'var(--slate-400)', fontSize: '0.85rem' }}>
            No documents available.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {myRecentDocs.slice(0, 3).map((doc) => (
              <Link
                key={doc._id}
                to={`/employee/documents/${doc._id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--slate-100)',
                  background: 'var(--slate-50)',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <FileText size={16} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-800)' }}>
                      {doc.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                      {doc.documentType}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 500 }}>
                  {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Latest Announcements Widget (Step 22) */}
      <div style={{ background: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-200)', padding: '1.25rem', marginTop: '1.5rem', boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Megaphone size={18} style={{ color: 'var(--primary-600)' }} />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--slate-900)' }}>Latest Announcements</h3>
          </div>
          <Link
            to="/employee/announcements"
            style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-600)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            id="emp-dash-view-all-ann"
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {latestAnnouncements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.25rem', color: 'var(--slate-400)', fontSize: '0.85rem' }}>
            No announcements available.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {latestAnnouncements.slice(0, 3).map((ann) => (
              <Link
                key={ann._id}
                to={`/employee/announcements/${ann._id}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--slate-100)',
                  background: 'var(--slate-50)',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontSize: '1rem' }}>📢</span>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-800)' }}>
                      {ann.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                      {ann.category} • {ann.priority}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 500 }}>
                  {new Date(ann.publishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
