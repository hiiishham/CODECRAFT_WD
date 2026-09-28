import { Link } from 'react-router-dom';
import { FileQuestion, LayoutDashboard, ArrowLeft } from 'lucide-react';
import StaffPulseLogo from '../components/common/StaffPulseLogo.jsx';

export const NotFoundPage = () => {
  return (
    <div
      className="animate-fade-in"
      style={{
        maxWidth: 600,
        margin: '4rem auto',
        padding: '3.5rem 2rem',
        background: 'var(--card-bg, #ffffff)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--slate-200)',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'center',
      }}
    >
      <div style={{ marginBottom: '2rem' }}>
        <StaffPulseLogo variant="full" height={38} to="/" />
      </div>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--primary-50)',
          color: 'var(--primary-600)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          border: '1px solid var(--primary-200)',
        }}
      >
        <FileQuestion size={36} />
      </div>

      <span
        style={{
          display: 'inline-block',
          padding: '0.25rem 0.75rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--slate-100)',
          color: 'var(--slate-600)',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: '0.75rem',
          border: '1px solid var(--slate-200)',
        }}
      >
        HTTP 404 Error
      </span>

      <h1
        style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          color: 'var(--slate-900)',
          marginBottom: '0.65rem',
          letterSpacing: '-0.02em',
        }}
      >
        Page Not Found
      </h1>

      <p
        style={{
          fontSize: '0.95rem',
          color: 'var(--slate-500)',
          lineHeight: 1.5,
          marginBottom: '2rem',
          maxWidth: '440px',
          marginRight: 'auto',
          marginLeft: 'auto',
        }}
      >
        The page you requested does not exist or may have been moved. Please verify the URL or return to the main dashboard.
      </p>

      <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          to="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1.35rem',
            background: 'var(--primary-gradient)',
            color: '#ffffff',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: '0.875rem',
            boxShadow: '0 2px 6px rgba(232, 93, 4, 0.25)',
          }}
        >
          <LayoutDashboard size={16} />
          <span>Return to Dashboard</span>
        </Link>
        <Link
          to="/employees"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1.35rem',
            background: 'var(--card-bg, #ffffff)',
            color: 'var(--slate-700)',
            border: '1px solid var(--slate-300)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          <ArrowLeft size={16} />
          <span>View Employees</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
