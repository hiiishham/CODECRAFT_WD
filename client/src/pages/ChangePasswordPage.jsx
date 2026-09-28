import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, CheckCircle2, ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getDashboardPath } from '../utils/roleRoutes.js';
import StaffPulseLogo from '../components/common/StaffPulseLogo.jsx';
import '../styles/login.css';

export const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { user, forceChangePassword, logout, skipPasswordChange } = useAuth();

  const isMandatory = !!user?.mustChangePassword;

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.currentPassword) {
      setError('Please enter your current temporary password');
      return;
    }
    if (!formData.newPassword) {
      setError('Please enter a new password');
      return;
    }
    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }
    if (formData.newPassword === formData.currentPassword) {
      setError('New password must be different from current password');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await forceChangePassword(
        formData.currentPassword,
        formData.newPassword,
        formData.confirmPassword
      );

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          const dest = getDashboardPath(user?.role || 'employee');
          navigate(dest, { replace: true });
        }, 1500);
      } else {
        setError(result.message || 'Failed to update password. Please check your current password.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while updating your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleSkip = () => {
    skipPasswordChange();
    const dest = getDashboardPath(user?.role || 'employee');
    navigate(dest, { replace: true });
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Left Side: Dark Hero Panel */}
        <div className="login-visual-panel">
          <header className="login-visual-header">
            <StaffPulseLogo variant="full" theme="dark" height={56} className="login-hero-logo" />
          </header>
          <div className="login-visual-content">
            <h1 className="login-visual-title">
              Secure Your <br />
              StaffPulse <br />
              <span className="text-orange">Account.</span>
            </h1>
            <p className="login-visual-subtitle">
              {isMandatory
                ? 'Your administrator has created an account with an initial temporary password. Please set your personal password before continuing.'
                : 'Keep your account protected with a unique, secure password.'}
            </p>
          </div>
          <div className="login-visual-bottom">
            <span className="copyright">© 2026 StaffPulse. All rights reserved.</span>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="login-form-panel">
          <div className="login-card">
            <header className="login-header">
              <div className="login-mobile-brand">
                <StaffPulseLogo variant="full" theme="light" height={42} />
              </div>
              <span className="welcome-label">
                {isMandatory ? 'MANDATORY SETUP' : 'SECURITY SETTINGS'}
              </span>
              <h2 className="login-title">
                {isMandatory ? 'Set Your Password' : 'Change Password'}
              </h2>
              <p className="login-subtitle">
                {isMandatory
                  ? 'Please replace your temporary password with a new personal password.'
                  : 'Update your password to keep your account secure.'}
              </p>
            </header>

            {isMandatory && (
              <div className="auth-notice-box">
                <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  For security, you must update your initial password before accessing your dashboard.
                </span>
              </div>
            )}

            {error && (
              <div className="form-alert" role="alert">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
                  Password Set Successfully!
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Taking you to your workspace dashboard...
                </p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Loader2 className="animate-spin" size={24} color="#FF6B2C" />
                </div>
              </div>
            ) : (
              <form className="login-form" onSubmit={handleSubmit} noValidate>
                {/* Current / Temporary Password */}
                <div className="form-group">
                  <label className="form-label" htmlFor="current-password">
                    {isMandatory ? 'Current Temporary Password' : 'Current Password'}
                  </label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input
                      id="current-password"
                      name="currentPassword"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Enter current password"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="form-group">
                  <label className="form-label" htmlFor="new-password">
                    New Password
                  </label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input
                      id="new-password"
                      name="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="At least 6 characters"
                      value={formData.newPassword}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="form-group">
                  <label className="form-label" htmlFor="confirm-new-password">
                    Confirm New Password
                  </label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input
                      id="confirm-new-password"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Re-enter new password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                  id="change-password-submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>{isMandatory ? 'Save & Continue to Dashboard' : 'Update Password'}</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="skip-btn"
                  onClick={handleSkip}
                  id="change-password-skip-btn"
                >
                  Skip for Now
                </button>

                <button
                  type="button"
                  className="auth-secondary-btn"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </form>
            )}
          </div>
          <div className="login-form-spacer"></div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
