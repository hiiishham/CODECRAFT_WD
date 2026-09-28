import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Megaphone,
  Calendar,
  Clock,
  User,
  FileText,
  Download,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import announcementService from '../services/announcementService.js';
import Loader from '../components/common/Loader.jsx';
import '../styles/announcements.css';

export const EmployeeAnnouncementDetailsPage = () => {
  const { id } = useParams();

  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExpired, setIsExpired] = useState(false);

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
      setError(err.message || 'Failed to load announcement');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return <Loader message="Loading announcement..." fullScreen={false} />;
  }

  if (error || !announcement) {
    return (
      <div className="announcements-container">
        <div style={{ marginBottom: '1.25rem' }}>
          <Link
            to="/employee/announcements"
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
          <div className="ann-empty-text">You may not be authorized to view this notice or it has been removed.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="announcements-container">
      {/* Back Button */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          to="/employee/announcements"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--slate-500)',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
          id="back-to-notice-board-btn"
        >
          <ArrowLeft size={16} />
          <span>Back to Announcements</span>
        </Link>
      </div>

      {isExpired && (
        <div className="ann-expired-notice">
          <ShieldAlert size={18} />
          <span>Announcement Expired — This notice reached its expiration date and is archived.</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="ann-details-grid">
        <div className="ann-content-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
            <span className={`ann-priority-badge ${announcement.priority.toLowerCase()}`}>
              {announcement.priority === 'Urgent' && '🔴 '}
              {announcement.priority === 'Important' && '🟡 '}
              {announcement.priority === 'Normal' && '🔵 '}
              {announcement.priority}
            </span>

            <span className="ann-category-badge">{announcement.category}</span>
          </div>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 1rem 0', lineHeight: 1.35 }}>
            {announcement.title}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--slate-400)', fontSize: '0.825rem', paddingBottom: '1rem', borderBottom: '1px solid var(--slate-100)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <User size={14} />
              Issued by {announcement.publishedBy?.name || 'Company Management'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} />
              Published {formatDate(announcement.publishDate)}
            </span>
          </div>

          {/* Full Announcement Body */}
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

        {/* Sidebar */}
        <div className="ann-sidebar-card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--slate-900)', margin: '0 0 0.5rem 0' }}>
            Notice Details
          </h3>

          <div className="ann-sidebar-item">
            <span className="ann-sidebar-label">Published By</span>
            <span className="ann-sidebar-value">{announcement.publishedBy?.name || 'Company Administration'}</span>
          </div>

          <div className="ann-sidebar-item">
            <span className="ann-sidebar-label">Publish Date</span>
            <span className="ann-sidebar-value">{formatDate(announcement.publishDate)}</span>
          </div>

          {announcement.expiryDate && (
            <div className="ann-sidebar-item">
              <span className="ann-sidebar-label">Active Until</span>
              <span className="ann-sidebar-value">{formatDate(announcement.expiryDate)}</span>
            </div>
          )}

          <div className="ann-sidebar-item">
            <span className="ann-sidebar-label">Target Audience</span>
            <span className="ann-sidebar-value">
              {announcement.audience === 'Department'
                ? `Department: ${announcement.department?.name || 'All'}`
                : announcement.audience}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeAnnouncementDetailsPage;
