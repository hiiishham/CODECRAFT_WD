import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAttendanceService } from '../services/adminAttendanceService';
import { ArrowLeft, Clock, Calendar as CalendarIcon, CheckCircle2, UserX, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader';
import { useUrlFilters } from '../hooks/useUrlFilters.js';
import { AdvancedFilters, FilterSelect } from '../components/common/AdvancedFilters.jsx';
import '../styles/adminAttendance.css';

const AdminEmployeeAttendancePage = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const { filters, setFilter } = useUrlFilters({
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear())
  });

  const month = parseInt(filters.month, 10);
  const year = parseInt(filters.year, 10);

  useEffect(() => {
    fetchDetails();
  }, [employeeId, month, year]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await adminAttendanceService.getEmployeeAttendanceDetails(employeeId, { month, year });
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      showError('Failed to load employee attendance details');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) return <Loader />;
  if (!data) return <div style={{ padding: '2rem', textAlign: 'center' }}>Employee not found.</div>;

  const { employee, liveStatus, todayAttendance, monthlySummary, history } = data;

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'Working': return 'status-working';
      case 'Present': return 'status-present';
      case 'Late': return 'status-late';
      case 'Absent': return 'status-absent';
      case 'On Leave': return 'status-on-leave';
      case 'Half Day': return 'status-late'; // Using late color (yellow) for Half Day
      default: return 'status-present';
    }
  };

  return (
    <div className="admin-attendance-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/attendance')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '50%', backgroundColor: 'var(--slate-100)' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>
            {employee.fullName}'s Attendance
          </h1>
          <p style={{ color: 'var(--slate-500)', margin: 0, fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {employee.employeeId} • {typeof employee.department === 'string' ? employee.department : employee.department?.name || 'No Department'}
          </p>
        </div>
      </div>

      {/* Today Live Status */}
      <div style={{ background: 'white', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid var(--slate-200)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>Today's Status</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className={`status-badge ${getStatusBadgeClass(liveStatus)}`} style={{ fontSize: '1rem', padding: '0.375rem 0.75rem' }}>
              {liveStatus === 'Working' && <span className="live-indicator"></span>}
              {liveStatus}
            </span>
            {todayAttendance?.checkIn && (
              <span style={{ fontSize: '0.875rem', color: 'var(--slate-600)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Clock size={16} /> 
                In: {new Date(todayAttendance.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                {todayAttendance.checkOut && ` • Out: ${new Date(todayAttendance.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--slate-800)', margin: 0 }}>Monthly Summary</h2>
      </div>

      <AdvancedFilters activeCount={0} onClear={() => {}}>
        <FilterSelect
          label="Month"
          value={String(month)}
          onChange={(val) => setFilter('month', val)}
          options={Array.from({length: 12}).map((_, i) => ({
            label: new Date(0, i).toLocaleString('default', { month: 'long' }),
            value: String(i+1)
          }))}
        />
        
        <FilterSelect
          label="Year"
          value={String(year)}
          onChange={(val) => setFilter('year', val)}
          options={[year-1, year, year+1].map(y => ({
            label: String(y),
            value: String(y)
          }))}
        />
      </AdvancedFilters>

      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-card-title">Present</span>
          <span className="summary-card-value">{monthlySummary.present} <span style={{fontSize:'0.875rem', color:'var(--slate-400)', fontWeight:400}}>days</span></span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Late</span>
          <span className="summary-card-value" style={{color: monthlySummary.late > 0 ? '#b45309' : 'inherit'}}>{monthlySummary.late} <span style={{fontSize:'0.875rem', color:'var(--slate-400)', fontWeight:400}}>days</span></span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">On Leave</span>
          <span className="summary-card-value">{monthlySummary.leave} <span style={{fontSize:'0.875rem', color:'var(--slate-400)', fontWeight:400}}>days</span></span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Total Hours</span>
          <span className="summary-card-value">{Math.floor(monthlySummary.totalWorkingHours)}<span style={{fontSize:'0.875rem', color:'var(--slate-400)', fontWeight:400}}>h</span></span>
        </div>
        <div className="summary-card">
          <span className="summary-card-title">Avg Hours/Day</span>
          <span className="summary-card-value">{monthlySummary.averageWorkingHours}<span style={{fontSize:'0.875rem', color:'var(--slate-400)', fontWeight:400}}>h</span></span>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--slate-800)', margin: '2rem 0 1rem 0' }}>Attendance History</h2>
      
      {loading ? <Loader /> : (
        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                <th style={{ padding: '1rem', fontWeight: 500, color: '#6b7280', fontSize: '0.875rem' }}>Date</th>
                <th style={{ padding: '1rem', fontWeight: 500, color: '#6b7280', fontSize: '0.875rem' }}>Check In</th>
                <th style={{ padding: '1rem', fontWeight: 500, color: '#6b7280', fontSize: '0.875rem' }}>Check Out</th>
                <th style={{ padding: '1rem', fontWeight: 500, color: '#6b7280', fontSize: '0.875rem' }}>Total Hours</th>
                <th style={{ padding: '1rem', fontWeight: 500, color: '#6b7280', fontSize: '0.875rem' }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: 500, color: '#6b7280', fontSize: '0.875rem' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No attendance records found for this month.</td>
                </tr>
              ) : (
                history.map(record => (
                  <tr key={record._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '1rem', color: '#111827', fontWeight: 500 }}>
                      {new Date(record.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '1rem', color: '#374151' }}>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}</td>
                    <td style={{ padding: '1rem', color: '#374151' }}>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}</td>
                    <td style={{ padding: '1rem', color: '#374151' }}>
                      {record.totalHours ? `${Math.floor(record.totalHours)}h ${Math.round((record.totalHours % 1) * 60)}m` : '--'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`status-badge ${getStatusBadgeClass(record.status)}`}>{record.status}</span>
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem', maxWidth: '200px' }}>
                      {record.notes ? (
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={record.notes}>
                          {record.notes}
                        </div>
                      ) : '--'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminEmployeeAttendancePage;
