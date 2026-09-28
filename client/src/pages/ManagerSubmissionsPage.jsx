import { useState, useEffect } from 'react';
import { Search, FolderCheck, Check, Edit3, MessageSquare, ExternalLink } from 'lucide-react';
import managerService from '../services/managerService.js';
import Loader from '../components/common/Loader.jsx';
import { toast } from 'react-hot-toast';

const ManagerSubmissionsPage = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'Pending Review' });
  const [reviewModal, setReviewModal] = useState(null);

  useEffect(() => {
    fetchSubmissions();
  }, [filters]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await managerService.getTeamSubmissions({ status: filters.status });
      if (res.success) {
        setSubmissions(res.submissions);
      }
    } catch (err) {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    try {
      const res = await managerService.reviewSubmission(reviewModal._id, {
        status: reviewModal.action,
        comments: reviewModal.comments,
        rating: reviewModal.rating
      });
      if (res.success) {
        toast.success(`Submission ${reviewModal.action}`);
        setReviewModal(null);
        fetchSubmissions();
      }
    } catch (err) {
      toast.error('Failed to review submission');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved': return <span className="status-badge" style={{background:'#dcfce7', color:'#166534'}}>{status}</span>;
      case 'Changes Requested': return <span className="status-badge" style={{background:'#fee2e2', color:'#991b1b'}}>{status}</span>;
      default: return <span className="status-badge" style={{background:'#fef3c7', color:'#b45309'}}>{status}</span>;
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--slate-900)', margin: 0 }}>Review Work</h1>
          <p style={{ color: 'var(--slate-500)', marginTop: '0.5rem', fontSize: '0.875rem' }}>Review task submissions from your team.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          style={{ padding: '0.625rem 1rem', border: '1px solid var(--slate-300)', borderRadius: '0.5rem', outline: 'none', background: 'white' }}
        >
          <option value="All">All Statuses</option>
          <option value="Pending Review">Pending Review</option>
          <option value="Approved">Approved</option>
          <option value="Changes Requested">Changes Requested</option>
        </select>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {submissions.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--slate-500)', background: 'white', borderRadius: '0.75rem', border: '1px solid var(--slate-200)' }}>
              No submissions found.
            </div>
          ) : (
            submissions.map(sub => (
              <div key={sub._id} style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid var(--slate-200)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                      {sub.employee?.profileImage ? (
                        <img src={sub.employee.profileImage} alt="" style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}}/>
                      ) : sub.employee?.fullName?.charAt(0)}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--slate-900)' }}>{sub.employee?.fullName}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--slate-500)' }}>{sub.employee?.employeeId}</p>
                    </div>
                  </div>
                  {getStatusBadge(sub.status)}
                </div>
                <div style={{ padding: '1.25rem', flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Task: {sub.task?.title}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', margin: '0 0 1rem 0' }}>{sub.description}</p>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {sub.githubUrl && (
                      <a href={sub.githubUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', background: 'var(--slate-100)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', textDecoration: 'none', color: 'var(--slate-700)' }}>
                        <Github size={14} /> Repository
                      </a>
                    )}
                    {sub.liveUrl && (
                      <a href={sub.liveUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', background: 'var(--primary-50)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', textDecoration: 'none', color: 'var(--primary-700)' }}>
                        <ExternalLink size={14} /> Live Demo
                      </a>
                    )}
                  </div>
                </div>
                <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--slate-100)', display: 'flex', gap: '0.5rem', background: 'var(--slate-50)', borderBottomLeftRadius: '0.75rem', borderBottomRightRadius: '0.75rem' }}>
                  {sub.status === 'Pending Review' ? (
                    <>
                      <button onClick={() => setReviewModal({...sub, action: 'Approved', comments: '', rating: 5})} style={{ flex: 1, padding: '0.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}>Approve</button>
                      <button onClick={() => setReviewModal({...sub, action: 'Changes Requested', comments: ''})} style={{ flex: 1, padding: '0.5rem', background: 'white', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}>Request Changes</button>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>Reviewed by {sub.reviewedBy?.name}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="modal-overlay" onClick={() => setReviewModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{reviewModal.action === 'Approved' ? 'Approve Submission' : 'Request Changes'}</h2>
              <button className="close-btn" onClick={() => setReviewModal(null)}>x</button>
            </div>
            <form onSubmit={handleReview}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Feedback Comments</label>
                <textarea 
                  className="form-control"
                  rows="4"
                  value={reviewModal.comments}
                  onChange={e => setReviewModal({...reviewModal, comments: e.target.value})}
                  required
                  placeholder="Provide constructive feedback..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--slate-300)' }}
                ></textarea>
              </div>
              {reviewModal.action === 'Approved' && (
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Rating (1-5)</label>
                  <input 
                    type="number" 
                    min="1" max="5" 
                    value={reviewModal.rating || 5}
                    onChange={e => setReviewModal({...reviewModal, rating: Number(e.target.value)})}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--slate-300)' }}
                  />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setReviewModal(null)} style={{ padding: '0.5rem 1rem', background: 'white', border: '1px solid var(--slate-300)', borderRadius: '0.375rem', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.5rem 1rem', background: reviewModal.action === 'Approved' ? '#10b981' : '#ef4444', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
                  Confirm {reviewModal.action}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerSubmissionsPage;
