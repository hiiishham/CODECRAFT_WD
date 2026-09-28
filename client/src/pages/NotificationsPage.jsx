import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  CalendarRange,
  IndianRupee,
  Shield,
  Sparkles,
  ArrowRight,
  RotateCw,
  AlertTriangle,
  FileText,
  Award,
  Clock,
  Send,
  UserCheck,
  Target,
} from 'lucide-react';
import notificationService from '../services/notificationService.js';
import { useNotifications } from '../context/NotificationContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/common/Loader.jsx';
import { formatTimeAgo } from '../utils/timeAgo.js';
import '../styles/notifications.css';

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const { markAsRead: contextMarkAsRead, markAllAsRead: contextMarkAllAsRead } = useNotifications();
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all'); // all, employee, leave, salary, system
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationService.getNotifications({
        page: currentPage,
        limit,
        status: statusFilter,
        type: typeFilter,
      });

      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
        setTotalPages(res.totalPages || 1);
        setTotalRecords(res.totalRecords || 0);
      } else {
        throw new Error(res.message || 'Failed to load notifications');
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve notifications');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time live notification listener
  useEffect(() => {
    if (!socket) return;

    const handleNewNotif = (notif) => {
      setNotifications((prev) => {
        if (typeFilter !== 'all' && notif.type !== typeFilter) return prev;
        if (statusFilter === 'read') return prev;
        return [notif, ...prev.filter((n) => n._id !== notif._id)];
      });
      setUnreadCount((prev) => prev + 1);
      setTotalRecords((prev) => prev + 1);
    };

    const handleReadNotif = ({ id, unreadCount: uc }) => {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      if (uc !== undefined) setUnreadCount(uc);
    };

    const handleReadAllNotif = ({ unreadCount: uc }) => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (uc !== undefined) setUnreadCount(uc);
    };

    socket.on('notification:new', handleNewNotif);
    socket.on('notification:read', handleReadNotif);
    socket.on('notification:read-all', handleReadAllNotif);

    return () => {
      socket.off('notification:new', handleNewNotif);
      socket.off('notification:read', handleReadNotif);
      socket.off('notification:read-all', handleReadAllNotif);
    };
  }, [socket, typeFilter, statusFilter]);

  // Mark single notification as read
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await contextMarkAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      showSuccess('Notification marked as read');
    } catch (err) {
      showError(err.message || 'Failed to mark notification as read');
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await contextMarkAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      showSuccess('All notifications marked as read');
    } catch (err) {
      showError(err.message || 'Failed to mark all as read');
    }
  };

  // Delete notification
  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await notificationService.deleteNotification(id);
      if (res.success) {
        showSuccess('Notification deleted');
        fetchNotifications();
      }
    } catch (err) {
      showError(err.message || 'Failed to delete notification');
    }
  };

  // Navigate to related resource
  const handleNavigateRelated = (notif) => {
    if (!notif.isRead) {
      contextMarkAsRead(notif._id).catch(() => {});
    }

    if (notif.relatedId) {
      const isEmp = user?.role === 'employee';
      const isMgr = user?.role === 'manager';

      switch (notif.type) {
        case 'account':
          navigate('/profile');
          break;
        case 'goal':
        case 'goals':
          navigate(isEmp ? `/employee/performance/goals/${notif.relatedId}` : `/performance/goals/${notif.relatedId}`);
          break;
        case 'employee':
          navigate(isMgr ? `/manager/team/${notif.relatedId}` : `/employees/${notif.relatedId}`);
          break;
        case 'leave':
          navigate(isEmp ? `/employee/leave/${notif.relatedId}` : isMgr ? `/manager/leave/${notif.relatedId}` : `/leaves/${notif.relatedId}`);
          break;
        case 'salary':
          navigate(isEmp ? `/employee/salary` : `/salary/${notif.relatedId}`);
          break;
        case 'task':
          if (notif.title?.toLowerCase().includes('submission') || notif.title?.toLowerCase().includes('work')) {
            navigate(isEmp ? `/employee/submissions/${notif.relatedId}` : isMgr ? `/manager/submissions/${notif.relatedId}` : `/submissions/${notif.relatedId}`);
          } else {
            navigate(isEmp ? `/employee/tasks/${notif.relatedId}` : isMgr ? `/manager/tasks/${notif.relatedId}` : `/tasks/${notif.relatedId}`);
          }
          break;
        case 'submission':
          navigate(isEmp ? `/employee/submissions/${notif.relatedId}` : isMgr ? `/manager/submissions/${notif.relatedId}` : `/submissions/${notif.relatedId}`);
          break;
        case 'announcement':
          navigate(isEmp ? `/employee/announcements/${notif.relatedId}` : `/announcements/${notif.relatedId}`);
          break;
        case 'performance':
          navigate(isEmp ? `/employee/performance/${notif.relatedId}` : isMgr ? `/manager/performance/${notif.relatedId}` : `/performance/${notif.relatedId}`);
          break;
        case 'document':
          navigate(isEmp ? `/employee/documents/${notif.relatedId}` : `/documents/${notif.relatedId}`);
          break;
        case 'attendance':
          navigate(isEmp ? `/employee/attendance` : isMgr ? `/manager/attendance` : `/attendance`);
          break;
      }
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'account':
        return <UserCheck size={20} />;
      case 'goal':
      case 'goals':
        return <Target size={20} />;
      case 'employee':
        return <User size={20} />;
      case 'leave':
        return <CalendarRange size={20} />;
      case 'salary':
        return <IndianRupee size={20} />;
      case 'task':
        return <CheckCheck size={20} />;
      case 'submission':
        return <Send size={20} />;
      case 'performance':
        return <Award size={20} />;
      case 'announcement':
        return <Bell size={20} />;
      case 'document':
        return <FileText size={20} />;
      case 'attendance':
        return <Clock size={20} />;
      default:
        return <Shield size={20} />;
    }
  };

  const startRecord = totalRecords > 0 ? (currentPage - 1) * limit + 1 : 0;
  const endRecord = Math.min(currentPage * limit, totalRecords);

  if (loading && notifications.length === 0) {
    return <Loader message="Loading notifications..." fullScreen={false} />;
  }

  return (
    <div className="notifications-page animate-fade-in">
      {/* Header Bar */}
      <div className="notifications-header-bar">
        <div className="notifications-title-group">
          <h1>Notifications</h1>
          <p>Stay updated on employee events, leave submissions, and system alerts.</p>
        </div>

        {unreadCount > 0 && (
          <button
            className="btn-secondary"
            onClick={handleMarkAllAsRead}
            id="mark-all-read-btn"
          >
            <CheckCheck size={16} />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="error-alert-box" role="alert" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
          <button className="retry-btn" onClick={fetchNotifications}>
            <RotateCw size={14} style={{ marginRight: '0.35rem' }} />
            Retry
          </button>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="notifications-filters-card">
        {/* Status Tabs (All / Unread / Read) */}
        <div className="notifications-status-tabs">
          <button
            className={`status-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => {
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            id="filter-status-all"
          >
            All
          </button>
          <button
            className={`status-tab-btn ${statusFilter === 'unread' ? 'active' : ''}`}
            onClick={() => {
              setStatusFilter('unread');
              setCurrentPage(1);
            }}
            id="filter-status-unread"
          >
            Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>
          <button
            className={`status-tab-btn ${statusFilter === 'read' ? 'active' : ''}`}
            onClick={() => {
              setStatusFilter('read');
              setCurrentPage(1);
            }}
            id="filter-status-read"
          >
            Read
          </button>
        </div>

        {/* Type Select Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.825rem', color: 'var(--slate-500)', fontWeight: 600 }}>
            Type:
          </label>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="sort-select"
            style={{ minWidth: 140, padding: '0.45rem 0.75rem' }}
            id="filter-type-select"
          >
            <option value="all">All Types</option>
            <option value="task">Tasks</option>
            <option value="leave">Leave</option>
            <option value="submission">Work Submission</option>
            <option value="performance">Performance</option>
            <option value="goal">Goals</option>
            <option value="announcement">Announcements</option>
            <option value="account">Account</option>
            <option value="document">Documents</option>
            <option value="attendance">Attendance</option>
            <option value="salary">Salary</option>
            <option value="employee">Employee</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      {/* Notifications List or Empty State */}
      {notifications.length > 0 ? (
        <>
          <div className="notifications-list">
            {notifications.map((n) => (
              <div
                key={n._id}
                className={`notification-card ${!n.isRead ? 'unread' : ''}`}
              >
                {/* Type Icon Badge */}
                <div className={`notification-icon-wrapper notification-icon-${n.type}`}>
                  {getTypeIcon(n.type)}
                </div>

                {/* Content */}
                <div className="notification-content">
                  <div className="notification-header-row">
                    <span className="notification-item-title">
                      {n.title}
                      {!n.isRead && <span className="notification-unread-dot" title="Unread" />}
                    </span>
                    <span className="notification-item-time">
                      {formatTimeAgo(n.createdAt)}
                    </span>
                  </div>

                  <p className="notification-item-message">{n.message}</p>

                  <div className="notification-actions-row">
                    {/* Related Entity Quick Navigation */}
                    {n.relatedId && (
                      <button
                        className="notification-action-btn"
                        onClick={() => handleNavigateRelated(n)}
                        title="View details"
                      >
                        <span>View Details</span>
                        <ArrowRight size={13} />
                      </button>
                    )}

                    {/* Mark As Read Button */}
                    {!n.isRead && (
                      <button
                        className="notification-action-btn"
                        onClick={(e) => handleMarkAsRead(n._id, e)}
                        title="Mark as read"
                      >
                        <Check size={13} />
                        <span>Mark as read</span>
                      </button>
                    )}

                    {/* Delete Button */}
                    <button
                      className="notification-delete-btn"
                      onClick={(e) => handleDeleteNotification(n._id, e)}
                      title="Delete notification"
                      aria-label="Delete notification"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Backend Pagination */}
          <div className="salary-pagination-bar" style={{ marginTop: '1.5rem' }}>
            <span className="salary-pagination-info">
              Showing {startRecord}–{endRecord} of {totalRecords} notifications
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
        /* Empty State */
        <div className="notification-empty-box">
          <div className="notification-empty-icon">
            <Sparkles size={32} />
          </div>
          <h3 className="notification-empty-title">You're all caught up</h3>
          <p className="notification-empty-desc">
            {statusFilter !== 'all' || typeFilter !== 'all'
              ? 'No notifications match your current filter settings.'
              : 'No new notifications at the moment.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
