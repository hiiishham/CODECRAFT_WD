import { Loader2 } from 'lucide-react';

export const Loader = ({ fullScreen = true, message = 'Loading StaffPulse...' }) => {
  if (fullScreen) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          backgroundColor: 'var(--slate-50)',
          color: 'var(--slate-600)',
          fontFamily: 'var(--font-family)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(232, 93, 4, 0.25)',
            marginBottom: '0.5rem',
          }}
        >
          <Loader2 className="animate-spin" size={26} />
        </div>
        <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--slate-500)' }}>
          {message}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '2rem',
        color: 'var(--slate-500)',
      }}
    >
      <Loader2 className="animate-spin" size={20} color="var(--primary-600)" />
      <span style={{ fontSize: '0.875rem' }}>{message}</span>
    </div>
  );
};

export default Loader;
