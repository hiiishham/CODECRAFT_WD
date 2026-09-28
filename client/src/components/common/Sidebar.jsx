import { useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarRange,
  BarChart3,
  IndianRupee,
  Bell,
  User,
  Settings,
  LogOut,
  X,
  Clock,
  CheckSquare,
  TrendingUp,
  FileText,
  FolderCheck,
  Megaphone,
  Award,
  ShieldAlert,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import { getDashboardPath } from '../../utils/roleRoutes.js';
import StaffPulseLogo from './StaffPulseLogo.jsx';

export const Sidebar = ({ 
  isOpen, 
  onClose, 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const handleLogout = async () => {
    if (onClose) onClose();
    await logout();
    navigate('/login', { replace: true });
  };

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const role = user?.role || 'employee';
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isEmployee = role === 'employee';
  const dashboardPath = getDashboardPath(role);

  /**
   * Precise active state matching for nested routes and sibling exclusion
   */
  const isRouteActive = (itemPath) => {
    const currentPath = location.pathname;

    // Exact matches for dashboard routes
    if (itemPath === '/dashboard' || itemPath === '/manager/dashboard' || itemPath === '/employee/dashboard') {
      return currentPath === itemPath;
    }

    // Specific exclusion: /performance vs /performance/goals
    if (itemPath === '/performance') {
      return (
        (currentPath === '/performance' || currentPath.startsWith('/performance/')) &&
        !currentPath.startsWith('/performance/goals')
      );
    }
    if (itemPath === '/performance/goals') {
      return currentPath === '/performance/goals' || currentPath.startsWith('/performance/goals/');
    }

    // Specific exclusion: /employee/performance vs /employee/performance/goals
    if (itemPath === '/employee/performance') {
      return (
        (currentPath === '/employee/performance' || currentPath.startsWith('/employee/performance/')) &&
        !currentPath.startsWith('/employee/performance/goals')
      );
    }
    if (itemPath === '/employee/performance/goals') {
      return currentPath === '/employee/performance/goals' || currentPath.startsWith('/employee/performance/goals/');
    }

    // Standard nested route matching (e.g. /employees/123, /employees/add)
    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
  };

  /**
   * Definitive Role-Based Navigation Items
   */
  const getNavItems = () => {
    if (isAdmin) {
      return [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Employees', path: '/employees', icon: Users },
        { label: 'Departments', path: '/departments', icon: Building2 },
        { label: 'Attendance', path: '/attendance', icon: Clock },
        { label: 'Leave Management', path: '/leaves', icon: CalendarRange },
        { label: 'Tasks', path: '/tasks', icon: CheckSquare },
        { label: 'Submissions', path: '/submissions', icon: FolderCheck },
        { label: 'Performance', path: '/performance', icon: Award },
        { label: 'Goals', path: '/performance/goals', icon: TrendingUp },
        { label: 'Salary', path: '/salary', icon: IndianRupee },
        { label: 'Documents', path: '/documents', icon: FileText },
        { label: 'Reports', path: '/reports', icon: BarChart3 },
        { label: 'Announcements', path: '/announcements', icon: Megaphone },
        { label: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
        { label: 'Audit Logs', path: '/audit-logs', icon: ShieldAlert },
        { label: 'Profile', path: '/profile', icon: User },
        { label: 'Settings', path: '/settings', icon: Settings },
        { label: 'Help Center', path: '/help-center', icon: HelpCircle },
      ];
    }

    if (isManager) {
      return [
        { label: 'Dashboard', path: '/manager/dashboard', icon: LayoutDashboard },
        { label: 'My Team', path: '/manager/team', icon: Users },
        { label: 'Tasks', path: '/manager/tasks', icon: CheckSquare },
        { label: 'Leave', path: '/manager/leave', icon: CalendarRange },
        { label: 'Attendance', path: '/manager/attendance', icon: Clock },
        { label: 'Submissions', path: '/manager/submissions', icon: FolderCheck },
        { label: 'Performance', path: '/manager/performance', icon: Award },
        { label: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
        { label: 'Profile', path: '/profile', icon: User },
        { label: 'Settings', path: '/settings', icon: Settings },
      ];
    }

    // Employee
    return [
      { label: 'Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
      { label: 'My Tasks', path: '/employee/tasks', icon: CheckSquare },
      { label: 'Attendance', path: '/employee/attendance', icon: Clock },
      { label: 'My Leave', path: '/employee/leave', icon: CalendarRange },
      { label: 'My Salary', path: '/employee/salary', icon: IndianRupee },
      { label: 'Performance', path: '/employee/performance', icon: Award },
      { label: 'Goals', path: '/employee/performance/goals', icon: TrendingUp },
      { label: 'My Documents', path: '/employee/documents', icon: FileText },
      { label: 'Submissions', path: '/employee/submissions', icon: FolderCheck },
      { label: 'Announcements', path: '/employee/announcements', icon: Megaphone },
      { label: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
      { label: 'Profile', path: '/profile', icon: User },
      { label: 'Settings', path: '/settings', icon: Settings },
    ];
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <Link 
            to={dashboardPath} 
            className="sidebar-brand-link" 
            onClick={handleNavClick} 
            title="StaffPulse — HR Management"
          >
            <StaffPulseLogo
              variant={isCollapsed ? 'compact' : 'full'}
              height={isCollapsed ? 32 : 38}
              className="sidebar-brand-img"
            />
          </Link>

          {/* Desktop Collapse Toggle */}
          {onToggleCollapse && (
            <button
              className="sidebar-collapse-btn desktop-only"
              onClick={onToggleCollapse}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            className="sidebar-close-btn mobile-only"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {!isCollapsed && <div className="nav-heading">Navigation</div>}

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={() => `nav-link ${active ? 'active' : ''}`}
                onClick={handleNavClick}
                title={isCollapsed ? item.label : undefined}
                data-testid={`sidebar-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="nav-link-icon-wrapper" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  <Icon size={18} />
                  {isCollapsed && item.badge > 0 && (
                    <span 
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -6,
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-500)'
                      }} 
                    />
                  )}
                </div>

                {!isCollapsed && (
                  <span className="nav-link-label" style={{ flex: 1 }}>
                    {item.label}
                  </span>
                )}

                {!isCollapsed && item.badge > 0 && (
                  <span 
                    className="nav-link-badge"
                    style={{
                      background: 'var(--primary-500)',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.45rem',
                      borderRadius: '10px',
                      lineHeight: 1
                    }}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="admin-profile-card">
            <div
              className="admin-avatar"
              style={{ overflow: 'hidden' }}
              title={user?.name || 'User'}
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

            {!isCollapsed && (
              <div className="admin-info" style={{ flex: 1, minWidth: 0 }}>
                <span className="admin-name" title={user?.name || 'User'}>
                  {user?.name || 'User'}
                </span>
                <span
                  className="admin-role"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--slate-500)',
                  }}
                >
                  {user?.role === 'admin' ? 'Administrator' : user?.role}
                </span>
              </div>
            )}
            
            {/* Direct Logout Action */}
            <button 
              style={{ 
                padding: '0.35rem', 
                color: 'var(--slate-400)', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color var(--transition-fast)'
              }}
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
              className="sidebar-logout-icon-btn"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
