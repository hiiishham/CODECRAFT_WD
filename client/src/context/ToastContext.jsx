import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((arg1, arg2) => {
    let type = 'info';
    let message = '';

    if (arg1 === 'success' || arg1 === 'error' || arg1 === 'info' || arg1 === 'warning') {
      type = arg1;
      message = typeof arg2 === 'string' ? arg2 : String(arg2 || '');
    } else if (arg2 === 'success' || arg2 === 'error' || arg2 === 'info' || arg2 === 'warning') {
      type = arg2;
      message = typeof arg1 === 'string' ? arg1 : String(arg1 || '');
    } else {
      type = 'info';
      message = typeof arg1 === 'string' ? arg1 : String(arg1 || '');
    }

    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const showSuccess = useCallback((msg) => addToast('success', msg), [addToast]);
  const showError = useCallback((msg) => addToast('error', msg), [addToast]);
  const showInfo = useCallback((msg) => addToast('info', msg), [addToast]);
  const showWarning = useCallback((msg) => addToast('warning', msg), [addToast]);

  const showToast = useCallback((arg1, arg2 = 'info') => {
    if (arg1 === 'error' || arg1 === 'success' || arg1 === 'info' || arg1 === 'warning') {
      const type = arg1;
      const msg = arg2;
      if (type === 'error') showError(msg);
      else if (type === 'success') showSuccess(msg);
      else if (type === 'warning') showWarning(msg);
      else showInfo(msg);
    } else {
      const msg = arg1;
      const type = arg2;
      if (type === 'error') showError(msg);
      else if (type === 'success') showSuccess(msg);
      else if (type === 'warning') showWarning(msg);
      else showInfo(msg);
    }
  }, [showSuccess, showError, showInfo, showWarning]);

  const toastObj = useMemo(() => ({
    success: showSuccess,
    error: showError,
    info: showInfo,
    warning: showWarning,
    loading: (msg) => showInfo(msg),
  }), [showSuccess, showError, showInfo, showWarning]);

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showInfo, showWarning, showToast, addToast, toast: toastObj }}>
      {children}
      {/* Toast Notification Container */}
      <div
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          maxWidth: '380px',
          width: 'calc(100% - 2.5rem)',
          pointerEvents: 'none',
        }}
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: '#ffffff',
              boxShadow: 'var(--shadow-lg)',
              border: `1px solid ${
                toast.type === 'success'
                  ? 'var(--success-border)'
                  : toast.type === 'error'
                  ? 'var(--danger-border)'
                  : 'var(--info-border)'
              }`,
              borderLeft: `4px solid ${
                toast.type === 'success'
                  ? 'var(--success-dot)'
                  : toast.type === 'error'
                  ? 'var(--danger-dot)'
                  : 'var(--primary-600)'
              }`,
              color: 'var(--slate-800)',
              fontSize: '0.875rem',
              fontWeight: 500,
              animation: 'fadeIn 0.25s ease-out forwards',
            }}
          >
            {toast.type === 'success' && (
              <CheckCircle2 size={18} color="var(--success-dot)" style={{ flexShrink: 0 }} />
            )}
            {toast.type === 'error' && (
              <AlertCircle size={18} color="var(--danger-dot)" style={{ flexShrink: 0 }} />
            )}
            {toast.type === 'info' && (
              <Info size={18} color="var(--primary-600)" style={{ flexShrink: 0 }} />
            )}
            <span style={{ flex: 1, wordBreak: 'break-word' }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.2rem',
                color: 'var(--slate-400)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Close notification"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
