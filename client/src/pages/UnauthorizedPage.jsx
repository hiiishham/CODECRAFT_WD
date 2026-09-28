import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getDashboardPath } from '../utils/roleRoutes.js';
import StaffPulseLogo from '../components/common/StaffPulseLogo.jsx';

export const UnauthorizedPage = ({ requiredRoles = [] }) => {
  const { user } = useAuth();
  const dashboardPath = getDashboardPath(user?.role);
  const canViewEmployees = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div
      className="animate-fade-in"
      style={{
        maxWidth: 600,
        margin: '3rem auto',
        padding: '3rem 2rem',
        background: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--slate-200)',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'center',
      }}
    >
      <div style={{ marginBottom: '2rem' }}>
        <StaffPulseLogo variant="full" height={38} to={dashboardPath} />
      </div>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger-dot)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          border: '1px solid var(--danger-border)',
        }}
      >
        <ShieldAlert size={32} />
      </div>

      <span
        style={{
          display: 'inline-block',
          padding: '0.2rem 0.65rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--danger-bg)',
          color: 'var(--danger-text)',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: '0.75rem',
          border: '1px solid var(--danger-border)',
        }}
      >
        403 Forbidden
      </span>

      <h1
        style={{
          fontSize: '1.6rem',
          fontWeight: 800,
          color: 'var(--slate-900)',
          marginBottom: '0.6rem',
        }}
      >
        Access Restricted
      </h1>

      <p
        style={{
          fontSize: '0.95rem',
          color: 'var(--slate-500)',
          lineHeight: 1.5,
          marginBottom: '1.75rem',
        }}
      >
        You don't have permission to access this page. Your current account role is{' '}
        <strong style={{ color: 'var(--slate-800)', textTransform: 'capitalize' }}>
          {user?.role || 'user'}
        </strong>
        {requiredRoles.length > 0 && (
          <span>, which requires role: {requiredRoles.join(', ')}</span>
        )}
        .
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          to={dashboardPath}
          className="btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          id="unauthorized-dashboard-btn"
        >
          <LayoutDashboard size={16} />
          <span>Go to My Dashboard</span>
        </Link>
        {canViewEmployees && (
          <Link
            to="/employees"
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={16} />
            <span>View Team Directory</span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default UnauthorizedPage;
