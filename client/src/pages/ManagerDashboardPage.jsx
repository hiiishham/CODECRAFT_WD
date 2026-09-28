import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CalendarRange,
  ArrowRight,
  RotateCw,
  CheckCircle,
  XCircle,
  BarChart3,
  FileCheck2,
  CheckSquare,
  AlertTriangle,
  FolderCheck,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import managerService from '../services/managerService.js';
import Loader from '../components/common/Loader.jsx';
import '../styles/dashboard.css';
import '../styles/leaves.css';

export const ManagerDashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchManagerStats = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await managerService.getDashboardStats();
      if (response.success) {
        setData(response.stats);
      } else {
        throw new Error(response.message || 'Failed to load manager metrics');
      }
    } catch (err) {
      console.error('[Manager Dashboard Error]:', err.message);
      setError(err.message || 'Failed to retrieve team statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagerStats();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return <Loader message="Loading team overview & workforce statistics..." />;
  }

  const stats = data || {
    totalTeamMembers: 0,
    present: 0,
    workingNow: 0,
    late: 0,
    absent: 0,
    onLeave: 0,
    pendingLeaves: 0,
    activeTasks: 0,
    pendingSubmissions: 0,
    avgAttendance: 0,
    completedGoals: 0,
    inProgressGoals: 0
  };

  return (
    <div className="dashboard-page animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Header Banner */}
      <div className="dashboard-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="dashboard-heading" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Manager'}!
          </h1>
          <p className="dashboard-subheading">Here's your team's overview and actionable metrics for today.</p>
        </div>
      </div>

      {error && (
        <div className="error-alert-box" role="alert">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
          <button className="retry-btn" onClick={fetchManagerStats}>
            <RotateCw size={14} style={{ marginRight: '0.35rem' }} />
            Retry
          </button>
        </div>
      )}

      {/* Main KPI Row */}
      <div className="summary-grid" style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1.25rem' }}>
        
        <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--slate-200)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Team</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--slate-900)', margin: '0.5rem 0 0 0' }}>{stats.totalTeamMembers}</h3>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--primary-50)', color: 'var(--primary-600)' }}>
              <Users size={24} />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--slate-200)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Working Now</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 700, color: '#16a34a', margin: '0.5rem 0 0 0' }}>{stats.workingNow}</h3>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: '#dcfce7', color: '#166534' }}>
              <UserCheck size={24} />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--slate-200)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Absent Today</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 700, color: '#dc2626', margin: '0.5rem 0 0 0' }}>{stats.absent}</h3>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: '#fee2e2', color: '#991b1b' }}>
              <UserX size={24} />
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--slate-200)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Attendance</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--slate-900)', margin: '0.5rem 0 0 0' }}>{stats.avgAttendance}%</h3>
            </div>
            <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: '#f3f4f6', color: '#374151' }}>
              <BarChart3 size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Row: Actionable items */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Leave Overview */}
        <section className="dashboard-card" style={{ background: 'white', borderRadius: '1rem', border: '1px solid var(--slate-200)' }}>
          <div className="card-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'space-between' }}>
            <h2 className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <CalendarRange size={18} color="var(--primary-600)" />
              <span>Leave Overview</span>
            </h2>
            <Link to="/manager/leave" style={{ fontSize: '0.875rem', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontWeight: 500 }}>
              Review <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b', margin: 0 }}>{stats.pendingLeaves}</p>
                <span style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>Pending Requests</span>
              </div>
              <div>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981', margin: 0 }}>{stats.onLeave}</p>
                <span style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>On Leave Today</span>
              </div>
            </div>
          </div>
        </section>

        {/* Task & Work Submissions */}
        <section className="dashboard-card" style={{ background: 'white', borderRadius: '1rem', border: '1px solid var(--slate-200)' }}>
          <div className="card-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'space-between' }}>
            <h2 className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <CheckSquare size={18} color="var(--primary-600)" />
              <span>Tasks & Submissions</span>
            </h2>
            <Link to="/manager/submissions" style={{ fontSize: '0.875rem', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontWeight: 500 }}>
              Submissions <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>{stats.activeTasks}</p>
                <span style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>Active Tasks</span>
              </div>
              <div>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6', margin: 0 }}>{stats.pendingSubmissions}</p>
                <span style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>Pending Review</span>
              </div>
            </div>
          </div>
        </section>

        {/* Performance Overview */}
        <section className="dashboard-card" style={{ background: 'white', borderRadius: '1rem', border: '1px solid var(--slate-200)' }}>
          <div className="card-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'space-between' }}>
            <h2 className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <TrendingUp size={18} color="var(--primary-600)" />
              <span>Team Performance</span>
            </h2>
            <Link to="/manager/performance" style={{ fontSize: '0.875rem', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontWeight: 500 }}>
              Overview <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981', margin: 0 }}>{stats.completedGoals}</p>
                <span style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>Goals Met</span>
              </div>
              <div>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#0ea5e9', margin: 0 }}>{stats.inProgressGoals}</p>
                <span style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>In Progress</span>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Quick Actions Panel */}
      <section className="quick-actions-bar" aria-label="Dashboard Quick Actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link to="/manager/team" className="quick-action-card" style={{ flex: '1', minWidth: '150px', background: 'white', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'var(--slate-700)', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div className="quick-action-icon" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <Users size={18} />
          </div>
          <span>My Team</span>
        </Link>
        <Link to="/manager/tasks" className="quick-action-card" style={{ flex: '1', minWidth: '150px', background: 'white', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'var(--slate-700)', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div className="quick-action-icon" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <CheckSquare size={18} />
          </div>
          <span>Team Tasks</span>
        </Link>
        <Link to="/manager/attendance" className="quick-action-card" style={{ flex: '1', minWidth: '150px', background: 'white', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'var(--slate-700)', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div className="quick-action-icon" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <Clock size={18} />
          </div>
          <span>Team Attendance</span>
        </Link>
        <Link to="/manager/submissions" className="quick-action-card" style={{ flex: '1', minWidth: '150px', background: 'white', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'var(--slate-700)', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <div className="quick-action-icon" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <FolderCheck size={18} />
          </div>
          <span>Review Work</span>
        </Link>
      </section>

    </div>
  );
};

export default ManagerDashboardPage;
