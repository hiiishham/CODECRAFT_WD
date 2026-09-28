import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useSocket } from './SocketContext.jsx';
import notificationService from '../services/notificationService.js';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch unread count whenever user logs in or switches
  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const res = await notificationService.getUnreadCount();
      if (res.success && res.unreadCount !== undefined) {
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // Non-critical background failure
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!socket) return;

    const handleNew = (payload) => {
      if (payload?.unreadCount !== undefined) {
        setUnreadCount(payload.unreadCount);
      } else {
        setUnreadCount((prev) => prev + 1);
      }
    };
    const handleRead = ({ unreadCount }) => { if (unreadCount !== undefined) setUnreadCount(unreadCount); };
    const handleReadAll = ({ unreadCount }) => { if (unreadCount !== undefined) setUnreadCount(unreadCount); };
    const handleUnreadCount = ({ unreadCount }) => { if (unreadCount !== undefined) setUnreadCount(unreadCount); };

    socket.on('notification:new', handleNew);
    socket.on('notification:read', handleRead);
    socket.on('notification:read-all', handleReadAll);
    socket.on('notification:unread-count', handleUnreadCount);

    return () => {
      socket.off('notification:new', handleNew);
      socket.off('notification:read', handleRead);
      socket.off('notification:read-all', handleReadAll);
      socket.off('notification:unread-count', handleUnreadCount);
    };
  }, [socket]);

  // Mark single notification as read with optimistic UI update
  const markAsRead = async (id) => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      const res = await notificationService.markAsRead(id);
      if (res.success && res.unreadCount !== undefined) {
        setUnreadCount(res.unreadCount);
      }
      return res;
    } catch (err) {
      // Re-fetch on error to ensure consistency
      fetchUnreadCount();
      throw err;
    }
  };

  // Mark all notifications as read with optimistic reset
  const markAllAsRead = async () => {
    setUnreadCount(0);
    try {
      const res = await notificationService.markAllAsRead();
      if (res.success && res.unreadCount !== undefined) {
        setUnreadCount(res.unreadCount);
      }
      return res;
    } catch (err) {
      fetchUnreadCount();
      throw err;
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
        loading,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
