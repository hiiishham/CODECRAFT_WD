import { useState, useEffect } from 'react';
import { 
  Users, Building2, UserPlus, ShieldAlert, FolderCheck, 
  CalendarRange, CheckCircle, XCircle, IndianRupee, Clock,
  BarChart3, Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import analyticsService from '../../services/analyticsService.js';
import Loader from '../common/Loader.jsx';
import { formatCurrency } from '../../utils/currency.js';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'react-hot-toast';

const AdminSuperDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('This Month');

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await analyticsService.getSuperDashboardStats({ dateFilter });
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) return <Loader />;
  if (!data) return null;

  const { stats, recentActivity, activityTrend = [] } = data;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header & Global Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--slate-900)' }}>Super Dashboard</h2>
          <p style={{ margin: 0, color: 'var(--slate-500)', fontSize: '0.875rem' }}>Overview of the entire organization.</p>
        </div>
        <select 
          value={dateFilter} 
          onChange={(e) => setDateFilter(e.target.value)}
          style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid var(--slate-300)', background: 'white', outline: 'none' }}
        >
          <option value="Today">Today</option>
          <option value="This Week">This Week</option>
          <option value="This Month">This Month</option>
          <option value="Last Month">Last Month</option>
          <option value="This Year">This Year</option>
          <option value="All Time">All Time</option>
        </select>
      </div>

      {/* KPI Cards Grid */}
      <div className="super-kpi-grid">
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--primary-50)', color: 'var(--primary-600)', borderRadius: '0.75rem' }}><Users size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--slate-500)', fontWeight: 500 }}>Total Employees</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{stats.totalEmployees}</h3>
          </div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '0.75rem' }}><CheckCircle size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--slate-500)', fontWeight: 500 }}>Active Employees</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{stats.activeEmployees}</h3>
          </div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#fce7f3', color: '#be185d', borderRadius: '0.75rem' }}><UserPlus size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--slate-500)', fontWeight: 500 }}>New Employees</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{stats.newEmployees}</h3>
          </div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#ffedd5', color: '#c2410c', borderRadius: '0.75rem' }}><Building2 size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--slate-500)', fontWeight: 500 }}>Departments</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{stats.totalDepartments}</h3>
          </div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '0.75rem' }}><Clock size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--slate-500)', fontWeight: 500 }}>Present Today</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{stats.presentToday}</h3>
          </div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#fef3c7', color: '#b45309', borderRadius: '0.75rem' }}><CalendarRange size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--slate-500)', fontWeight: 500 }}>On Leave Today</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{stats.onLeaveToday}</h3>
          </div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f3e8ff', color: '#7e22ce', borderRadius: '0.75rem' }}><FolderCheck size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--slate-500)', fontWeight: 500 }}>Active Tasks</p>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{stats.activeTasks}</h3>
          </div>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--slate-200)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#ecfdf5', color: '#047857', borderRadius: '0.75rem' }}><IndianRupee size={24} /></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--slate-500)', fontWeight: 500 }}>Total Payroll</p>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{formatCurrency(stats.totalPayroll)}</h3>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="dashboard-main-grid">
        {/* Platform Activity Trend (Live Database Aggregation) */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--slate-200)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--slate-900)' }}>Platform Activity Trend</h3>
            <span style={{ fontSize: '0.75rem', background: 'var(--slate-100)', color: 'var(--slate-600)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 600 }}>Last 7 Days</span>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-500)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary-500)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--slate-400)' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--slate-400)' }} />
                <CartesianGrid vertical={false} stroke="var(--slate-100)" />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="value" stroke="var(--primary-500)" strokeWidth={3} fillOpacity={1} fill="url(#colorUv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent System Activity */}
        <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid var(--slate-200)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--slate-50)' }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="var(--primary-600)" />
              Recent Activity
            </h3>
            <Link to="/audit-logs" style={{ fontSize: '0.875rem', color: 'var(--primary-600)', textDecoration: 'none', fontWeight: 500 }}>
              View All
            </Link>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.5rem' }}>
            {recentActivity.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--slate-500)', marginTop: '2rem' }}>No recent activity.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recentActivity.map((log, i) => (
                  <div key={log._id} style={{ display: 'flex', gap: '1rem', padding: '1rem 0', borderBottom: i !== recentActivity.length - 1 ? '1px solid var(--slate-100)' : 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: log.action === 'CREATE' ? '#10b981' : log.action === 'DELETE' ? '#ef4444' : log.action === 'LOGIN' ? '#8b5cf6' : 'var(--primary-500)', marginTop: '0.375rem' }}></div>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: 'var(--slate-900)', lineHeight: 1.4 }}>
                        <span style={{ fontWeight: 600 }}>{log.user?.fullName || log.user?.email || 'System'}</span> {log.description}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span style={{ fontSize: '0.625rem', background: 'var(--slate-100)', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', color: 'var(--slate-600)' }}>
                          {log.module}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSuperDashboard;
