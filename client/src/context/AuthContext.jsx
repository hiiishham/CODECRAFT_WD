import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService.js';
import { getToken, setToken, clearToken } from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [passwordChangeSkipped, setPasswordChangeSkipped] = useState(() => {
    try {
      return sessionStorage.getItem('staffpulse_skip_pwd_change') === 'true';
    } catch {
      return false;
    }
  });

  // Restore authenticated session on application mount
  const refreshUser = useCallback(async () => {
    const token = getToken();

    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const response = await authService.getMe();
      const userData = response.user || response.admin;

      if (response.success && userData) {
        setUser(userData);
        setSessionExpired(false);
        return userData;
      } else {
        clearToken();
        setUser(null);
        return null;
      }
    } catch (error) {
      clearToken();
      setUser(null);
      if (error.code === 'TOKEN_EXPIRED' || error.status === 401) {
        setSessionExpired(true);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    const handleUnauthorized = () => {
      clearToken();
      setUser(null);
      setSessionExpired(true);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [refreshUser]);

  // Skip mandatory password change for the current session only
  const skipPasswordChange = useCallback(() => {
    try {
      sessionStorage.setItem('staffpulse_skip_pwd_change', 'true');
    } catch {
      // Storage unavailable fallback
    }
    setPasswordChangeSkipped(true);
  }, []);

  // Login handler with Remember Me support
  const login = async (email, password, rememberMe = true) => {
    try {
      const response = await authService.login({ email, password });
      const userData = response.user || response.admin;

      if (response.success && response.token && userData) {
        // Reset any previous session skip flag on fresh login
        try {
          sessionStorage.removeItem('staffpulse_skip_pwd_change');
        } catch {
          // Ignore
        }
        setPasswordChangeSkipped(false);

        setToken(response.token, rememberMe);
        setUser(userData);
        setSessionExpired(false);
        return { success: true, user: userData, admin: userData };
      }
      throw new Error(response.message || 'Login failed');
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Invalid email or password. Please try again.',
      };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore network failures on logout
    } finally {
      try {
        sessionStorage.removeItem('staffpulse_skip_pwd_change');
      } catch {
        // Ignore
      }
      setPasswordChangeSkipped(false);
      clearToken();
      setUser(null);
    }
  };

  // Role check helper
  const hasRole = useCallback((...roles) => {
    return !!user && roles.includes(user.role);
  }, [user]);

  // Directly update local user state when profile is saved
  const updateUser = useCallback((updatedData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedData } : updatedData));
  }, []);

  // Forced initial password change handler
  const forceChangePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
      const response = await authService.forceChangePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (response.success) {
        try {
          sessionStorage.removeItem('staffpulse_skip_pwd_change');
        } catch {
          // Ignore
        }
        setPasswordChangeSkipped(false);

        if (response.token) {
          setToken(response.token);
        }
        const updated = response.user || response.admin;
        if (updated) {
          setUser(updated);
        } else {
          setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
        }
        return { success: true, user: updated };
      }
      return { success: false, message: response.message || 'Failed to change password' };
    } catch (error) {
      return { success: false, message: error.message || 'Failed to change password' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token: getToken(),
        user,
        admin: user, // backward compatibility
        role: user?.role || null,
        loading,
        isAuthenticated: !!user && Object.keys(user).length > 0,
        passwordChangeSkipped,
        skipPasswordChange,
        sessionExpired,
        clearSessionExpired: () => setSessionExpired(false),
        login,
        logout,
        refreshUser,
        updateUser,
        forceChangePassword,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
