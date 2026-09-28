import { useState, useEffect } from 'react';
import {
  Building2,
  Sliders,
  SunMoon,
  Sun,
  Moon,
  Save,
  Loader2,
  CheckCircle2,
  Globe,
  DollarSign,
  Calendar,
  Clock,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import settingsService from '../services/settingsService.js';
import Loader from '../components/common/Loader.jsx';
import StaffPulseLogo from '../components/common/StaffPulseLogo.jsx';
import '../styles/settings.css';

export const SettingsPage = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const { theme, setTheme } = useTheme();
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefData, setPrefData] = useState(null);

  // If not admin, they only see notifications and appearance
  useEffect(() => {
    if (!isAdmin && activeTab !== 'notifications' && activeTab !== 'appearance') {
      setActiveTab('notifications');
    }
  }, [isAdmin, activeTab]);

  // Settings State
  const [formData, setFormData] = useState({
    companyName: 'StaffPulse Inc.',
    companyEmail: 'contact@staffpulse.com',
    companyPhone: '+91 98765 43210',
    companyAddress: '123 Business Park, Tech Zone, Bengaluru, India',
    companyWebsite: '',
    companyDescription: '',
    companyLogo: '',
    companyFavicon: '',
    primaryColor: '#e85d04',
    secondaryColor: '#64748b',
    accentColor: '#f59e0b',
    paginationDefault: 10,
    dashboardDateRange: 'This Month',
    sessionTimeout: 120,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workingHoursPerDay: 8,
    defaultCheckInTime: '09:00',
    defaultCheckOutTime: '17:00',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    theme: 'system',
  });

  // Load Settings on Mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await settingsService.getSettings();
        if (res.success && res.settings) {
          setFormData({
            companyName: res.settings.companyName || 'StaffPulse Inc.',
            companyEmail: res.settings.companyEmail || 'contact@staffpulse.com',
            companyPhone: res.settings.companyPhone || '+91 98765 43210',
            companyAddress: res.settings.companyAddress || '',
            companyWebsite: res.settings.companyWebsite || '',
            companyDescription: res.settings.companyDescription || '',
            companyLogo: res.settings.companyLogo || '',
            companyFavicon: res.settings.companyFavicon || '',
            primaryColor: res.settings.primaryColor || '#e85d04',
            secondaryColor: res.settings.secondaryColor || '#64748b',
            accentColor: res.settings.accentColor || '#f59e0b',
            paginationDefault: res.settings.paginationDefault || 10,
            dashboardDateRange: res.settings.dashboardDateRange || 'This Month',
            sessionTimeout: res.settings.sessionTimeout || 120,
            workingDays: res.settings.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            workingHoursPerDay: res.settings.workingHoursPerDay || 8,
            defaultCheckInTime: res.settings.defaultCheckInTime || '09:00',
            defaultCheckOutTime: res.settings.defaultCheckOutTime || '17:00',
            currency: res.settings.currency || 'INR',
            timezone: res.settings.timezone || 'Asia/Kolkata',
            dateFormat: res.settings.dateFormat || 'DD/MM/YYYY',
            theme: res.settings.theme || theme || 'system',
          });
          // Synchronize theme if specified in settings
          if (res.settings.theme && (res.settings.theme === 'light' || res.settings.theme === 'dark')) {
            setTheme(res.settings.theme);
          }
        }
      } catch (err) {
        showError(err.message || 'Failed to load application settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [showError, setTheme]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleThemeSelect = (selectedTheme) => {
    setFormData((prev) => ({ ...prev, theme: selectedTheme }));
    setTheme(selectedTheme);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      showSuccess('Appearance preference saved');
      return;
    }
    setSaving(true);
    try {
      const res = await settingsService.updateSettings(formData);
      if (res.success) {
        showSuccess('Application settings saved successfully');
      } else {
        throw new Error(res.message || 'Failed to save settings');
      }
    } catch (err) {
      showError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      showSuccess(`Uploading ${fieldName}...`);
      const res = await settingsService.uploadImage(file);
      if (res.success && res.url) {
        setFormData((prev) => ({ ...prev, [fieldName]: res.url }));
        showSuccess('Upload successful');
      } else {
        throw new Error('Failed to get URL');
      }
    } catch (err) {
      showError('Failed to upload image');
    }
  };

  // Load preferences when switching to notifications tab
  useEffect(() => {
    if (activeTab === 'notifications' && !prefData) {
      const loadPrefs = async () => {
        setPrefLoading(true);
        try {
          const res = await settingsService.getNotificationPreferences();
          if (res.success) {
            setPrefData(res.preferences);
          }
        } catch(e) {
          showError('Failed to load notification preferences');
        } finally {
          setPrefLoading(false);
        }
      };
      loadPrefs();
    }
  }, [activeTab, prefData, showError]);

  const handlePrefChange = (type, key, value) => {
    setPrefData(prev => {
      if (type === 'main') {
        return { ...prev, [key]: value };
      }
      return { ...prev, categories: { ...prev.categories, [key]: value } };
    });
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const res = await settingsService.updateNotificationPreferences({
        email: prefData.email,
        inApp: prefData.inApp,
        categories: prefData.categories
      });
      if (res.success) showSuccess('Preferences updated successfully');
    } catch(e) {
      showError('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader message="Loading application settings..." />;
  }

  const tabs = isAdmin 
    ? [
        { id: 'general', label: 'General', icon: <Building2 size={18} /> },
        { id: 'branding', label: 'Branding', icon: <SunMoon size={18} /> },
        { id: 'localization', label: 'Localization', icon: <Globe size={18} /> },
        { id: 'system', label: 'System Preferences', icon: <Sliders size={18} /> },
        { id: 'notifications', label: 'Notifications', icon: <Mail size={18} /> },
      ]
    : [
        { id: 'notifications', label: 'Notifications', icon: <Mail size={18} /> },
        { id: 'appearance', label: 'Appearance', icon: <SunMoon size={18} /> },
      ];

  const renderContent = () => {
    if (activeTab === 'general' && isAdmin) {
      return (
        <form onSubmit={handleSubmit}>
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title-group">
                <h2>Organization Information</h2>
                <p>Provide your company identity and primary administrative contacts.</p>
              </div>
            </div>
            <div className="settings-form-grid">
              <div className="settings-form-group">
                <label className="settings-label">Company Name *</label>
                <input name="companyName" type="text" className="settings-input" value={formData.companyName} onChange={handleChange} required />
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Official Email *</label>
                <input name="companyEmail" type="email" className="settings-input" value={formData.companyEmail} onChange={handleChange} required />
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Primary Phone</label>
                <input name="companyPhone" type="text" className="settings-input" value={formData.companyPhone} onChange={handleChange} />
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Company Website</label>
                <input name="companyWebsite" type="url" className="settings-input" value={formData.companyWebsite} onChange={handleChange} />
              </div>
              <div className="settings-form-group full-width">
                <label className="settings-label">Company Description</label>
                <textarea name="companyDescription" className="settings-textarea" value={formData.companyDescription} onChange={handleChange} rows={2} />
              </div>
              <div className="settings-form-group full-width">
                <label className="settings-label">Headquarters Address</label>
                <textarea name="companyAddress" className="settings-textarea" value={formData.companyAddress} onChange={handleChange} rows={2} />
              </div>
            </div>
          </div>
          <div className="settings-actions-bar">
            <button type="submit" className="settings-btn-save" disabled={saving}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      );
    }
    
    if (activeTab === 'branding' && isAdmin) {
      return (
        <form onSubmit={handleSubmit}>
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title-group">
                <h2>Branding Assets</h2>
                <p>Configure company logos and colors for the interface.</p>
              </div>
            </div>
            <div className="settings-form-grid">
              <div className="settings-form-group full-width">
                <label className="settings-label">Company Logo</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input name="companyLogo" type="url" className="settings-input" value={formData.companyLogo} onChange={handleChange} placeholder="https://..." style={{ flex: 1 }} />
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'companyLogo')} style={{ display: 'none' }} id="logoUpload" />
                  <label htmlFor="logoUpload" style={{ background: 'var(--slate-200)', padding: '0.75rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Upload</label>
                </div>
              </div>
              <div className="settings-form-group full-width">
                <label className="settings-label">Company Favicon</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input name="companyFavicon" type="url" className="settings-input" value={formData.companyFavicon} onChange={handleChange} placeholder="https://..." style={{ flex: 1 }} />
                  <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'companyFavicon')} style={{ display: 'none' }} id="faviconUpload" />
                  <label htmlFor="faviconUpload" style={{ background: 'var(--slate-200)', padding: '0.75rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Upload</label>
                </div>
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Primary Color</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input name="primaryColor" type="color" value={formData.primaryColor} onChange={handleChange} style={{ height: '40px', width: '40px', padding: '0' }} />
                  <input name="primaryColor" type="text" className="settings-input" value={formData.primaryColor} onChange={handleChange} />
                </div>
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Secondary Color</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input name="secondaryColor" type="color" value={formData.secondaryColor} onChange={handleChange} style={{ height: '40px', width: '40px', padding: '0' }} />
                  <input name="secondaryColor" type="text" className="settings-input" value={formData.secondaryColor} onChange={handleChange} />
                </div>
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Accent Color</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input name="accentColor" type="color" value={formData.accentColor} onChange={handleChange} style={{ height: '40px', width: '40px', padding: '0' }} />
                  <input name="accentColor" type="text" className="settings-input" value={formData.accentColor} onChange={handleChange} />
                </div>
              </div>
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title-group">
                <h2>Live Brand Preview</h2>
                <p>See how your colors look in a sample component before saving.</p>
              </div>
            </div>
            <div style={{ padding: '1.5rem', background: 'var(--slate-50)', borderRadius: '8px', border: '1px dashed var(--slate-300)', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '250px', background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {formData.companyLogo ? (
                  <img src={formData.companyLogo} alt="Logo" style={{ height: '40px', marginBottom: '1rem', objectFit: 'contain' }} />
                ) : (
                  <div style={{ marginBottom: '1rem' }}>
                    <StaffPulseLogo variant="full" height={36} />
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button style={{ backgroundColor: formData.primaryColor, color: 'white', padding: '0.75rem', borderRadius: '6px', border: 'none', fontWeight: 600 }}>Primary Button</button>
                  <button style={{ backgroundColor: formData.secondaryColor, color: 'white', padding: '0.75rem', borderRadius: '6px', border: 'none', fontWeight: 600 }}>Secondary Button</button>
                  <div style={{ padding: '1rem', borderLeft: `4px solid ${formData.accentColor}`, backgroundColor: `${formData.accentColor}15`, marginTop: '0.5rem' }}>
                    <p style={{ margin: 0, color: formData.secondaryColor, fontSize: '0.875rem' }}>Accent highlight example.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="settings-actions-bar">
            <button type="submit" className="settings-btn-save" disabled={saving}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      );
    }

    if (activeTab === 'localization' && isAdmin) {
      return (
        <form onSubmit={handleSubmit}>
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title-group">
                <h2>Localization</h2>
                <p>Configure region-specific formats.</p>
              </div>
            </div>
            <div className="settings-form-grid">
              <div className="settings-form-group">
                <label className="settings-label">Default Currency</label>
                <select name="currency" className="settings-select" value={formData.currency} onChange={handleChange}>
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                </select>
              </div>
              <div className="settings-form-group">
                <label className="settings-label">System Timezone</label>
                <select name="timezone" className="settings-select" value={formData.timezone} onChange={handleChange}>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Date Format</label>
                <select name="dateFormat" className="settings-select" value={formData.dateFormat} onChange={handleChange}>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>
          </div>
          <div className="settings-actions-bar">
            <button type="submit" className="settings-btn-save" disabled={saving}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      );
    }

    if (activeTab === 'system' && isAdmin) {
      return (
        <form onSubmit={handleSubmit}>
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title-group">
                <h2>System Preferences</h2>
                <p>Configure global system behavior.</p>
              </div>
            </div>
            <div className="settings-form-grid">
              <div className="settings-form-group">
                <label className="settings-label">Pagination Default</label>
                <select name="paginationDefault" className="settings-select" value={formData.paginationDefault} onChange={handleChange}>
                  <option value={10}>10 items per page</option>
                  <option value={20}>20 items per page</option>
                  <option value={50}>50 items per page</option>
                </select>
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Session Timeout (minutes)</label>
                <input name="sessionTimeout" type="number" className="settings-input" value={formData.sessionTimeout} onChange={handleChange} min={5} />
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Default Check-In Time</label>
                <input name="defaultCheckInTime" type="time" className="settings-input" value={formData.defaultCheckInTime} onChange={handleChange} />
              </div>
              <div className="settings-form-group">
                <label className="settings-label">Default Check-Out Time</label>
                <input name="defaultCheckOutTime" type="time" className="settings-input" value={formData.defaultCheckOutTime} onChange={handleChange} />
              </div>
            </div>
          </div>
          <div className="settings-actions-bar">
            <button type="submit" className="settings-btn-save" disabled={saving}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      );
    }

    if (activeTab === 'appearance') {
      return (
        <form onSubmit={handleSubmit}>
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title-group">
                <h2>Appearance & Theme</h2>
                <p>Choose your preferred interface theme.</p>
              </div>
            </div>
            <div className="theme-selector-grid">
              <div className={`theme-card-option ${formData.theme === 'light' ? 'selected' : ''}`} onClick={() => handleThemeSelect('light')}>
                <div className="theme-card-info">
                  <Sun size={20} color="#f59e0b" />
                  <span>Light Theme</span>
                  {formData.theme === 'light' && <CheckCircle2 size={20} color="var(--primary-600)" />}
                </div>
              </div>
              <div className={`theme-card-option ${formData.theme === 'dark' ? 'selected' : ''}`} onClick={() => handleThemeSelect('dark')}>
                <div className="theme-card-info">
                  <Moon size={20} color="#818cf8" />
                  <span>Dark Theme</span>
                  {formData.theme === 'dark' && <CheckCircle2 size={20} color="var(--primary-600)" />}
                </div>
              </div>
              <div className={`theme-card-option ${formData.theme === 'system' ? 'selected' : ''}`} onClick={() => handleThemeSelect('system')}>
                <div className="theme-card-info">
                  <SunMoon size={20} color="var(--slate-500)" />
                  <span>System Theme</span>
                  {formData.theme === 'system' && <CheckCircle2 size={20} color="var(--primary-600)" />}
                </div>
              </div>
            </div>
          </div>
          <div className="settings-actions-bar">
            <button type="submit" className="settings-btn-save" disabled={saving}>
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      );
    }

    if (activeTab === 'notifications' && prefData) {
      return (
        <div className="settings-sections">
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title-group">
                <h2>Delivery Methods</h2>
                <p>Choose how you want to receive notifications.</p>
              </div>
            </div>
            <div className="settings-form-grid" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={prefData.email} onChange={(e) => handlePrefChange('main', 'email', e.target.checked)} />
                Email Notifications
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={prefData.inApp} onChange={(e) => handlePrefChange('main', 'inApp', e.target.checked)} />
                In-App Notifications
              </label>
            </div>
          </div>
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title-group">
                <h2>Notification Categories</h2>
                <p>Select which types of notifications you want to receive.</p>
              </div>
            </div>
            <div className="settings-form-grid" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {['task', 'leave', 'submission', 'announcement', 'attendance', 'performance', 'salary'].map(cat => (
                <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textTransform: 'capitalize' }}>
                  <input type="checkbox" checked={prefData.categories[cat]} onChange={(e) => handlePrefChange('categories', cat, e.target.checked)} />
                  {cat} Notifications
                </label>
              ))}
            </div>
          </div>
          <div className="settings-actions-bar">
            <button onClick={savePreferences} className="settings-btn-save" disabled={saving}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="settings-container animate-fade-in">
      <div className="settings-sidebar">
        <div className="settings-header" style={{ marginBottom: '1.5rem' }}>
          <h1 className="settings-title">Settings</h1>
        </div>
        <div className="settings-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === tab.id ? 'var(--primary-50)' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary-600)' : 'var(--slate-600)',
                fontWeight: activeTab === tab.id ? 600 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="settings-content" style={{ flexGrow: 1, minWidth: 0 }}>
        <div className="settings-header" style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--slate-200)' }}>
          <h2 className="settings-title" style={{ fontSize: '1.5rem' }}>
            {tabs.find(t => t.id === activeTab)?.label}
          </h2>
          <p className="settings-subtitle">Manage your {tabs.find(t => t.id === activeTab)?.label.toLowerCase()} here.</p>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default SettingsPage;
