import { useState, useEffect } from 'react';
import { Clock, Search, Download } from 'lucide-react';
import managerService from '../services/managerService.js';
import Loader from '../components/common/Loader.jsx';
import { useToast } from '../context/ToastContext.jsx';

const ManagerAttendancePage = () => {
  const { showError } = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ status: 'All' });

  useEffect(() => {
    fetchAttendance();
  }, [pagination.page, filters]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await managerService.getTeamAttendance({
        page: pagination.page,
        limit: pagination.limit,
        status: filters.status
      });
      if (res.success) {
        setRecords(res.records);
        setPagination(res.pagination);
      }
    } catch (err) {
      showError('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Present': return <span className="status-badge status-working">{status}</span>;
      case 'Late': return <span className="status-badge status-late">{status}</span>;
      case 'Absent': return <span className="status-badge status-absent">{status}</span>;
      default: return <span className="status-badge">{status}</span>;
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination({ ...pagination, page: newPage });
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>Team Attendance</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.5rem', fontSize: '0.875rem' }}>View the attendance history for your team members.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={filters.status}
          onChange={(e) => {
            setFilters({ ...filters, status: e.target.value });
            setPagination({ ...pagination, page: 1 });
          }}
          style={{ padding: '0.625rem 1rem', border: '1px solid var(--slate-300)', borderRadius: '0.5rem', outline: 'none', background: 'white' }}
        >
          <option value="All">All Statuses</option>
          <option value="Present">Present</option>
          <option value="Late">Late</option>
          <option value="Absent">Absent</option>
        </select>
      </div>

      {loading && records.length === 0 ? (
        <Loader />
      ) : (
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Employee</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Check In</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Check Out</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Hours</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                      No attendance records found.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec._id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', color: 'var(--slate-700)', fontWeight: 500 }}>
                        {new Date(rec.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--slate-900)' }}>
                        {rec.employee?.fullName}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>{formatTime(rec.checkIn)}</td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>{formatTime(rec.checkOut)}</td>
                      <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>
                        {rec.totalHours ? `${rec.totalHours.toFixed(2)}h` : '--'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        {getStatusBadge(rec.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>
                Showing {records.length} of {pagination.total} records
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  style={{ padding: '0.375rem 0.75rem', border: '1px solid var(--slate-300)', background: 'white', borderRadius: '0.375rem', cursor: pagination.page === 1 ? 'not-allowed' : 'pointer', opacity: pagination.page === 1 ? 0.5 : 1 }}
                >
                  Previous
                </button>
                <span style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem', fontWeight: 500 }}>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button 
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  style={{ padding: '0.375rem 0.75rem', border: '1px solid var(--slate-300)', background: 'white', borderRadius: '0.375rem', cursor: pagination.page === pagination.pages ? 'not-allowed' : 'pointer', opacity: pagination.page === pagination.pages ? 0.5 : 1 }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManagerAttendancePage;
