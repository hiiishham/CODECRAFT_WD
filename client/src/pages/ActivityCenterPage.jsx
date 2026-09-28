import { useState, useEffect, useCallback } from 'react';
import { Clock, Activity, ArrowLeft, RefreshCw, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Loader from '../components/common/Loader';
import { formatTimeAgo } from '../utils/timeAgo';
import '../styles/dashboard.css';

export const ActivityCenterPage = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/activity?page=${page}&limit=20`);
      if (res.data.success) {
        setActivities(res.data.activity || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.totalRecords || 0);
      }
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handlePrevPage = () => setPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={24} color="var(--primary-600)" />
              Activity Center
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--slate-500)', margin: '0.35rem 0 0' }}>
              Recent events and updates across your workspace.
            </p>
          </div>
          <button
            onClick={fetchActivities}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="chart-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Loader message="Loading activity timeline..." />
          </div>
        ) : activities.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <Clock size={40} color="var(--slate-300)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--slate-700)' }}>No Recent Activity</h3>
            <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem', margin: 0 }}>
              You don't have any recent activity logged.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {activities.map((act) => (
              <div 
                key={act._id} 
                style={{ 
                  display: 'flex', 
                  gap: '1rem', 
                  padding: '1.25rem', 
                  borderBottom: '1px solid var(--slate-100)',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  backgroundColor: 'var(--slate-50)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Clock size={18} color="var(--slate-400)" />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.95rem', color: 'var(--slate-800)', fontWeight: 600 }}>
                    {act.title}
                  </h4>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                    {act.description}
                  </p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                    {formatTimeAgo(act.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
              Showing page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={handlePrevPage} 
                disabled={page === 1}
                className="btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                Previous
              </button>
              <button 
                onClick={handleNextPage} 
                disabled={page === totalPages}
                className="btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default ActivityCenterPage;
