import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Eye, User, FileText, CheckSquare, BarChart2 } from 'lucide-react';
import managerService from '../services/managerService.js';
import Loader from '../components/common/Loader.jsx';
import { toast } from 'react-hot-toast';

const ManagerTeamPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: 'All' });
  const [searchTerm, setSearchTerm] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm }));
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchTeam();
  }, [filters]);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await managerService.getTeam({ 
        search: filters.search, 
        status: filters.status 
      });
      if (res.success) {
        setEmployees(res.employees);
      }
    } catch (err) {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'E';
    return name.split(' ').map(part => part[0]).join('').substring(0, 2).toUpperCase();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Active': return 'status-badge status-working'; // using existing colors
      case 'Inactive': return 'status-badge status-absent';
      case 'On Leave': return 'status-badge status-on-leave';
      default: return 'status-badge';
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>My Team</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.5rem', fontSize: '0.875rem' }}>View and manage your assigned team members.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '0.625rem 1rem 0.625rem 2.5rem', border: '1px solid var(--slate-300)', borderRadius: '0.5rem', outline: 'none' }}
          />
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          style={{ padding: '0.625rem 1rem', border: '1px solid var(--slate-300)', borderRadius: '0.5rem', outline: 'none', background: 'white' }}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="On Leave">On Leave</option>
        </select>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--slate-50)', borderBottom: '1px solid var(--slate-200)' }}>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Employee</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Role</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                      No team members found.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp._id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                            {emp.profileImage ? (
                              <img src={emp.profileImage} alt="profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : getInitials(emp.fullName)}
                          </div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 500, color: 'var(--slate-900)' }}>{emp.fullName}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--slate-500)' }}>{emp.employeeId} • {emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <p style={{ margin: 0, fontWeight: 500, color: 'var(--slate-700)' }}>{emp.designation}</p>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span className={getStatusBadgeClass(emp.status)} style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {emp.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <Link 
                          to={`/manager/team/${emp._id}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--primary-50)', color: 'var(--primary-600)', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
                        >
                          <Eye size={16} /> View Details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerTeamPage;
