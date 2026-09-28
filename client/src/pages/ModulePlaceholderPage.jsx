import { Link } from 'react-router-dom';
import { Layers, ArrowLeft } from 'lucide-react';

export const ModulePlaceholderPage = ({ title = 'Module', description = 'This section is part of upcoming extensions.' }) => {
  return (
    <div
      className="animate-fade-in"
      style={{
        maxWidth: 640,
        margin: '2rem auto',
        padding: '3rem 2rem',
        background: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--slate-200)',
        boxShadow: 'var(--shadow-sm)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--primary-50)',
          color: 'var(--primary-600)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}
      >
        <Layers size={28} />
      </div>

      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          color: 'var(--slate-900)',
          marginBottom: '0.5rem',
        }}
      >
        {title}
      </h1>

      <p
        style={{
          fontSize: '0.95rem',
          color: 'var(--slate-500)',
          marginBottom: '1.75rem',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      <Link
        to="/dashboard"
        className="btn-primary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <ArrowLeft size={16} />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
};

export default ModulePlaceholderPage;
