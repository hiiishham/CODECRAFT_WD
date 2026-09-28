import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Megaphone,
  FileEdit,
  Archive,
  Trash2,
  Calendar,
  Clock,
  Users,
  Building2,
  FileText,
  Download,
  AlertCircle,
  User,
  ShieldAlert,
} from 'lucide-react';
import announcementService from '../services/announcementService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import DeleteModal from '../components/common/DeleteModal.jsx';
import '../styles/announcements.css';

export const AnnouncementDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    isDeleting: false,
  });

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await announcementService.getAnnouncementById(id);
      if (res.success && res.announcement) {
        setAnnouncement(res.announcement);
        setIsExpired(res.isExpired || false);
      } else {
        throw new Error(res.message || 'Announcement not found');
      }
    } catch (err) {
      setError(err.message || 'Failed to load announcement details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleArchive = async () => {
    try {
      const res = await announcementService.archiveAnnouncement(id);
      if (res.success) {
        showSuccess('Announcement archived successfully');
        fetchDetails();
      } else {
        throw new Error(res.message || 'Failed to archive');
      }
    } catch (err) {
      showError(err.message || 'Archive failed');
    }
  };

  const handleConfirmDelete = async () => {
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      const res = await announcementService.deleteAnnouncement(id);
      if (res.success) {
        showSuccess('Announcement deleted successfully');
        navigate('/announcements', { replace: true });
      } else {
        throw new Error(res.message || 'Failed to delete');
      }
    } catch (err) {
      showError(err.message || 'Delete failed');
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'None';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <Loader message="Loading announcement details..." fullScreen={false} />;
  }

  if (error || !announcement) {
    return (
      <div className="announcements-container">
        <div style={{ marginBottom: '1.25rem' }}>
          <Link
            to="/announcements"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--slate-500)',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Announcements</span>
          </Link>
        </div>
        <div className="ann-empty-state">
          <AlertCircle size={44} style={{ color: '#ef4444', margin: '0 auto 0.75rem auto' }} />
          <div className="ann-empty-title">{error || 'Announcement not found'}</div>
          <div className="ann-empty-text">This announcement may have been deleted or archived.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="announcements-container">
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <Link
          to="/announcements"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--slate-500)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Announcements</span>
        </Link>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <Link
            to={`/announcements/edit/${announcement._id}`}
            className="ann-action-btn edit"
            style={{ textDecoration: 'none', padding: '0.5rem 0.85rem' }}
            id="edit-ann-action-btn"
          >
            <FileEdit size={15} />
            <span>Edit</span>
          </Link>

          {announcement.status !== 'Archived' && (
            <button
              type="button"
              className="ann-action-btn archive"
              onClick={handleArchive}
              style={{ padding: '0.5rem 0.85rem' }}
              id="archive-ann-action-btn"
            >
              <Archive size={15} />
              <span>Archive</span>
            </button>
          )}

          <button
            type="button"
            className="ann-action-btn delete"
            onClick={() => setDeleteModal({ isOpen: true, isDeleting: false })}
            style={{ padding: '0.5rem 0.85rem' }}
            id="delete-ann-action-btn"
          >
            <Trash2 size={15} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {isExpired && (
        <div className="ann-expired-notice">
          <ShieldAlert size={18} />
          <span>This announcement has reached its expiry date and is now inactive on employee notice boards.</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="ann-details-grid">
        {/* Content Card */}
        <div className="ann-content-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
            <span className={`ann-priority-badge ${announcement.priority.toLowerCase()}`}>
              {announcement.priority === 'Urgent' && '🔴 '}
              {announcement.priority === 'Important' && '🟡 '}
              {announcement.priority === 'Normal' && '🔵 '}
              {announcement.priority}
            </span>

            <span className="ann-category-badge">{announcement.category}</span>

            <span className={`ann-status-badge ${announcement.status.toLowerCase()}`}>
              {announcement.status}
            </span>
          </div>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 1rem 0', lineHeight: 1.3 }}>
            {announcement.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--slate-400)', fontSize: '0.825rem', paddingBottom: '1rem', borderBottom: '1px solid var(--slate-100)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <User size={14} />
              Published by {announcement.publishedBy?.name || 'Admin'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} />
              {formatDate(announcement.publishDate)}
            </span>
          </div>

          {/* Full Content */}
          <div className="ann-content-body">
            {announcement.content}
          </div>

          {/* Attachments Section */}
          {announcement.attachments && announcement.attachments.length > 0 && (
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--slate-100)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--slate-800)', marginBottom: '0.85rem' }}>
                Attachments ({announcement.attachments.length})
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {announcement.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={att.fileName}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.6rem 1rem',
                      borderRadius: '0.5rem',
                      background: 'var(--slate-50)',
                      border: '1px solid var(--slate-200)',
                      textDecoration: 'none',
                      color: 'var(--slate-800)',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <FileText size={16} style={{ color: 'var(--primary-600)' }} />
                    <span>{att.fileName}</span>
                    <Download size={14} style={{ color: 'var(--slate-400)', marginLeft: '0.25rem' }} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Metadata */}
        <div className="ann-sidebar-card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 0.5rem 0' }}>
            Announcement Info
          </h3>

          <div className="ann-sidebar-item">
            <span className="ann-sidebar-label">Audience</span>
            <span className="ann-sidebar-value" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {announcement.audience === 'Department' ? (
                <>
                  <Building2 size={14} style={{ color: 'var(--slate-400)' }} />
                  Department ({announcement.department?.name || 'Specified'})
                </>
              ) : (
                <>
                  <Users size={14} style={{ color: 'var(--slate-400)' }} />
                  {announcement.audience}
                </>
              )}
            </span>
          </div>

          <div className="ann-sidebar-item">
            <span className="ann-sidebar-label">Published By</span>
            <span className="ann-sidebar-value">{announcement.publishedBy?.name || 'Admin'}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>{announcement.publishedBy?.email}</span>
          </div>

          <div className="ann-sidebar-item">
            <span className="ann-sidebar-label">Publish Date</span>
            <span className="ann-sidebar-value">{formatDate(announcement.publishDate)}</span>
          </div>

          <div className="ann-sidebar-item">
            <span className="ann-sidebar-label">Expiry Date</span>
            <span className="ann-sidebar-value">{formatDate(announcement.expiryDate)}</span>
          </div>

          <div className="ann-sidebar-item">
            <span className="ann-sidebar-label">Read Count</span>
            <span className="ann-sidebar-value">{announcement.readBy?.length || 0} users have read this</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, isDeleting: false })}
        onConfirm={handleConfirmDelete}
        title="Delete Announcement?"
        message="This action cannot be undone. The announcement and notifications will be permanently removed."
        itemName={announcement.title}
        itemLabel="Announcement"
        confirmText="Delete"
        isDeleting={deleteModal.isDeleting}
      />
    </div>
  );
};

export default AnnouncementDetailsPage;
