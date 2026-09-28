import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Eye,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import { submissionService } from '../services/submissionService.js';
import { useToast } from '../context/ToastContext.jsx';
import Loader from '../components/common/Loader.jsx';
import '../styles/submissions.css';
import '../styles/tasks.css';

export const EmployeeSubmissionsPage = () => {
  const { showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    pendingReview: 0,
    approved: 0,
    changesRequested: 0,
  });

  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await submissionService.getMySubmissions({
        status: statusFilter,
        search,
      });

      if (res.success) {
        setSubmissions(res.submissions || []);
        if (res.summary) setSummary(res.summary);
      } else {
        showError(res.message || 'Failed to load your submissions');
      }
    } catch (err) {
      showError(err.message || 'Error fetching submissions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, showError]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending Review':
        return (
          <span className="badge-sub-status badge-sub-pending">
            🟡 Pending Review
          </span>
        );
      case 'Approved':
        return (
          <span className="badge-sub-status badge-sub-approved">
            🟢 Approved
          </span>
        );
      case 'Changes Requested':
        return (
          <span className="badge-sub-status badge-sub-changes">
            🔴 Changes Requested
          </span>
        );
      default:
        return <span className="badge-sub-status">{status}</span>;
    }
  };

  return (
    <div className="task-page animate-fade-in" style={{ paddingBottom: '3rem' }}>
      {/* Header */}
      <div className="dashboard-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileCheck size={26} color="var(--primary-600)" />
            <span>My Work Submissions</span>
          </h1>
          <p className="dashboard-subtitle">
            View submitted deliverable history, feedback, and manager approval results.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={fetchSubmissions}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 0.85rem' }}
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 1. Summary Statistics Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Submissions</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)' }}>
              <Layers size={20} />
            </div>
          </div>
          <div className="stat-card-value">{summary.total}</div>
          <p className="stat-card-subtitle">All submitted deliverables</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Pending Review</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#b45309' }}>{summary.pendingReview}</div>
          <p className="stat-card-subtitle">Awaiting supervisor evaluation</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Approved</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: '#15803d' }}>{summary.approved}</div>
          <p className="stat-card-subtitle">Deliverables verified and accepted</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Changes Requested</span>
            <div className="stat-icon-wrapper" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>
              <AlertCircle size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: summary.changesRequested > 0 ? '#b91c1c' : 'inherit' }}>
            {summary.changesRequested}
          </div>
          <p className="stat-card-subtitle">Revisions required before approval</p>
        </div>
      </div>

      {/* 2. Filter Tabs & Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['All', 'Pending Review', 'Approved', 'Changes Requested'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: statusFilter === tab ? 'var(--primary-600)' : 'var(--slate-200)',
                backgroundColor: statusFilter === tab ? 'var(--primary-600)' : '#ffffff',
                color: statusFilter === tab ? '#ffffff' : 'var(--slate-700)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="task-search-box" style={{ maxWidth: '300px' }}>
          <Search className="task-search-icon" size={16} />
          <input
            type="text"
            placeholder="Search submissions..."
            className="task-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 3. Submissions Table */}
      {loading ? (
        <Loader message="Loading your submission records..." />
      ) : submissions.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3.5rem 1rem',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            border: '1px dashed var(--slate-300)',
          }}
        >
          <Send size={40} color="var(--slate-400)" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)', margin: '0 0 0.35rem' }}>
            No submissions yet.
          </h3>
          <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem', margin: '0 0 1rem' }}>
            {search || statusFilter !== 'All'
              ? 'No work submissions match your selected filter.'
              : 'Complete your assigned tasks and submit your deliverables for review.'}
          </p>
          <Link to="/employee/tasks" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>Go to My Tasks</span>
          </Link>
        </div>
      ) : (
        <div className="submission-table-wrapper">
          <table className="submission-table">
            <thead>
              <tr>
                <th>Task Deliverable</th>
                <th>Submitted Date</th>
                <th>Status</th>
                <th>Reviewed Date</th>
                <th>Reviewer</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub._id}>
                  {/* Task Title & Description snippet */}
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>
                      <Link
                        to={`/employee/submissions/${sub._id}`}
                        style={{ color: 'inherit', textDecoration: 'none' }}
                        onMouseOver={(e) => (e.target.style.color = 'var(--primary-600)')}
                        onMouseOut={(e) => (e.target.style.color = 'inherit')}
                      >
                        {sub.task?.title || 'Deliverable Submission'}
                      </Link>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.2rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub.description}
                    </div>
                  </td>

                  {/* Submitted Date */}
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--slate-700)' }}>
                      {formatDate(sub.submittedAt || sub.createdAt)}
                    </span>
                  </td>

                  {/* Status */}
                  <td>{getStatusBadge(sub.status)}</td>

                  {/* Reviewed Date */}
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                      {sub.reviewedAt ? formatDate(sub.reviewedAt) : 'Pending'}
                    </span>
                  </td>

                  {/* Reviewer */}
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--slate-700)', fontWeight: sub.reviewedBy ? 600 : 400 }}>
                      {sub.reviewedBy?.name || '—'}
                    </span>
                  </td>

                  {/* Action */}
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      to={`/employee/submissions/${sub._id}`}
                      className="btn-secondary"
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      <Eye size={14} />
                      <span>View Submission</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EmployeeSubmissionsPage;
