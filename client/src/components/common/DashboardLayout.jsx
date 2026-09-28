import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Navbar from './Navbar.jsx';
import CommandCenter from './CommandCenter.jsx';
import '../../styles/layout.css';

export const DashboardLayout = ({ title = 'Dashboard' }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandCenterOpen, setCommandCenterOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('staffpulse_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('staffpulse_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandCenterOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-layout">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div className={`main-wrapper ${isCollapsed ? 'collapsed' : ''}`}>
        <Navbar
          title={title}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onOpenSearch={() => setCommandCenterOpen(true)}
        />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      
      <CommandCenter 
        isOpen={commandCenterOpen} 
        onClose={() => setCommandCenterOpen(false)} 
      />
    </div>
  );
};

export default DashboardLayout;
