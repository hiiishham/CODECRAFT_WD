import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  Calendar,
  Image as ImageIcon,
  Loader2,
  FileText,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import authService from '../services/authService.js';
import '../styles/profile.css';

export const ProfilePage = () => {
  const { user, updateUser, logout } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    role: '',
    avatar: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Initialize profile values from auth context
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        role: user.role || '',
        avatar: user.avatar || '',
      });
    }
  }, [user]);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Profile submit handler
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');

    if (!profileForm.name || profileForm.name.trim().length < 2) {
      setProfileError('Name must be at least 2 characters long');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await authService.updateProfile({
        name: profileForm.name.trim(),
        avatar: profileForm.avatar.trim(),
      });

      if (res.success && res.user) {
        updateUser(res.user);
        showSuccess('Profile information updated successfully');
      } else {
        throw new Error(res.message || 'Failed to update profile');
      }
    } catch (err) {
      const msg = err.message || 'Failed to update profile';
      setProfileError(msg);
      showError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  // Password change handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await authService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        showSuccess('Password updated successfully! Please log in with your new password.');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });

        // Prompt re-login after 1.5 seconds for security
        setTimeout(async () => {
          await logout();
          navigate('/login');
        }, 1500);
      } else {
        throw new Error(res.message || 'Failed to update password');
      }
    } catch (err) {
      const msg = err.message || 'Failed to update password';
      setPasswordError(msg);
      showError(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const formattedJoinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  return (
    <div className="profile-container animate-fade-in">
      {/* Profile Overview Header Card */}
      <div className="profile-header-card">
        <div className="profile-avatar-wrapper">
          <div className="profile-large-avatar" id="profile-avatar-display">
            {profileForm.avatar ? (
              <img
                src={profileForm.avatar}
                alt={user?.name || 'Profile'}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              getInitials(user?.name)
            )}
          </div>
        </div>

        <div className="profile-header-info">
          <h1 className="profile-header-title">
            <span>{user?.name || 'Administrator'}</span>
          </h1>
          <p className="profile-header-email">
            <Mail size={16} />
            <span>{user?.email || 'admin@ems.com'}</span>
          </p>
          <div className="profile-meta-tags">
            <span className={`profile-badge-role ${user?.role || 'admin'}`}>
              <Shield size={13} />
              <span>{user?.role || 'admin'}</span>
            </span>
            {user?.department && (
              <span className="profile-meta-date" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Building2 size={13} />
                <span>{user.department}</span>
              </span>
            )}
            <span className="profile-meta-date">
              <Calendar size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
              Member since {formattedJoinDate}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="profile-grid">
        {/* Card 1: Personal Details */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2 className="profile-card-title">
              <User size={20} color="var(--primary-600)" />
              <span>Personal Details</span>
            </h2>
            <p className="profile-card-desc">
              Manage your personal information and profile picture.
            </p>
          </div>

          <form onSubmit={handleProfileSubmit}>
            {profileError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--danger-bg)',
                  color: 'var(--danger-text)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.825rem',
                  marginBottom: '1.25rem',
                  border: '1px solid var(--danger-border)',
                }}
              >
                {profileError}
              </div>
            )}

            {/* Full Name */}
            <div className="profile-form-group">
              <label htmlFor="profile-name" className="profile-form-label">
                Full Name <span style={{ color: 'var(--danger-dot)' }}>*</span>
              </label>
              <div className="profile-input-wrap">
                <User size={16} className="profile-input-icon" />
                <input
                  id="profile-name"
                  type="text"
                  className="profile-input"
                  placeholder="Enter your full name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Email (Read-Only) */}
            <div className="profile-form-group">
              <label htmlFor="profile-email" className="profile-form-label">
                Email Address <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>(Read-only)</span>
              </label>
              <div className="profile-input-wrap">
                <Lock size={16} className="profile-input-icon" />
                <input
                  id="profile-email"
                  type="email"
                  className="profile-input read-only"
                  value={profileForm.email}
                  readOnly
                  disabled
                  title="Email cannot be changed directly for security reasons"
                />
              </div>
            </div>

            {/* Role (Read-Only) */}
            <div className="profile-form-group">
              <label htmlFor="profile-role" className="profile-form-label">
                Assigned Role <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>(Read-only)</span>
              </label>
              <div className="profile-input-wrap">
                <Shield size={16} className="profile-input-icon" />
                <input
                  id="profile-role"
                  type="text"
                  className="profile-input read-only"
                  value={profileForm.role.toUpperCase()}
                  readOnly
                  disabled
                />
              </div>
            </div>

            {/* Department (Read-Only if available) */}
            {user?.department && (
              <div className="profile-form-group">
                <label htmlFor="profile-department" className="profile-form-label">
                  Department <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>(Assigned)</span>
                </label>
                <div className="profile-input-wrap">
                  <Building2 size={16} className="profile-input-icon" />
                  <input
                    id="profile-department"
                    type="text"
                    className="profile-input read-only"
                    value={user.department}
                    readOnly
                    disabled
                  />
                </div>
              </div>
            )}

            {/* Avatar URL */}
            <div className="profile-form-group">
              <label htmlFor="profile-avatar" className="profile-form-label">
                Avatar Image URL <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>(Optional)</span>
              </label>
              <div className="profile-input-wrap">
                <ImageIcon size={16} className="profile-input-icon" />
                <input
                  id="profile-avatar"
                  type="url"
                  className="profile-input"
                  placeholder="https://example.com/avatar.jpg"
                  value={profileForm.avatar}
                  onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: '1.75rem' }}>
              <button
                type="submit"
                className="profile-btn-submit"
                id="save-profile-btn"
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Security & Password */}
        <div className="profile-card">
          <div className="profile-card-header">
            <h2 className="profile-card-title">
              <KeyRound size={20} color="var(--primary-600)" />
              <span>Change Password</span>
            </h2>
            <p className="profile-card-desc">
              Ensure your account uses a strong, unique password.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            {passwordError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--danger-bg)',
                  color: 'var(--danger-text)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.825rem',
                  marginBottom: '1.25rem',
                  border: '1px solid var(--danger-border)',
                }}
              >
                {passwordError}
              </div>
            )}

            {/* Current Password */}
            <div className="profile-form-group">
              <label htmlFor="current-password" className="profile-form-label">
                Current Password <span style={{ color: 'var(--danger-dot)' }}>*</span>
              </label>
              <div className="profile-input-wrap">
                <Lock size={16} className="profile-input-icon" />
                <input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="profile-input"
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  required
                />
                <button
                  type="button"
                  className="profile-password-toggle"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="profile-form-group">
              <label htmlFor="new-password" className="profile-form-label">
                New Password <span style={{ color: 'var(--danger-dot)' }}>*</span>
              </label>
              <div className="profile-input-wrap">
                <KeyRound size={16} className="profile-input-icon" />
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  className="profile-input"
                  placeholder="Enter new password (min. 6 characters)"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="profile-password-toggle"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="profile-form-group">
              <label htmlFor="confirm-password" className="profile-form-label">
                Confirm New Password <span style={{ color: 'var(--danger-dot)' }}>*</span>
              </label>
              <div className="profile-input-wrap">
                <KeyRound size={16} className="profile-input-icon" />
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="profile-input"
                  placeholder="Repeat new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="profile-password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Password Security Rules */}
            <div className="password-rules">
              <div className="password-rules-title">Password Requirements:</div>
              <ul>
                <li>Must be at least 6 characters in length</li>
                <li>Cannot be identical to your current password</li>
                <li>Changing your password will securely end the current session</li>
              </ul>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <button
                type="submit"
                className="profile-btn-submit"
                id="change-password-btn"
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Card 3: Documents Quick Access (Step 21) */}
        {user?.role === 'employee' && (
          <div className="profile-card" style={{ gridColumn: '1 / -1' }}>
            <div className="profile-card-header">
              <h2 className="profile-card-title">
                <FileText size={20} color="var(--primary-600)" />
                <span>Documents</span>
              </h2>
              <p className="profile-card-desc">
                Access your company letters, contracts, salary slips, and verified certificates.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--slate-50)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--slate-900)', fontSize: '0.925rem' }}>Employee Document Vault</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '0.2rem' }}>
                  Securely view and download official documentation issued to your account.
                </div>
              </div>
              <Link
                to="/employee/documents"
                className="profile-btn-submit"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.1rem', fontSize: '0.85rem' }}
                id="profile-view-my-docs-btn"
              >
                <span>View My Documents</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
