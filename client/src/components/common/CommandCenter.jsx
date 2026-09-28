import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, X, Clock, Users, Building2, CalendarRange, 
  CheckSquare, BarChart3, User, Settings, ShieldAlert,
  ArrowRight, FileText, Megaphone, FolderCheck
} from 'lucide-react';
import searchService from '../../services/searchService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import '../../styles/commandCenter.css';

const CommandCenter = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // A flattened list of all currently displayed items (for keyboard navigation)
  const [flatItems, setFlatItems] = useState([]);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isEmployee = user?.role === 'employee';

  useEffect(() => {
    if (isOpen) {
      setRecentSearches(searchService.getRecentSearches());
      setQuery('');
      setResults(null);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < flatItems.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          executeAction(flatItems[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatItems, selectedIndex, onClose]);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await searchService.globalSearch(query);
        if (res.success) {
          setResults(res.results);
          setSelectedIndex(0); // Reset selection
        }
      } catch (error) {
        console.error('Search failed', error);
        setResults({ error: true });
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Rebuild flatItems whenever results or query changes so we can navigate them
  useEffect(() => {
    if (!query) {
      const defaultItems = [];
      if (recentSearches.length > 0) {
        recentSearches.forEach(rs => defaultItems.push({ type: 'recent', title: rs, action: () => setQuery(rs) }));
      }
      
      // Default Nav
      const nav = [
        { type: 'nav', title: 'Dashboard', icon: <BarChart3 size={16} />, path: isAdmin ? '/dashboard' : isManager ? '/manager/dashboard' : '/employee/dashboard' },
        { type: 'nav', title: isManager ? 'My Team' : 'Employees', icon: <Users size={16} />, path: isManager ? '/manager/team' : '/employees', roles: ['admin', 'manager'] },
        { type: 'nav', title: isEmployee ? 'My Leave' : isManager ? 'Team Leave' : 'Leave Management', icon: <CalendarRange size={16} />, path: isEmployee ? '/employee/leave' : isManager ? '/manager/leave' : '/leaves' },
        { type: 'nav', title: isEmployee ? 'My Tasks' : isManager ? 'Team Tasks' : 'Tasks', icon: <CheckSquare size={16} />, path: isEmployee ? '/employee/tasks' : isManager ? '/manager/tasks' : '/tasks' },
        { type: 'nav', title: 'Profile', icon: <User size={16} />, path: '/profile' }
      ].filter(item => !item.roles || item.roles.includes(user?.role));
      
      defaultItems.push(...nav);
      setFlatItems(defaultItems);
    } else if (results && !results.error) {
      const rItems = [];
      if (results.employees?.length) results.employees.forEach(e => rItems.push({ type: 'result', title: e.fullName, subtitle: e.designation, path: `/employees/${e._id}`, icon: <Users size={16} /> }));
      if (results.tasks?.length) results.tasks.forEach(t => rItems.push({ type: 'result', title: t.title, subtitle: t.status, path: `/tasks/${t._id}`, icon: <CheckSquare size={16} /> }));
      if (results.leaves?.length) rItems.push(...results.leaves.map(l => ({ type: 'result', title: `${l.leaveType} Request`, subtitle: l.status, path: `/leaves/${l._id}`, icon: <CalendarRange size={16} /> })));
      if (results.submissions?.length) rItems.push(...results.submissions.map(s => ({ type: 'result', title: 'Work Submission', subtitle: s.status, path: `/submissions/${s._id}`, icon: <FolderCheck size={16} /> })));
      if (results.announcements?.length) rItems.push(...results.announcements.map(a => ({ type: 'result', title: a.title, subtitle: 'Announcement', path: user?.role === 'employee' ? `/employee/announcements/${a._id}` : `/announcements/${a._id}`, icon: <Megaphone size={16} /> })));
      if (results.documents?.length) rItems.push(...results.documents.map(d => ({ type: 'result', title: d.title, subtitle: d.type, path: user?.role === 'employee' ? `/employee/documents/${d._id}` : `/documents/${d._id}`, icon: <FileText size={16} /> })));
      if (results.attendance?.length) rItems.push(...results.attendance.map(att => {
        const empName = att.employee?.fullName || 'Attendance';
        const formattedDate = att.date ? new Date(att.date).toLocaleDateString() : '';
        const targetPath = user?.role === 'employee' ? '/employee/attendance' : '/attendance';
        return {
          type: 'result',
          title: `${empName} - ${att.status}`,
          subtitle: `Attendance (${formattedDate})`,
          path: targetPath,
          icon: <Clock size={16} />
        };
      }));
      setFlatItems(rItems);
    }
  }, [query, results, recentSearches, user?.role]);

  const executeAction = (item) => {
    if (item.action) {
      item.action();
    } else if (item.path) {
      if (query && query.length > 2) {
        searchService.saveRecentSearch(query);
      }
      navigate(item.path);
      onClose();
    }
  };

  const clearRecent = (e) => {
    e.stopPropagation();
    searchService.clearRecentSearches();
    setRecentSearches([]);
  };

  if (!isOpen) return null;

  return (
    <div className="cc-overlay" onClick={onClose}>
      <div className="cc-modal animate-slide-down" onClick={e => e.stopPropagation()}>
        <div className="cc-header">
          <Search size={20} className="cc-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cc-input"
            placeholder="Search employees, tasks, leaves or type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && <div className="cc-spinner"></div>}
          <button className="cc-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="cc-body">
          {!query ? (
            <>
              {recentSearches.length > 0 && (
                <div className="cc-section">
                  <div className="cc-section-title">
                    <span>Recent Searches</span>
                    <button onClick={clearRecent} className="cc-clear-btn">Clear</button>
                  </div>
                  {recentSearches.map((rs, idx) => (
                    <div 
                      key={idx} 
                      className={`cc-item ${selectedIndex === idx ? 'selected' : ''}`}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => executeAction(flatItems[idx])}
                    >
                      <Clock size={16} className="cc-item-icon" />
                      <span className="cc-item-title">{rs}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="cc-section">
                <div className="cc-section-title">Navigation Commands</div>
                {flatItems.filter(i => i.type === 'nav').map((nav, idx) => {
                  const globalIdx = flatItems.indexOf(nav);
                  return (
                    <div 
                      key={nav.title} 
                      className={`cc-item ${selectedIndex === globalIdx ? 'selected' : ''}`}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      onClick={() => executeAction(nav)}
                    >
                      <div className="cc-item-icon primary-icon">{nav.icon}</div>
                      <div className="cc-item-content">
                        <span className="cc-item-title">Go to {nav.title}</span>
                      </div>
                      <ArrowRight size={14} className="cc-item-action-icon" />
                    </div>
                  );
                })}
              </div>
            </>
          ) : query.trim().length < 2 ? (
            <div className="cc-empty">
              Type at least 2 characters to search across {isAdmin ? 'all modules' : 'your permitted modules'}
            </div>
          ) : results?.error ? (
            <div className="cc-empty error">
              <ShieldAlert size={24} />
              <p>Search failed. Please try again.</p>
            </div>
          ) : flatItems.length === 0 && !loading ? (
            <div className="cc-empty">
              No results found for "{query}"
            </div>
          ) : (
            <div className="cc-section">
              <div className="cc-section-title">Search Results</div>
              {flatItems.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`cc-item result-item ${selectedIndex === idx ? 'selected' : ''}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => executeAction(item)}
                >
                  <div className="cc-item-icon">{item.icon}</div>
                  <div className="cc-item-content">
                    <span className="cc-item-title">{item.title}</span>
                    {item.subtitle && <span className="cc-item-subtitle">{item.subtitle}</span>}
                  </div>
                  <ArrowRight size={14} className="cc-item-action-icon" />
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="cc-footer">
          <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
          <span><kbd>Enter</kbd> to select</span>
          <span><kbd>ESC</kbd> to close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandCenter;
