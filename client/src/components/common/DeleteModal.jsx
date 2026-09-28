import { AlertTriangle, X, Loader2 } from 'lucide-react';

export const DeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Employee?',
  message = 'Are you sure you want to delete this employee? This action cannot be undone.',
  employeeName = '',
  itemName = '',
  itemLabel = 'Employee',
  confirmText = '',
  confirmDisabled = false,
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  const displayName = itemName || employeeName;
  const buttonLabel = confirmText || (employeeName ? 'Delete Employee' : 'Delete');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--slate-200)',
          padding: '1.75rem',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          disabled={isDeleting}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--slate-400)',
            cursor: 'pointer',
            padding: '0.25rem',
            borderRadius: 'var(--radius-sm)',
          }}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger-dot)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: '1px solid var(--danger-border)',
            }}
          >
            <AlertTriangle size={22} />
          </div>

          <div style={{ flex: 1 }}>
            <h3
              id="delete-modal-title"
              style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: 'var(--slate-900)',
                marginBottom: '0.4rem',
              }}
            >
              {title}
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', lineHeight: 1.5 }}>
              {message}
            </p>
            {displayName && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'var(--slate-50)',
                  border: '1px solid var(--slate-200)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--slate-800)',
                }}
              >
                {itemLabel}: {displayName}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: '1.75rem',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--slate-300)',
              backgroundColor: '#ffffff',
              color: 'var(--slate-700)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            Cancel
          </button>
          {!confirmDisabled && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              id="confirm-delete-btn"
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: 'var(--danger-dot)',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)',
                opacity: isDeleting ? 0.7 : 1,
              }}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>{buttonLabel}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
