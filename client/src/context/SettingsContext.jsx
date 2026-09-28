import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import settingsService from '../services/settingsService.js';
import { getToken } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';
import io from 'socket.io-client';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  // Track personal theme preference from local storage or context (light/dark/system)
  const [personalTheme, setPersonalTheme] = useState(() => {
    return localStorage.getItem('staffpulse_theme') || 'system';
  });

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      
      const token = getToken();
      if (!token) {
        throw new Error('No authentication token provided');
      }

      const res = await settingsService.getSettings();
      if (res.success && res.settings) {
        setSettings(res.settings);
        
        // Save to localStorage for non-React utility functions
        if (res.settings.currency || res.settings.dateFormat) {
          localStorage.setItem('ems_settings', JSON.stringify({
            currency: res.settings.currency,
            dateFormat: res.settings.dateFormat,
            timezone: res.settings.timezone
          }));
        }

        // Apply dynamic meta properties (Title, Favicon)
        if (res.settings.companyName) {
          document.title = `${res.settings.companyName} - EMS`;
        }
      }
    } catch (err) {
      // Set fallbacks so the app doesn't break
      setSettings({
        companyName: 'StaffPulse',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        theme: 'system',
        primaryColor: '#e85d04',
        secondaryColor: '#64748b',
        accentColor: '#f59e0b',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Setup Socket.IO listener for real-time settings updates
  useEffect(() => {
    if (!user) return;
    
    // Determine socket URL based on environment
    const SOCKET_URL = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '') 
      : 'http://localhost:5000';
      
    const token = getToken();
    
    const socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'] // Try websocket first
    });

    socket.on('connect', () => {
      console.log('[SettingsContext] Socket connected for settings updates');
    });

    socket.on('settings:updated', (newSettings) => {
      console.log('[SettingsContext] Received real-time settings update');
      setSettings(newSettings);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Handle personal theme preference saving
  const updatePersonalTheme = (themeValue) => {
    setPersonalTheme(themeValue);
    localStorage.setItem('staffpulse_theme', themeValue);
  };

  // Inject CSS variables, favicon, and title whenever settings or theme change
  useEffect(() => {
    if (!settings) return;

    // 1. Update Document Title
    document.title = `Dashboard | ${settings.companyName || 'StaffPulse'}`;

    // 2. Update Favicon
    if (settings.companyFavicon) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.companyFavicon;
    }

    // 3. Inject Brand Colors as CSS Variables
    const root = document.documentElement;
    const brandPrimary = (settings.primaryColor && settings.primaryColor !== '#4f46e5') ? settings.primaryColor : '#e85d04';
    root.style.setProperty('--primary', brandPrimary);
    root.style.setProperty('--secondary', settings.secondaryColor || '#64748b');
    root.style.setProperty('--accent', settings.accentColor || '#f59e0b');

    if (settings.primaryColor && settings.primaryColor !== '#4f46e5') {
      root.style.setProperty('--primary-50', `${brandPrimary}1a`);
      root.style.setProperty('--primary-100', `${brandPrimary}33`);
      root.style.setProperty('--primary-500', brandPrimary);
      root.style.setProperty('--primary-600', brandPrimary);
    }

    // Keep primary application on the clean StaffPulse warm cream SaaS theme
    root.removeAttribute('data-theme');

  }, [settings, personalTheme]);

  const value = {
    settings,
    loading,
    error,
    refreshSettings: fetchSettings,
    personalTheme,
    updatePersonalTheme
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
