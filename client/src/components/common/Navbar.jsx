import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Bell,
  CheckCheck,
  ArrowRight,
  User,
  CalendarRange,
  IndianRupee,
  Shield,
  Loader2,
  Settings,
  LogOut,
  ChevronDown,
  Search,
  FileText,
  Award,
  Clock,
  Send,
  UserCheck,
  Target,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import notificationService from '../../services/notificationService.js';
import { formatTimeAgo } from '../../utils/timeAgo.js';
import { getDashboardPath } from '../../utils/roleRoutes.js';
import StaffPulseLogo from './StaffPulseLogo.jsx';
import '../../styles/notifications.css';

export const Navbar = ({ onToggleSidebar, onOpenSearch, title = 'Dashboard' }) => {
  const { user, logout } = useAuth();
  const { unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const dropdownRef = useRef(null);
  const profileMenuRef = useRef(null);

  // Close dropdown on outside click or escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setProfileDropdownOpen(false);
      }
    };

    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };

    if (dropdownOpen || profileDropdownOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, profileDropdownOpen]);

  // Load preview notifications when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      const fetchPreview = async () => {
        setLoadingPreview(true);
        try {
          const res = await notificationService.getNotifications({ limit: 5 });
          if (res.success && res.notifications) {
            setRecentNotifications(res.notifications);
          }
        } catch {
          // non-critical preview load error
        } finally {
          setLoadingPreview(false);
        }
      };
      fetchPreview();
    }
  }, [dropdownOpen]);

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await markAsRead(notif._id);
      } catch {
        /* ignore */
      }
    }
    setDropdownOpen(false);

    // Route to related resource if applicable
    if (notif.relatedId) {
      const isEmp = user?.role === 'employee';
      const isMgr = user?.role === 'manager';

      switch (notif.type) {
        case 'account':
          navigate('/profile');
          return;
        case 'goal':
        case 'goals':
          navigate(isEmp ? `/employee/performance/goals/${notif.relatedId}` : `/performance/goals/${notif.relatedId}`);
          return;
        case 'employee':
          navigate(isMgr ? `/manager/team/${notif.relatedId}` : `/employees/${notif.relatedId}`);
          return;
        case 'leave':
          navigate(isEmp ? `/employee/leave/${notif.relatedId}` : isMgr ? `/manager/leave/${notif.relatedId}` : `/leaves/${notif.relatedId}`);
          return;
        case 'salary':
          navigate(isEmp ? `/employee/salary` : `/salary/${notif.relatedId}`);
          return;
        case 'task':
          if (notif.title?.toLowerCase().includes('submission') || notif.title?.toLowerCase().includes('work')) {
            navigate(isEmp ? `/employee/submissions/${notif.relatedId}` : isMgr ? `/manager/submissions/${notif.relatedId}` : `/submissions/${notif.relatedId}`);
          } else {
            navigate(isEmp ? `/employee/tasks/${notif.relatedId}` : isMgr ? `/manager/tasks/${notif.relatedId}` : `/tasks/${notif.relatedId}`);
          }
          return;
        case 'submission':
          navigate(isEmp ? `/employee/submissions/${notif.relatedId}` : isMgr ? `/manager/submissions/${notif.relatedId}` : `/submissions/${notif.relatedId}`);
          return;
        case 'announcement':
          navigate(isEmp ? `/employee/announcements/${notif.relatedId}` : `/announcements/${notif.relatedId}`);
          return;
        case 'performance':
          navigate(isEmp ? `/employee/performance/${notif.relatedId}` : isMgr ? `/manager/performance/${notif.relatedId}` : `/performance/${notif.relatedId}`);
          return;
        case 'document':
          navigate(isEmp ? `/employee/documents/${notif.relatedId}` : `/documents/${notif.relatedId}`);
          return;
        case 'attendance':
          navigate(isEmp ? `/employee/attendance` : isMgr ? `/manager/attendance` : `/attendance`);
          return;
      }
    }
    navigate('/notifications');
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'account':
        return <UserCheck size={14} />;
      case 'goal':
      case 'goals':
        return <Target size={14} />;
      case 'employee':
        return <User size={14} />;
      case 'leave':
        return <CalendarRange size={14} />;
      case 'salary':
        return <IndianRupee size={14} />;
      case 'task':
        return <CheckCheck size={14} />;
      case 'submission':
        return <Send size={14} />;
      case 'performance':
        return <Award size={14} />;
      case 'announcement':
        return <Bell size={14} />;
      case 'document':
        return <FileText size={14} />;
      case 'attendance':
        return <Clock size={14} />;
      default:
        return <Shield size={14} />;
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'admin':
        return { bg: 'var(--primary-50)', color: 'var(--primary-700)', border: 'var(--primary-200)' };
      case 'manager':
        return { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' };
      default:
        return { bg: 'var(--slate-100)', color: 'var(--slate-700)', border: 'var(--slate-200)' };
    }
  };

  const roleStyle = getRoleBadgeStyle(user?.role);
  const homeDashboard = getDashboardPath(user?.role);

  // Compute dynamic title & breadcrumb based on route
  const getRouteInfo = () => {
    // Admin Routes
    if (currentPath === '/dashboard') return { title: 'Dashboard', breadcrumbs: [{ label: 'Dashboard' }] };
    if (currentPath === '/employees') return { title: 'Employees', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Employees' }] };
    if (currentPath === '/employees/add') return { title: 'Add Employee', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Employees', path: '/employees' }, { label: 'Add Employee' }] };
    if (currentPath.startsWith('/employees/') && currentPath.endsWith('/edit')) return { title: 'Edit Employee', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Employees', path: '/employees' }, { label: 'Edit' }] };
    if (currentPath.startsWith('/employees/')) return { title: 'Employee Details', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Employees', path: '/employees' }, { label: 'Details' }] };
    if (currentPath === '/departments') return { title: 'Departments', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Departments' }] };
    if (currentPath === '/departments/add') return { title: 'Add Department', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Departments', path: '/departments' }, { label: 'Add' }] };
    if (currentPath.startsWith('/departments/')) return { title: 'Department Details', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Departments', path: '/departments' }, { label: 'Details' }] };
    if (currentPath === '/attendance') return { title: 'Attendance Management', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Attendance' }] };
    if (currentPath.startsWith('/attendance/')) return { title: 'Employee Attendance', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Attendance', path: '/attendance' }, { label: 'Record' }] };
    if (currentPath === '/leaves') return { title: 'Leave Management', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Leave Management' }] };
    if (currentPath === '/leaves/add') return { title: 'Add Leave', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Leave', path: '/leaves' }, { label: 'Add' }] };
    if (currentPath.startsWith('/leaves/')) return { title: 'Leave Details', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Leave', path: '/leaves' }, { label: 'Details' }] };
    if (currentPath === '/tasks') return { title: 'Task Management', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Tasks' }] };
    if (currentPath === '/tasks/add') return { title: 'Create Task', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Tasks', path: '/tasks' }, { label: 'Create' }] };
    if (currentPath.startsWith('/tasks/') && currentPath.endsWith('/edit')) return { title: 'Edit Task', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Tasks', path: '/tasks' }, { label: 'Edit' }] };
    if (currentPath.startsWith('/tasks/')) return { title: 'Task Details', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Tasks', path: '/tasks' }, { label: 'Details' }] };
    if (currentPath === '/submissions') return { title: 'Work Submissions', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Submissions' }] };
    if (currentPath.startsWith('/submissions/')) return { title: 'Submission Review', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Submissions', path: '/submissions' }, { label: 'Review' }] };
    if (currentPath === '/performance') return { title: 'Performance Reviews', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Performance' }] };
    if (currentPath === '/performance/reviews/add') return { title: 'Create Review', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Performance', path: '/performance' }, { label: 'Create' }] };
    if (currentPath === '/performance/goals') return { title: 'Goals Management', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Performance', path: '/performance' }, { label: 'Goals' }] };
    if (currentPath === '/performance/goals/add') return { title: 'Add Goal', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Goals', path: '/performance/goals' }, { label: 'Add' }] };
    if (currentPath.startsWith('/performance/goals/')) return { title: 'Goal Details', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Goals', path: '/performance/goals' }, { label: 'Details' }] };
    if (currentPath.startsWith('/performance/')) return { title: 'Performance Details', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Performance', path: '/performance' }, { label: 'Details' }] };
    if (currentPath === '/salary') return { title: 'Payroll & Salary', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Salary' }] };
    if (currentPath === '/salary/add') return { title: 'Add Salary Record', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Salary', path: '/salary' }, { label: 'Add' }] };
    if (currentPath.startsWith('/salary/')) return { title: 'Salary Details', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Salary', path: '/salary' }, { label: 'Details' }] };
    if (currentPath === '/documents') return { title: 'Documents Management', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Documents' }] };
    if (currentPath === '/documents/add') return { title: 'Upload Document', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Documents', path: '/documents' }, { label: 'Upload' }] };
    if (currentPath.startsWith('/documents/')) return { title: 'Document Details', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Documents', path: '/documents' }, { label: 'Details' }] };
    if (currentPath === '/reports') return { title: 'Analytics & Reports', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Reports' }] };
    if (currentPath === '/announcements') return { title: 'Announcements', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Announcements' }] };
    if (currentPath === '/announcements/add') return { title: 'Create Announcement', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Announcements', path: '/announcements' }, { label: 'Create' }] };
    if (currentPath.startsWith('/announcements/')) return { title: 'Announcement Details', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Announcements', path: '/announcements' }, { label: 'Details' }] };
    if (currentPath === '/audit-logs') return { title: 'Audit Logs', breadcrumbs: [{ label: 'Dashboard', path: '/dashboard' }, { label: 'Audit Logs' }] };

    // Manager Routes
    if (currentPath === '/manager/dashboard') return { title: 'Manager Dashboard', breadcrumbs: [{ label: 'Dashboard' }] };
    if (currentPath === '/manager/team') return { title: 'My Team', breadcrumbs: [{ label: 'Dashboard', path: '/manager/dashboard' }, { label: 'My Team' }] };
    if (currentPath.startsWith('/manager/team/')) return { title: 'Team Member Profile', breadcrumbs: [{ label: 'Dashboard', path: '/manager/dashboard' }, { label: 'My Team', path: '/manager/team' }, { label: 'Member' }] };
    if (currentPath === '/manager/tasks') return { title: 'Team Tasks', breadcrumbs: [{ label: 'Dashboard', path: '/manager/dashboard' }, { label: 'Tasks' }] };
    if (currentPath === '/manager/leave') return { title: 'Team Leave Requests', breadcrumbs: [{ label: 'Dashboard', path: '/manager/dashboard' }, { label: 'Leave' }] };
    if (currentPath === '/manager/attendance') return { title: 'Team Attendance', breadcrumbs: [{ label: 'Dashboard', path: '/manager/dashboard' }, { label: 'Attendance' }] };
    if (currentPath === '/manager/submissions') return { title: 'Team Submissions', breadcrumbs: [{ label: 'Dashboard', path: '/manager/dashboard' }, { label: 'Submissions' }] };
    if (currentPath === '/manager/performance') return { title: 'Team Performance', breadcrumbs: [{ label: 'Dashboard', path: '/manager/dashboard' }, { label: 'Performance' }] };

    // Employee Routes
    if (currentPath === '/employee/dashboard') return { title: 'Employee Dashboard', breadcrumbs: [{ label: 'Dashboard' }] };
    if (currentPath === '/employee/tasks') return { title: 'My Tasks', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'My Tasks' }] };
    if (currentPath.startsWith('/employee/tasks/') && currentPath.endsWith('/submit')) return { title: 'Submit Work', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'My Tasks', path: '/employee/tasks' }, { label: 'Submit Work' }] };
    if (currentPath.startsWith('/employee/tasks/')) return { title: 'Task Details', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'My Tasks', path: '/employee/tasks' }, { label: 'Details' }] };
    if (currentPath === '/employee/attendance') return { title: 'My Attendance', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'Attendance' }] };
    if (currentPath === '/employee/leave') return { title: 'My Leave', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'My Leave' }] };
    if (currentPath === '/employee/leave/add') return { title: 'Request Leave', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'My Leave', path: '/employee/leave' }, { label: 'Request' }] };
    if (currentPath.startsWith('/employee/leave/')) return { title: 'Leave Details', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'My Leave', path: '/employee/leave' }, { label: 'Details' }] };
    if (currentPath === '/employee/salary') return { title: 'My Salary & Payslips', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'Salary' }] };
    if (currentPath.startsWith('/employee/salary/')) return { title: 'Payslip', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'Salary', path: '/employee/salary' }, { label: 'Payslip' }] };
    if (currentPath === '/employee/performance') return { title: 'My Performance', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'Performance' }] };
    if (currentPath === '/employee/performance/goals') return { title: 'My Goals', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'Goals' }] };
    if (currentPath.startsWith('/employee/performance/goals/')) return { title: 'Goal Details', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'Goals', path: '/employee/performance/goals' }, { label: 'Details' }] };
    if (currentPath === '/employee/documents') return { title: 'My Documents', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'Documents' }] };
    if (currentPath.startsWith('/employee/documents/')) return { title: 'Document Details', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'Documents', path: '/employee/documents' }, { label: 'Details' }] };
    if (currentPath === '/employee/submissions') return { title: 'My Submissions', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'Submissions' }] };
    if (currentPath.startsWith('/employee/submissions/')) return { title: 'Submission Details', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'Submissions', path: '/employee/submissions' }, { label: 'Details' }] };
    if (currentPath === '/employee/announcements') return { title: 'Notice Board', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'Announcements' }] };
    if (currentPath.startsWith('/employee/announcements/')) return { title: 'Announcement Details', breadcrumbs: [{ label: 'Dashboard', path: '/employee/dashboard' }, { label: 'Announcements', path: '/employee/announcements' }, { label: 'Details' }] };

    // Common Routes
    if (currentPath === '/notifications') return { title: 'Notifications', breadcrumbs: [{ label: 'Dashboard', path: homeDashboard }, { label: 'Notifications' }] };
    if (currentPath === '/activity') return { title: 'Activity Center', breadcrumbs: [{ label: 'Dashboard', path: homeDashboard }, { label: 'Activity' }] };
    if (currentPath === '/profile') return { title: 'My Profile', breadcrumbs: [{ label: 'Dashboard', path: homeDashboard }, { label: 'Profile' }] };
    if (currentPath === '/settings') return { title: 'Settings', breadcrumbs: [{ label: 'Dashboard', path: homeDashboard }, { label: 'Settings' }] };
    if (currentPath === '/help-center') return { title: 'Help Center', breadcrumbs: [{ label: 'Dashboard', path: homeDashboard }, { label: 'Help Center' }] };

    return { title: title || 'Dashboard', breadcrumbs: [{ label: title || 'Dashboard' }] };
  };

  const routeInfo = getRouteInfo();

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <button
          className="menu-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Open sidebar menu"
        >
          <Menu size={22} />
        </button>
        <div className="navbar-brand-mobile">
          <StaffPulseLogo variant="compact" height={28} />
        </div>
        <div className="navbar-heading-group">
          {routeInfo.breadcrumbs && routeInfo.breadcrumbs.length > 1 && (
            <nav 
              className="navbar-breadcrumbs" 
              aria-label="Breadcrumb" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.35rem', 
                fontSize: '0.75rem', 
                color: 'var(--slate-400)',
                marginBottom: '0.1rem' 
              }}
            >
              {routeInfo.breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span style={{ color: 'var(--slate-300)' }}>/</span>}
                  {crumb.path ? (
                    <Link to={crumb.path} style={{ color: 'var(--slate-500)', textDecoration: 'none', transition: 'color 0.15s' }}>
                      {crumb.label}
                    </Link>
                  ) : (
                    <span style={{ color: 'var(--slate-600)', fontWeight: 600 }}>{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
          <h1 className="navbar-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-800)' }}>
            {routeInfo.title}
          </h1>
        </div>
      </div>

      {/* Global Search Bar Trigger */}
      <div className="navbar-search">
        {/* Desktop search bar */}
        <button 
          onClick={onOpenSearch}
          className="global-search-btn desktop-search-btn"
          type="button"
          aria-label="Search employees, tasks, leaves"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={16} />
            <span>Search employees, tasks, leaves...</span>
          </div>
          <div style={{ display: 'flex', gap: '0.2rem' }}>
            <kbd className="search-kbd">Ctrl</kbd>
            <kbd className="search-kbd">K</kbd>
          </div>
        </button>

        {/* Mobile search icon button */}
        <button
          onClick={onOpenSearch}
          className="mobile-search-icon-btn"
          type="button"
          aria-label="Open search"
          title="Search"
        >
          <Search size={18} />
        </button>
      </div>

      <div className="navbar-right">
        
        {/* Date Display */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }} className="navbar-date-display">
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
          </span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-800)' }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Notification Bell & Interactive Dropdown */}
        <div className="notification-bell-wrap" ref={dropdownRef}>
          <button
            className={`notification-bell-btn ${dropdownOpen ? 'active' : ''}`}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-label="Notifications"
            title="Notifications"
            id="navbar-notification-bell"
            style={{ position: 'relative', background: 'var(--slate-100)', border: 'none', padding: '0.5rem', borderRadius: '50%', color: 'var(--slate-600)', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notification-bell-badge" id="navbar-unread-badge" style={{ position: 'absolute', top: -2, right: -2, background: 'var(--primary-500)', color: 'white', fontSize: '0.65rem', fontWeight: 700, padding: '2px 5px', borderRadius: '10px', border: '2px solid white' }}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <>
              {/* Invisible Backdrop for click-outside dismissal */}
              <div
                className="notification-dropdown-backdrop"
                onClick={() => setDropdownOpen(false)}
              />

              <div className="notification-dropdown">
                <div className="notification-dropdown-header">
                  <div className="notification-dropdown-title">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span className="notification-dropdown-count">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={async () => {
                        await markAllAsRead();
                        setRecentNotifications((prev) =>
                          prev.map((n) => ({ ...n, isRead: true }))
                        );
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary-600)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                      title="Mark all as read"
                    >
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                </div>

                <div className="notification-dropdown-list">
                  {loadingPreview ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--slate-400)' }}>
                      <Loader2 className="animate-spin" size={20} style={{ margin: '0 auto 0.5rem' }} />
                      <span style={{ fontSize: '0.8rem' }}>Loading updates...</span>
                    </div>
                  ) : recentNotifications.length > 0 ? (
                    recentNotifications.map((n) => (
                      <div
                        key={n._id}
                        className={`notification-dropdown-item ${!n.isRead ? 'unread' : ''}`}
                        onClick={() => handleNotificationClick(n)}
                      >
                        <div
                          className={`notification-icon-wrapper notification-icon-${n.type}`}
                          style={{ width: 32, height: 32 }}
                        >
                          {getTypeIcon(n.type)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
                            <span style={{ fontSize: '0.825rem', fontWeight: n.isRead ? 600 : 700, color: 'var(--slate-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {n.title}
                            </span>
                            {!n.isRead && <span className="notification-unread-dot" />}
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--slate-500)', margin: '0.15rem 0', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {n.message}
                          </p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>
                            {formatTimeAgo(n.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--slate-500)', fontSize: '0.85rem' }}>
                      You're all caught up! No notifications.
                    </div>
                  )}
                </div>

                <div className="notification-dropdown-footer">
                  <Link
                    to="/notifications"
                    className="notification-dropdown-footer-link"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <span>View All Notifications</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Interactive User Profile Dropdown */}
        <div style={{ position: 'relative' }} ref={profileMenuRef}>
          <button
            onClick={() => setProfileDropdownOpen((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              background: profileDropdownOpen ? 'var(--slate-100)' : 'transparent',
              border: '1px solid transparent',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
            id="navbar-profile-trigger"
            aria-label="User profile menu"
            aria-expanded={profileDropdownOpen}
          >
            {/* User Avatar */}
            <div
              className="admin-avatar"
              style={{
                width: 34,
                height: 34,
                fontSize: '0.8rem',
                overflow: 'hidden',
              }}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name || 'User'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                getInitials(user?.name)
              )}
            </div>

            {/* Name & Role */}
            <div className="navbar-profile-info" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--slate-800)',
                  lineHeight: 1.2,
                }}
              >
                {user?.name || 'User'}
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: roleStyle.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {user?.role ? user.role.toUpperCase() : 'USER'}
              </span>
            </div>

            <ChevronDown
              size={15}
              style={{
                color: 'var(--slate-400)',
                transform: profileDropdownOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform var(--transition-fast)',
              }}
            />
          </button>

          {/* Profile Dropdown Menu */}
          {profileDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 220,
                background: 'var(--card-bg, #ffffff)',
                border: '1px solid var(--slate-200)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 110,
                padding: '0.4rem',
                animation: 'fadeIn 0.15s ease-out forwards',
              }}
              id="navbar-profile-dropdown"
            >
              <div
                style={{
                  padding: '0.65rem 0.75rem',
                  borderBottom: '1px solid var(--slate-100)',
                  marginBottom: '0.35rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.15rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name || 'User'}
                  </div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.4rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: roleStyle.bg,
                      color: roleStyle.color,
                      border: `1px solid ${roleStyle.border}`,
                      letterSpacing: '0.04em',
                    }}
                  >
                    {user?.role ? user.role.toUpperCase() : 'USER'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--slate-500)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.email || 'user@ems.com'}
                </div>
              </div>

              <Link
                to="/profile"
                onClick={() => setProfileDropdownOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--slate-700)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'background var(--transition-fast)',
                }}
                className="profile-menu-item"
              >
                <User size={16} color="var(--primary-600)" />
                <span>Profile</span>
              </Link>

              <Link
                to="/settings"
                onClick={() => setProfileDropdownOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--slate-700)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'background var(--transition-fast)',
                }}
                className="profile-menu-item"
              >
                <Settings size={16} color="var(--primary-600)" />
                <span>Settings</span>
              </Link>

              <div
                style={{
                  height: 1,
                  background: 'var(--slate-100)',
                  margin: '0.35rem 0',
                }}
              />

              <button
                onClick={async () => {
                  setProfileDropdownOpen(false);
                  await logout();
                  navigate('/login', { replace: true });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--danger-text)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'transparent',
                  transition: 'background var(--transition-fast)',
                }}
                className="profile-menu-logout"
              >
                <LogOut size={16} color="var(--danger-dot)" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
