import { useState, useEffect } from 'react';
import { Search, Download, Filter, Eye, ShieldAlert, History } from 'lucide-react';
import auditService from '../services/auditService.js';
import Loader from '../components/common/Loader.jsx';
import { toast } from 'react-hot-toast';

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ search: '', module: '', action: '', userRole: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm }));
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchLogs();
  }, [pagination.page, filters.module, filters.action, filters.userRole, filters.search]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditService.getAuditLogs({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });
      if (res.success) {
        setLogs(res.logs);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return toast.error('No data to export');
    
    const headers = ['Date,User,Role,Action,Module,Description,Target Type,Target ID'];
    const rows = logs.map(log => {
      return `"${new Date(log.createdAt).toLocaleString()}","${log.user?.fullName || log.user?.email || 'System'}","${log.userRole}","${log.action}","${log.module}","${log.description.replace(/"/g, '""')}","${log.targetType || ''}","${log.targetId || ''}"`;
    });
    
    const csvContent = headers.concat(rows).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return '#10b981';
      case 'UPDATE': return '#3b82f6';
      case 'DELETE': return '#ef4444';
      case 'LOGIN': return '#8b5cf6';
      case 'LOGOUT': return '#6b7280';
      case 'APPROVE': return '#16a34a';
      case 'REJECT': return '#dc2626';
      default: return '#f59e0b';
    }
  };

  const formatJSON = (obj) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--slate-900)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={28} color="var(--primary-600)" />
            System Audit Logs
          </h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.5rem', fontSize: '0.875rem' }}>Immutable record of all critical system activities.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          style={{ padding: '0.625rem 1.25rem', background: 'white', color: 'var(--slate-700)', border: '1px solid var(--slate-300)', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
          <input
            type="text"
            placeholder="Search descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.625rem 1rem 0.625rem 2.5rem', border: '1px solid var(--slate-300)', borderRadius: '0.5rem', outline: 'none' }}
          />
        </div>

        <select
          value={filters.module}
          onChange={(e) => setFilters({ ...filters, module: e.target.value })}
          style={{ padding: '0.625rem 1rem', border: '1px solid var(--slate-300)', borderRadius: '0.5rem', outline: 'none', background: 'white' }}
        >
          <option value="">All Modules</option>
          <option value="AUTH">Auth</option>
          <option value="EMPLOYEE">Employee</option>
          <option value="DEPARTMENT">Department</option>
          <option value="LEAVE">Leave</option>
          <option value="TASK">Task</option>
          <option value="SALARY">Salary</option>
          <option value="PERFORMANCE">Performance</option>
          <option value="SETTINGS">Settings</option>
        </select>

        <select
          value={filters.action}
          onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          style={{ padding: '0.625rem 1rem', border: '1px solid var(--slate-300)', borderRadius: '0.5rem', outline: 'none', background: 'white' }}
        >
          <option value="">All Actions</option>
          <option value="LOGIN">Login</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="APPROVE">Approve</option>
          <option value="REJECT">Reject</option>
        </select>
        
        <select
          value={filters.userRole}
          onChange={(e) => setFilters({ ...filters, userRole: e.target.value })}
          style={{ padding: '0.625rem 1rem', border: '1px solid var(--slate-300)', borderRadius: '0.5rem', outline: 'none', background: 'white' }}
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>
      </div>

      {loading && logs.length === 0 ? (
        <Loader />
      ) : (
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Date & Time</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>User</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Role</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Action</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Module</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                      <History size={48} color="var(--slate-300)" style={{ margin: '0 auto 1rem', display: 'block' }} />
                      No audit logs found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--slate-700)', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--slate-900)' }}>
                        {log.user?.fullName || log.user?.email || 'System'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem', background: 'var(--slate-100)', color: 'var(--slate-700)', borderRadius: '999px', textTransform: 'capitalize' }}>
                          {log.userRole}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: getActionColor(log.action) }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--slate-700)' }}>{log.module}</td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--slate-600)', maxWidth: '250px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.description}>{log.description}</div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => setSelectedLog(log)}
                          style={{ background: 'none', border: 'none', color: 'var(--primary-600)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}
                        >
                          <Eye size={16} /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>
                Showing page {pagination.page} of {pagination.pages} ({pagination.totalRecords} logs)
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  style={{ padding: '0.375rem 0.75rem', border: '1px solid var(--slate-300)', background: 'white', borderRadius: '0.375rem', cursor: pagination.page === 1 ? 'not-allowed' : 'pointer', opacity: pagination.page === 1 ? 0.5 : 1 }}
                >
                  Prev
                </button>
                <button 
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
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

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '1rem', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Audit Log Details</h2>
              <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--slate-500)' }}>&times;</button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Date & Time</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{new Date(selectedLog.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>User</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{selectedLog.user?.fullName || selectedLog.user?.email || 'System'} ({selectedLog.userRole})</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Action</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: getActionColor(selectedLog.action) }}>{selectedLog.action}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Module</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{selectedLog.module}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>IP Address</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, fontFamily: 'monospace' }}>{selectedLog.ipAddress || 'N/A'}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Target ID</label>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, fontFamily: 'monospace' }}>{selectedLog.targetId || 'N/A'}</div>
                </div>
              </div>
              
              <div style={{ padding: '1rem', background: 'var(--slate-50)', borderRadius: '0.5rem', border: '1px solid var(--slate-200)' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600 }}>Description</label>
                <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{selectedLog.description}</div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Metadata Payload</label>
                <pre style={{ background: '#1e293b', color: '#e2e8f0', padding: '1rem', borderRadius: '0.5rem', overflowX: 'auto', fontSize: '0.8125rem', margin: 0 }}>
                  {formatJSON(selectedLog.metadata)}
                </pre>
              </div>
              
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--slate-500)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>User Agent</label>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-600)', wordBreak: 'break-all' }}>{selectedLog.userAgent || 'N/A'}</div>
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--slate-200)', background: 'var(--slate-50)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedLog(null)} style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid var(--slate-300)', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 500 }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
