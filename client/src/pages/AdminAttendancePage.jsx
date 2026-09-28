import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAttendanceService } from '../services/adminAttendanceService';
import departmentService from '../services/departmentService';
import { 
  Download, 
  Search, 
  Edit2, 
  X, 
  Clock, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  UserX, 
  AlertCircle,
  LayoutGrid,
  List,
  Eye,
  RotateCcw
} from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader';
import '../styles/adminAttendance.css';

// Small helper to format duration live
const LiveDuration = ({ startMs }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000); // live update every second
    return () => clearInterval(interval);
  }, []);

  const diffMs = now - startMs;
  if (diffMs < 0) return '0h 0m 0s';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
};

// Modal Component for editing attendance
const EditAttendanceModal = ({ record, onClose, onSave }) => {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    checkIn: record.checkIn ? new Date(record.checkIn).toISOString().slice(0, 16) : '',
    checkOut: record.checkOut ? new Date(record.checkOut).toISOString().slice(0, 16) : '',
    status: record.status || 'Present',
    notes: record.notes || '',
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminAttendanceService.updateAttendance(record._id, {
        checkIn: formData.checkIn ? new Date(formData.checkIn).toISOString() : null,
        checkOut: formData.checkOut ? new Date(formData.checkOut).toISOString() : null,
        status: formData.status,
        notes: formData.notes,
      });
      showSuccess('Attendance updated successfully');
      onSave();
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Failed to update attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Attendance</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Employee</label>
            <input type="text" className="form-control" value={record.employee?.fullName || 'Employee'} disabled style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', background: '#f3f4f6' }} />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Date</label>
            <input type="text" className="form-control" value={new Date(record.date).toLocaleDateString()} disabled style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', background: '#f3f4f6' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Check In</label>
              <input 
                type="datetime-local" 
                className="form-control" 
                value={formData.checkIn} 
                onChange={e => setFormData({...formData, checkIn: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Check Out</label>
              <input 
                type="datetime-local" 
                className="form-control" 
                value={formData.checkOut} 
                onChange={e => setFormData({...formData, checkOut: e.target.value})}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Status</label>
            <select 
              className="form-control" 
              value={formData.status} 
              onChange={e => setFormData({...formData, status: e.target.value})}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
            >
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Half Day">Half Day</option>
              <option value="Absent">Absent</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Correction Notes (Required)</label>
            <textarea 
              className="form-control" 
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})}
              required
              rows="3"
              placeholder="E.g., Employee forgot to check out."
              style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ padding: '0.5rem 1rem', background: 'var(--primary-600)', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AdminAttendancePage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useToast();

  const [activeTab, setActiveTab] = useState('today');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Today's Workforce state
  const [workforce, setWorkforce] = useState([]);
  
  // History state
  const [history, setHistory] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  
  // Filters
  const [filters, setFilters] = useState({
    department: 'All',
    status: 'All',
    search: '',
    date: '',
  });

  // Debounced search
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [editingRecord, setEditingRecord] = useState(null);

  useEffect(() => {
    fetchDepartments();
    fetchSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'today') {
      fetchTodayWorkforce();
    } else {
      fetchHistory();
    }
  }, [activeTab, filters.department, filters.status, filters.search, filters.date, pagination.page]);

  const fetchDepartments = async () => {
    try {
      const res = await departmentService.getDepartments();
      setDepartments(res.departments || res.data || []);
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await adminAttendanceService.getDashboardSummary();
      if (res.success) setStats(res.stats);
    } catch (err) {
      console.error('Failed to load summary stats', err);
    }
  };

  const fetchTodayWorkforce = async () => {
    setLoading(true);
    try {
      const res = await adminAttendanceService.getTodayWorkforce();
      if (res.success) {
        let filtered = res.workforce || [];
        
        if (filters.department !== 'All') {
          filtered = filtered.filter(w => {
            const deptVal = typeof w.employee?.department === 'string'
              ? w.employee.department
              : w.employee?.department?.name || w.employee?.department?._id;
            return deptVal === filters.department;
          });
        }
        if (filters.status !== 'All') {
          filtered = filtered.filter(w => w.status === filters.status);
        }
        if (filters.search) {
          const s = filters.search.toLowerCase();
          filtered = filtered.filter(w => 
            w.employee?.fullName?.toLowerCase().includes(s) || 
            w.employee?.employeeId?.toLowerCase().includes(s) ||
            w.employee?.email?.toLowerCase().includes(s)
          );
        }
        
        setWorkforce(filtered);
      }
    } catch (err) {
      showError('Failed to load today workforce');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await adminAttendanceService.getAttendanceHistory({
        page: pagination.page,
        limit: 10,
        department: filters.department,
        status: filters.status,
        search: filters.search,
        date: filters.date || undefined,
      });
      if (res.success) {
        setHistory(res.records || []);
        setPagination(res.pagination || { page: 1, total: 0, pages: 1 });
      }
    } catch (err) {
      showError('Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      showInfo('Preparing export...');
      const blob = await adminAttendanceService.exportAttendance({
        department: filters.department,
        status: filters.status,
        search: filters.search,
        date: filters.date,
      });
      
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      showSuccess('Export downloaded successfully');
    } catch (err) {
      showError('Failed to export data');
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilters({
      department: 'All',
      status: 'All',
      search: '',
      date: '',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'Working': return 'status-working';
      case 'Present': return 'status-present';
      case 'Late': return 'status-late';
      case 'Absent': return 'status-absent';
      case 'On Leave': return 'status-on-leave';
      case 'Half Day': return 'status-late';
      default: return 'status-present';
    }
  };

  return (
    <div className="admin-attendance-page">
      <div className="attendance-header">
        <h1>Attendance & Workforce</h1>
        <p>Monitor real-time employee attendance, working statuses, and shift durations.</p>
      </div>

      {stats && (
        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-card-title">Total Employees</span>
            <span className="summary-card-value">{stats.totalEmployees}</span>
          </div>
          <div className="summary-card">
            <span className="summary-card-title">Present</span>
            <span className="summary-card-value">{stats.present}</span>
          </div>
          <div className="summary-card highlight">
            <span className="summary-card-title">Working</span>
            <span className="summary-card-value">{stats.workingNow}</span>
          </div>
          <div className="summary-card">
            <span className="summary-card-title">Late</span>
            <span className="summary-card-value">{stats.late}</span>
          </div>
          <div className="summary-card">
            <span className="summary-card-title">Absent</span>
            <span className="summary-card-value">{stats.absent}</span>
          </div>
          <div className="summary-card">
            <span className="summary-card-title">On Leave</span>
            <span className="summary-card-value">{stats.onLeave}</span>
          </div>
        </div>
      )}

      {/* Filter toolbar */}
      <div className="filters-row">
        <div className="filters-group">
          <div className="search-input">
            <Search size={18} color="#9ca3af" />
            <input 
              type="text" 
              placeholder="Search by name, ID, or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            className="filter-select"
            value={filters.department}
            onChange={(e) => {
              setFilters({...filters, department: e.target.value});
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            <option value="All">All Departments</option>
            {departments.map(d => (
              <option key={d._id} value={d.name || d._id}>{d.name}</option>
            ))}
          </select>

          <select 
            className="filter-select"
            value={filters.status}
            onChange={(e) => {
              setFilters({...filters, status: e.target.value});
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            <option value="All">All Statuses</option>
            <option value="Working">Working</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Half Day">Half Day</option>
            <option value="Absent">Absent</option>
            <option value="On Leave">On Leave</option>
          </select>

          <input 
            type="date"
            className="filter-select"
            value={filters.date}
            onChange={(e) => {
              setFilters({ ...filters, date: e.target.value });
              if (activeTab === 'today' && e.target.value) {
                setActiveTab('history');
              }
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            title="Filter by specific date"
          />

          {(filters.department !== 'All' || filters.status !== 'All' || filters.search || filters.date) && (
            <button 
              onClick={handleResetFilters}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--slate-300)',
                background: 'white',
                color: 'var(--slate-600)',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
              title="Reset all filters"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          )}
        </div>

        <button className="export-btn" onClick={handleExport}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--slate-200)', marginBottom: '1.5rem' }}>
        <div className="tabs-container" style={{ margin: 0, border: 'none' }}>
          <button 
            className={`tab-btn ${activeTab === 'today' ? 'active' : ''}`}
            onClick={() => { setActiveTab('today'); setPagination(prev => ({ ...prev, page: 1 })); }}
          >
            Today's Attendance & Workforce
          </button>
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => { setActiveTab('history'); setPagination(prev => ({ ...prev, page: 1 })); }}
          >
            Attendance History
          </button>
        </div>

        {activeTab === 'today' && (
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--slate-100)', padding: '0.25rem', borderRadius: '0.5rem' }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.65rem',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: viewMode === 'table' ? 'white' : 'transparent',
                color: viewMode === 'table' ? 'var(--slate-900)' : 'var(--slate-500)',
                boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <List size={15} /> Table View
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.65rem',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: viewMode === 'grid' ? 'white' : 'transparent',
                color: viewMode === 'grid' ? 'var(--slate-900)' : 'var(--slate-500)',
                boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              <LayoutGrid size={15} /> Cards View
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <Loader />
      ) : activeTab === 'today' ? (
        <>
          {workforce.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              No employees match your filters.
            </div>
          ) : viewMode === 'table' ? (
            <div style={{ overflowX: 'auto', background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.8rem', textTransform: 'uppercase' }}>Employee</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.8rem', textTransform: 'uppercase' }}>Department</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.8rem', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.8rem', textTransform: 'uppercase' }}>Check In</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.8rem', textTransform: 'uppercase' }}>Check Out</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.8rem', textTransform: 'uppercase' }}>Total Hours</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.8rem', textTransform: 'uppercase' }}>Working State</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.8rem', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workforce.map(member => {
                    const empId = member.employee?._id || member.employee?.id;
                    const isWorking = member.status === 'Working';
                    return (
                      <tr key={member.employee._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="workforce-avatar" style={{ width: 34, height: 34, fontSize: '0.875rem' }}>
                              {member.employee.avatar ? (
                                <img src={member.employee.avatar} alt="avatar" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}}/>
                              ) : (
                                member.employee.fullName?.charAt(0) || 'U'
                              )}
                            </div>
                            <div>
                              <button 
                                onClick={() => navigate(`/attendance/${empId}`)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  fontWeight: 600,
                                  color: 'var(--primary-700)',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  fontSize: '0.9rem'
                                }}
                                title="View employee attendance history"
                              >
                                {member.employee.fullName}
                              </button>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{member.employee.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                          {typeof member.employee?.department === 'string'
                            ? member.employee.department
                            : member.employee?.department?.name || 'No Dept'}
                        </td>
                        <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                          {new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                          {member.attendance?.checkIn 
                            ? new Date(member.attendance.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                            : '--:--'}
                        </td>
                        <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>
                          {member.attendance?.checkOut 
                            ? new Date(member.attendance.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                            : isWorking ? <span style={{ color: '#16a34a', fontWeight: 600 }}>Active Now</span> : '--:--'}
                        </td>
                        <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem', fontWeight: 600 }}>
                          {isWorking && member.attendance?.checkIn ? (
                            <LiveDuration startMs={new Date(member.attendance.checkIn).getTime()} />
                          ) : member.attendance?.totalHours ? (
                            `${Math.floor(member.attendance.totalHours)}h ${Math.round((member.attendance.totalHours % 1) * 60)}m`
                          ) : '--'}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span className={`status-badge ${getStatusBadgeClass(member.status)}`}>
                            {member.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {isWorking ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#16a34a', fontWeight: 600, fontSize: '0.8rem' }}>
                              <span className="live-indicator"></span> Working Live
                            </span>
                          ) : member.attendance?.checkOut ? (
                            <span style={{ color: '#4b5563', fontSize: '0.8rem' }}>Shift Completed</span>
                          ) : member.status === 'On Leave' ? (
                            <span style={{ color: '#9333ea', fontSize: '0.8rem' }}>Approved Leave</span>
                          ) : (
                            <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Not In Shift</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button 
                              className="action-btn" 
                              title="View Employee History" 
                              onClick={() => navigate(`/attendance/${empId}`)}
                            >
                              <Eye size={16} />
                            </button>
                            {member.attendance && (
                              <button 
                                className="action-btn" 
                                title="Edit Attendance" 
                                onClick={() => setEditingRecord({
                                  ...member.attendance,
                                  employee: member.employee
                                })}
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="workforce-grid">
              {workforce.map(member => {
                const empId = member.employee?._id || member.employee?.id;
                return (
                  <div key={member.employee._id} className="workforce-card">
                    <div className="workforce-card-header">
                      <div className="workforce-employee-info">
                        <div className="workforce-avatar">
                          {member.employee.avatar ? (
                            <img src={member.employee.avatar} alt="avatar" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}}/>
                          ) : (
                            member.employee.fullName?.charAt(0) || 'U'
                          )}
                        </div>
                        <div className="workforce-details">
                          <h3 
                            style={{ cursor: 'pointer', color: 'var(--primary-700)' }}
                            onClick={() => navigate(`/attendance/${empId}`)}
                            title="Click to view employee details"
                          >
                            {member.employee.fullName}
                          </h3>
                          <p>
                            {typeof member.employee?.department === 'string'
                              ? member.employee.department
                              : member.employee?.department?.name || 'No Dept'} • {member.employee.employeeId}
                          </p>
                        </div>
                      </div>
                      <div className={`status-badge ${getStatusBadgeClass(member.status)}`}>
                        {member.status === 'Working' && <span className="live-indicator"></span>}
                        {member.status}
                      </div>
                    </div>

                    <div className="workforce-stats">
                      <div className="workforce-stat-col">
                        <span className="workforce-stat-label">Check In</span>
                        <span className="workforce-stat-value">
                          {member.attendance?.checkIn ? new Date(member.attendance.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                        </span>
                      </div>
                      <div className="workforce-stat-col">
                        <span className="workforce-stat-label">Check Out</span>
                        <span className="workforce-stat-value">
                          {member.attendance?.checkOut ? new Date(member.attendance.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                        </span>
                      </div>
                      <div className="workforce-stat-col">
                        <span className="workforce-stat-label">Duration</span>
                        <span className="workforce-stat-value">
                          {member.status === 'Working' && member.attendance?.checkIn ? (
                            <LiveDuration startMs={new Date(member.attendance.checkIn).getTime()} />
                          ) : member.attendance?.totalHours ? (
                            `${Math.floor(member.attendance.totalHours)}h ${Math.round((member.attendance.totalHours % 1) * 60)}m`
                          ) : '--'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button 
                        onClick={() => navigate(`/attendance/${empId}`)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '0.375rem',
                          border: '1px solid var(--slate-200)',
                          background: 'white',
                          color: 'var(--slate-700)',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Eye size={13} /> View History
                      </button>
                      {member.attendance && (
                        <button 
                          onClick={() => setEditingRecord({
                            ...member.attendance,
                            employee: member.employee
                          })}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '0.375rem',
                            border: '1px solid var(--slate-200)',
                            background: 'white',
                            color: 'var(--slate-700)',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ overflowX: 'auto', background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <th style={{ padding: '1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.8rem', textTransform: 'uppercase' }}>Employee</th>
                  <th style={{ padding: '1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.8rem', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.8rem', textTransform: 'uppercase' }}>Check In</th>
                  <th style={{ padding: '1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.8rem', textTransform: 'uppercase' }}>Check Out</th>
                  <th style={{ padding: '1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.8rem', textTransform: 'uppercase' }}>Total Hours</th>
                  <th style={{ padding: '1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.8rem', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#6b7280' }}>No attendance records found.</td>
                  </tr>
                ) : (
                  history.map(record => {
                    const empId = record.employee?._id || record.employee?.id;
                    return (
                      <tr key={record._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '1rem' }}>
                          <button 
                            onClick={() => empId && navigate(`/attendance/${empId}`)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              fontWeight: 600,
                              color: 'var(--primary-700)',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            {record.employee?.fullName || 'Employee'}
                          </button>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{record.employee?.employeeId}</div>
                        </td>
                        <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>{new Date(record.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</td>
                        <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem' }}>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</td>
                        <td style={{ padding: '1rem', color: '#374151', fontSize: '0.875rem', fontWeight: 600 }}>
                          {record.totalHours ? `${Math.floor(record.totalHours)}h ${Math.round((record.totalHours % 1) * 60)}m` : '--'}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span className={`status-badge ${getStatusBadgeClass(record.status)}`}>{record.status}</span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button 
                              className="action-btn" 
                              title="View Employee Attendance" 
                              onClick={() => empId && navigate(`/attendance/${empId}`)}
                            >
                              <Eye size={16} />
                            </button>
                            <button 
                              className="action-btn" 
                              title="Edit Attendance" 
                              onClick={() => setEditingRecord(record)}
                            >
                              <Edit2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {history.length > 0 && (
            <div className="pagination-controls">
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Showing page {pagination.page} of {pagination.pages} ({pagination.total} total records)
              </span>
              <div className="pagination-buttons">
                <button 
                  className="pagination-btn" 
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
                >
                  Previous
                </button>
                <button 
                  className="pagination-btn" 
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.page + 1, pagination.pages) }))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {editingRecord && (
        <EditAttendanceModal 
          record={editingRecord} 
          onClose={() => setEditingRecord(null)} 
          onSave={() => {
            setEditingRecord(null);
            if (activeTab === 'today') {
              fetchTodayWorkforce();
            } else {
              fetchHistory();
            }
            fetchSummary();
          }} 
        />
      )}
    </div>
  );
};

export default AdminAttendancePage;
