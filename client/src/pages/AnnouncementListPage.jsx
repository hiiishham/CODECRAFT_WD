import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Megaphone,
  Plus,
  Search,
  CheckCircle2,
  FileEdit,
  Clock,
  Archive,
  Trash2,
  Eye,
  AlertCircle,
  Users,
  Building2,
  Calendar,
} from 'lucide-react';
import announcementService from '../services/announcementService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import DeleteModal from '../components/common/DeleteModal.jsx';
import '../styles/announcements.css';

const CATEGORIES = ['All', 'General', 'HR', 'Holiday', 'Event', 'Meeting', 'Policy', 'Urgent', 'Other'];
const PRIORITIES = ['All', 'Normal', 'Important', 'Urgent'];
const STATUSES = ['All', 'Published', 'Draft', 'Archived'];
const AUDIENCES = ['All', 'Employees', 'Managers', 'Department'];

export const AnnouncementListPage = () => {
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();

  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    expiringSoon: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [priority, setPriority] = useState(searchParams.get('priority') || 'All');
  const [status, setStatus] = useState(searchParams.get('status') || 'All');
  const [audience, setAudience] = useState(searchParams.get('audience') || 'All');

  // Delete Modal state
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: null,
    title: '',
    isDeleting: false,
  });

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await announcementService.getAnnouncements({
        search: search.trim(),
        category,
        priority,
        status,
        audience,
      });

      if (res.success) {
        setAnnouncements(res.announcements || []);
        if (res.stats) {
          setStats(res.stats);
        }
      } else {
        throw new Error(res.message || 'Failed to retrieve announcements');
      }
    } catch (err) {
      setError(err.message || 'Unable to load announcements.');
      showError(err.message || 'Error loading announcements');
    } finally {
      setLoading(false);
    }
  }, [search, category, priority, status, audience, showError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnnouncements();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchAnnouncements]);

  // Archive Quick Action
  const handleArchive = async (id, title) => {
    try {
      const res = await announcementService.archiveAnnouncement(id);
      if (res.success) {
        showSuccess(`"${title}" archived successfully`);
        fetchAnnouncements();
      } else {
        throw new Error(res.message || 'Failed to archive announcement');
      }
    } catch (err) {
      showError(err.message || 'Error archiving announcement');
    }
  };

  // Delete Handler
  const handleDeleteClick = (ann) => {
    setDeleteModal({
      isOpen: true,
      id: ann._id,
      title: ann.title,
      isDeleting: false,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    try {
      const res = await announcementService.deleteAnnouncement(deleteModal.id);
      if (res.success) {
        showSuccess('Announcement deleted successfully');
        setDeleteModal({ isOpen: false, id: null, title: '', isDeleting: false });
        fetchAnnouncements();
      } else {
        throw new Error(res.message || 'Failed to delete announcement');
      }
    } catch (err) {
      showError(err.message || 'Failed to delete announcement');
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

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
          <p>Create, manage, and broadcast official announcements and notices</p>
        </div>
        <Link to="/announcements/add" className="btn-create-announcement" id="create-announcement-btn">
          <Plus size={18} />
          <span>Create Announcement</span>
        </Link>
      </div>

      {/* Top Summary KPI Cards */}
      <div className="ann-stats-grid">
        <div className="ann-stat-card">
          <div className="ann-stat-icon blue">
            <Megaphone size={24} />
          </div>
          <div className="ann-stat-info">
            <span className="ann-stat-value">{stats.total}</span>
            <span className="ann-stat-label">Total Announcements</span>
          </div>
        </div>

        <div className="ann-stat-card">
          <div className="ann-stat-icon emerald">
            <CheckCircle2 size={24} />
          </div>
          <div className="ann-stat-info">
            <span className="ann-stat-value">{stats.published}</span>
            <span className="ann-stat-label">Published</span>
          </div>
        </div>

        <div className="ann-stat-card">
          <div className="ann-stat-icon amber">
            <FileEdit size={24} />
          </div>
          <div className="ann-stat-info">
            <span className="ann-stat-value">{stats.drafts}</span>
            <span className="ann-stat-label">Drafts</span>
          </div>
        </div>

        <div className="ann-stat-card">
          <div className="ann-stat-icon rose">
            <Clock size={24} />
          </div>
          <div className="ann-stat-info">
            <span className="ann-stat-value">{stats.expiringSoon}</span>
            <span className="ann-stat-label">Expiring Soon (48h)</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="ann-filter-card">
        <div className="ann-search-box">
          <Search size={18} className="ann-search-icon" />
          <input
            type="text"
            className="ann-search-input"
            placeholder="Search by title or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="announcement-search-input"
          />
        </div>

        {/* Category Filter */}
        <select
          className="ann-filter-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by Category"
          id="ann-filter-category"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === 'All' ? 'All Categories' : c}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          className="ann-filter-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          aria-label="Filter by Priority"
          id="ann-filter-priority"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p === 'All' ? 'All Priorities' : p}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          className="ann-filter-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by Status"
          id="ann-filter-status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'All' ? 'All Statuses' : s}
            </option>
          ))}
        </select>

        {/* Audience Filter */}
        <select
          className="ann-filter-select"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          aria-label="Filter by Audience"
          id="ann-filter-audience"
        >
          {AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {a === 'All' ? 'All Audiences' : a}
            </option>
          ))}
        </select>
      </div>

      {/* Main Content: Table or Empty/Loading State */}
      {loading ? (
        <Loader message="Loading company announcements..." fullScreen={false} />
      ) : error ? (
        <div className="ann-empty-state">
          <AlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 0.75rem auto' }} />
          <div className="ann-empty-title">Unable to load announcements</div>
          <div className="ann-empty-text">{error}</div>
        </div>
      ) : announcements.length === 0 ? (
        <div className="ann-empty-state">
          <Megaphone size={44} className="ann-empty-icon" />
          <div className="ann-empty-title">
            {search || category !== 'All' || priority !== 'All' || status !== 'All' || audience !== 'All'
              ? 'No announcements match your filters.'
              : 'No announcements available.'}
          </div>
          <div className="ann-empty-text">
            Publish your first company-wide or departmental announcement to inform the team.
          </div>
          <Link
            to="/announcements/add"
            className="btn-create-announcement"
            style={{ marginTop: '1.25rem', display: 'inline-flex' }}
          >
            <Plus size={16} />
            <span>Create Announcement</span>
          </Link>
        </div>
      ) : (
        <div className="ann-table-card">
          <div className="ann-table-wrap">
            <table className="ann-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Audience</th>
                  <th>Published Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((ann) => (
                  <tr key={ann._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--slate-900)' }}>
                        {ann.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                        By {ann.publishedBy?.name || 'Admin'}
                      </div>
                    </td>

                    <td>
                      <span className="ann-category-badge">{ann.category}</span>
                    </td>

                    <td>
                      <span className={`ann-priority-badge ${ann.priority.toLowerCase()}`}>
                        {ann.priority === 'Urgent' && '🔴 '}
                        {ann.priority === 'Important' && '🟡 '}
                        {ann.priority === 'Normal' && '🔵 '}
                        {ann.priority}
                      </span>
                    </td>

                    <td>
                      <span className="ann-audience-badge">
                        {ann.audience === 'Department' ? (
                          <>
                            <Building2 size={12} />
                            {ann.department?.name || 'Department'}
                          </>
                        ) : (
                          <>
                            <Users size={12} />
                            {ann.audience}
                          </>
                        )}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.825rem', color: 'var(--slate-600)' }}>
                        {formatDate(ann.publishDate)}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontSize: '0.825rem', color: ann.expiryDate && new Date(ann.expiryDate) < new Date() ? '#ef4444' : 'var(--slate-500)' }}>
                        {formatDate(ann.expiryDate)}
                      </span>
                    </td>

                    <td>
                      <span className={`ann-status-badge ${ann.status.toLowerCase()}`}>
                        {ann.status}
                      </span>
                    </td>

                    <td>
                      <div className="ann-actions" style={{ justifyContent: 'flex-end' }}>
                        <Link
                          to={`/announcements/${ann._id}`}
                          className="ann-action-btn view"
                          title="View Details"
                          id={`view-ann-${ann._id}`}
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </Link>

                        <Link
                          to={`/announcements/edit/${ann._id}`}
                          className="ann-action-btn edit"
                          title="Edit Announcement"
                          id={`edit-ann-${ann._id}`}
                        >
                          <FileEdit size={14} />
                          <span>Edit</span>
                        </Link>

                        {ann.status !== 'Archived' && (
                          <button
                            type="button"
                            className="ann-action-btn archive"
                            title="Archive Announcement"
                            onClick={() => handleArchive(ann._id, ann.title)}
                            id={`archive-ann-${ann._id}`}
                          >
                            <Archive size={14} />
                            <span>Archive</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="ann-action-btn delete"
                          title="Delete Announcement"
                          onClick={() => handleDeleteClick(ann)}
                          id={`delete-ann-${ann._id}`}
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, title: '', isDeleting: false })}
        onConfirm={handleConfirmDelete}
        title="Delete Announcement?"
        message="This action cannot be undone. The announcement and its notices will be permanently removed."
        itemName={deleteModal.title}
        itemLabel="Announcement"
        confirmText="Delete"
        isDeleting={deleteModal.isDeleting}
      />
    </div>
  );
};

export default AnnouncementListPage;
