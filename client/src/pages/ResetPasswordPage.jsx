import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import authService from '../services/authService.js';
import StaffPulseLogo from '../components/common/StaffPulseLogo.jsx';
import '../styles/login.css';

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email] = useState(location.state?.email || '');
  const [otp] = useState(location.state?.otp || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!email || !otp) {
      navigate('/forgot-password');
    }
  }, [email, otp, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await authService.resetPassword({
        email,
        otp,
        newPassword,
        confirmPassword,
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      } else {
        setError(response.message || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while resetting password.');
    } finally {
      setIsSubmitting(false);
    }
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
              Set Your <br />
              New <br />
              <span className="text-orange">Password.</span>
            </h1>
            <p className="login-visual-subtitle">
              Choose a strong, unique password to safeguard your corporate workspace and sensitive information.
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
              <span className="welcome-label">CREDENTIAL UPDATE</span>
              <h2 className="login-title">Reset Password</h2>
              <p className="login-subtitle">
                Create a secure password for <strong style={{ color: '#0f172a' }}>{email}</strong>
              </p>
            </header>

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
                  Password Reset Successfully!
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                  Your password has been securely updated. Redirecting you to login...
                </p>
                <Link to="/login" className="submit-btn" style={{ textDecoration: 'none' }}>
                  <span>Proceed to Sign In</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            ) : (
              <form className="login-form" onSubmit={handleSubmit} noValidate>
                {/* New Password */}
                <div className="form-group">
                  <label className="form-label" htmlFor="new-password">
                    New Password
                  </label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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

                {/* Confirm Password */}
                <div className="form-group">
                  <label className="form-label" htmlFor="confirm-new-password">
                    Confirm New Password
                  </label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" size={18} />
                    <input
                      id="confirm-new-password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                  id="reset-submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Save New Password</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="security-badge">
              <div className="security-icon">
                <ShieldCheck size={28} />
              </div>
              <div className="security-text">
                <span className="security-title">Encrypted Storage</span>
                <span className="security-desc">Passwords are hashed using industry-standard bcrypt.</span>
              </div>
            </div>
          </div>
          <div className="login-form-spacer"></div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
