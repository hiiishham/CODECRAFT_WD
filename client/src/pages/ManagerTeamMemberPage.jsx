import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Calendar, Clock, MapPin, CheckSquare, BarChart2 } from 'lucide-react';
import managerService from '../services/managerService.js';
import Loader from '../components/common/Loader.jsx';
import { toast } from 'react-hot-toast';

const ManagerTeamMemberPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const fetchEmployee = async () => {
    setLoading(true);
    try {
      const res = await managerService.getTeamMember(id);
      if (res.success) {
        setEmployee(res.employee);
      }
    } catch (err) {
      toast.error('Failed to load employee details');
      navigate('/manager/team');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'E';
    return name.split(' ').map(part => part[0]).join('').substring(0, 2).toUpperCase();
  };

  if (loading) return <Loader />;
  if (!employee) return null;

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate('/manager/team')}
        style={{ background: 'none', border: 'none', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '2rem', padding: 0 }}
      >
        <ArrowLeft size={16} /> Back to Team
      </button>

      {/* Profile Header */}
      <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', border: '1px solid var(--slate-200)', display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, flexShrink: 0 }}>
          {employee.profileImage ? (
            <img src={employee.profileImage} alt="profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : getInitials(employee.fullName)}
        </div>
        
        <div style={{ flex: 1, minWidth: '300px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>{employee.fullName}</h1>
            <span className={`status-badge status-${employee.status === 'Active' ? 'working' : 'absent'}`} style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
              {employee.status}
            </span>
          </div>
          <p style={{ margin: '0 0 1rem 0', color: 'var(--slate-600)', fontSize: '1rem' }}>
            {employee.designation} • {employee.department}
          </p>
          
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--slate-500)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={16} /> {employee.employeeId}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={16} /> {employee.email}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={16} /> {employee.phone}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16} /> Joined {new Date(employee.joiningDate).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--slate-800)', marginBottom: '1rem' }}>Manager Actions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <Link to={`/manager/tasks?employee=${employee._id}`} style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', textDecoration: 'none', color: 'var(--slate-700)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s', textAlign: 'center' }}>
          <div style={{ background: 'var(--primary-50)', padding: '0.75rem', borderRadius: '50%', color: 'var(--primary-600)' }}><CheckSquare size={24} /></div>
          <span style={{ fontWeight: 500 }}>View Tasks</span>
        </Link>
        <Link to={`/manager/attendance?search=${employee.fullName}`} style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', textDecoration: 'none', color: 'var(--slate-700)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s', textAlign: 'center' }}>
          <div style={{ background: 'var(--primary-50)', padding: '0.75rem', borderRadius: '50%', color: 'var(--primary-600)' }}><Clock size={24} /></div>
          <span style={{ fontWeight: 500 }}>Attendance Record</span>
        </Link>
        <Link to={`/manager/performance?employee=${employee._id}`} style={{ background: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', textDecoration: 'none', color: 'var(--slate-700)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s', textAlign: 'center' }}>
          <div style={{ background: 'var(--primary-50)', padding: '0.75rem', borderRadius: '50%', color: 'var(--primary-600)' }}><BarChart2 size={24} /></div>
          <span style={{ fontWeight: 500 }}>Performance & Goals</span>
        </Link>
      </div>
    </div>
  );
};

export default ManagerTeamMemberPage;
