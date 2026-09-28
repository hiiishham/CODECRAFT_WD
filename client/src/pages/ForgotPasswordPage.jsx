import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import authService from '../services/authService.js';
import StaffPulseLogo from '../components/common/StaffPulseLogo.jsx';
import '../styles/login.css';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your account email address');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await authService.forgotPassword({ email: trimmed });
      if (response.success) {
        // Navigate to OTP verification page with email in state
        navigate('/verify-otp', { state: { email: trimmed } });
      } else {
        setError(response.message || 'Failed to send reset code. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while requesting password reset.');
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
              Account <br />
              Recovery & <br />
              <span className="text-orange">Security.</span>
            </h1>
            <p className="login-visual-subtitle">
              Verify your identity using a secure one-time passcode sent directly to your corporate inbox.
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
              <span className="welcome-label">PASSWORD RECOVERY</span>
              <h2 className="login-title">Forgot Password?</h2>
              <p className="login-subtitle">
                Enter your registered corporate email and we will send a 6-digit verification code.
              </p>
            </header>

            {error && (
              <div className="form-alert" role="alert">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="recovery-email">
                  Corporate Email Address
                </label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    id="recovery-email"
                    type="email"
                    className={"form-input " + (error ? 'has-error' : '')}
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    autoComplete="email"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={isSubmitting}
                id="send-otp-btn"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <Link to="/login" className="auth-secondary-btn">
                <ArrowLeft size={16} />
                <span>Back to Sign In</span>
              </Link>
            </form>

            <div className="security-badge">
              <div className="security-icon">
                <ShieldCheck size={28} />
              </div>
              <div className="security-text">
                <span className="security-title">Encrypted Verification</span>
                <span className="security-desc">Password reset codes expire after 10 minutes.</span>
              </div>
            </div>
          </div>
          <div className="login-form-spacer"></div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
