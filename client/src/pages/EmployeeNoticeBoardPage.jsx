import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Megaphone,
  Search,
  Calendar,
  Clock,
  ArrowRight,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import announcementService from '../services/announcementService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/announcements.css';

const CATEGORIES = ['All', 'General', 'HR', 'Holiday', 'Event', 'Meeting', 'Policy', 'Urgent', 'Other'];

export const EmployeeNoticeBoardPage = () => {
  const { showError } = useToast();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const fetchNoticeBoard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await announcementService.getMyAnnouncements({
        search: search.trim(),
        category,
      });

      if (res.success) {
        setAnnouncements(res.announcements || []);
      } else {
        throw new Error(res.message || 'Failed to load notice board');
      }
    } catch (err) {
      setError(err.message || 'Unable to load announcements.');
      showError(err.message || 'Error loading announcements');
    } finally {
      setLoading(false);
    }
  }, [search, category, showError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNoticeBoard();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchNoticeBoard]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="announcements-container">
      {/* Header */}
      <div className="announcements-header">
        <div className="announcements-header-left">
          <h1>
            <Megaphone size={28} style={{ color: 'var(--primary-600)' }} />
            Company Announcements
          </h1>
          <p>Official company notices, holiday calendars, updates, and organizational policies</p>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="ann-filter-pills" role="tablist">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`ann-pill-btn ${category === cat ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
            id={`filter-pill-${cat.toLowerCase()}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="ann-filter-card" style={{ padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
        <div className="ann-search-box" style={{ width: '100%' }}>
          <Search size={18} className="ann-search-icon" />
          <input
            type="text"
            className="ann-search-input"
            placeholder="Search active notices and announcements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="notice-board-search-input"
          />
        </div>
      </div>

      {/* Main Notice Board Grid */}
      {loading ? (
        <Loader message="Loading notice board..." fullScreen={false} />
      ) : error ? (
        <div className="ann-empty-state">
          <AlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 0.75rem auto' }} />
          <div className="ann-empty-title">Unable to load announcements</div>
          <div className="ann-empty-text">{error}</div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="ann-empty-state">
          <FileCheck size={44} className="ann-empty-icon" />
          <div className="ann-empty-title">
            {search || category !== 'All'
              ? 'No announcements match your search.'
              : 'No announcements available.'}
          </div>
          <div className="ann-empty-text">
            Check back later for company updates and official news.
          </div>
        </div>
      ) : (
        <div className="ann-notice-cards-grid">
          {announcements.map((ann) => {
            const priorityClass = `priority-${ann.priority.toLowerCase()}`;
            return (
              <div key={ann._id} className={`ann-notice-card ${priorityClass}`}>
                <div>
                  <div className="ann-card-header">
                    <span className={`ann-priority-badge ${ann.priority.toLowerCase()}`}>
                      {ann.priority === 'Urgent' && '🔴 '}
                      {ann.priority === 'Important' && '🟡 '}
                      {ann.priority === 'Normal' && '🔵 '}
                      {ann.priority}
                    </span>

                    <span className="ann-category-badge">{ann.category}</span>
                  </div>

                  <h3 className="ann-card-title">
                    {!ann.isRead && <span className="ann-unread-dot" title="Unread announcement" />}
                    {ann.title}
                  </h3>

                  <p className="ann-card-snippet">
                    {ann.content}
                  </p>
                </div>

                <div>
                  <div className="ann-card-meta-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={13} />
                      Published: {formatDate(ann.publishDate)}
                    </span>
                    {ann.expiryDate && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--slate-400)' }}>
                        <Clock size={12} />
                        Until {formatDate(ann.expiryDate)}
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/employee/announcements/${ann._id}`}
                    className="btn-read-announcement"
                    id={`read-ann-${ann._id}`}
                  >
                    <span>Read Announcement</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeeNoticeBoardPage;
