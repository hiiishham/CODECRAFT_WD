import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { KeyRound, ArrowRight, ArrowLeft, Loader2, AlertCircle, RotateCcw, CheckCircle2 } from 'lucide-react';
import authService from '../services/authService.js';
import StaffPulseLogo from '../components/common/StaffPulseLogo.jsx';
import '../styles/login.css';

export const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleDigitChange = (index, value) => {
    // Only accept numeric characters
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal && value !== '') return;

    const newDigits = [...otpDigits];

    if (cleanVal.length > 1) {
      // Handle paste
      const pastedChars = cleanVal.slice(0, 6).split('');
      pastedChars.forEach((ch, i) => {
        if (index + i < 6) newDigits[index + i] = ch;
      });
      setOtpDigits(newDigits);
      const nextFocus = Math.min(index + pastedChars.length, 5);
      inputRefs.current[nextFocus]?.focus();
    } else {
      newDigits[index] = cleanVal;
      setOtpDigits(newDigits);
      if (cleanVal && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }

    if (error) setError('');
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      setError('Please enter all 6 digits of the verification code');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await authService.verifyOtp({ email, otp });
      if (response.success) {
        // Proceed to set new password
        navigate('/reset-password', { state: { email, otp } });
      } else {
        setError(response.message || 'Invalid or expired verification code');
      }
    } catch (err) {
      setError(err.message || 'Failed to verify code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await authService.forgotPassword({ email });
      if (response.success) {
        setSuccessMsg('A new 6-digit verification code has been dispatched.');
        setCooldown(60);
        setOtpDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(response.message || 'Unable to resend verification code');
      }
    } catch (err) {
      setError(err.message || 'Failed to request new code');
    } finally {
      setIsResending(false);
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
              Verification <br />
              Code <br />
              <span className="text-orange">Required.</span>
            </h1>
            <p className="login-visual-subtitle">
              We dispatched a secure one-time authentication code to verify your identity.
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
              <span className="welcome-label">TWO-FACTOR VERIFICATION</span>
              <h2 className="login-title">Enter Security Code</h2>
              <p className="login-subtitle">
                Please enter the 6-digit code sent to <strong style={{ color: '#0f172a' }}>{email}</strong>
              </p>
            </header>

            {error && (
              <div className="form-alert" role="alert">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="form-alert" style={{ background: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46' }}>
                <CheckCircle2 size={20} color="#059669" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleVerify}>
              <div className="otp-input-group">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="otp-digit-input"
                    autoFocus={index === 0}
                    disabled={isSubmitting}
                  />
                ))}
              </div>

              <div className="resend-row">
                <span>Didn't receive the email?</span>
                <button
                  type="button"
                  className="resend-btn"
                  onClick={handleResend}
                  disabled={cooldown > 0 || isResending}
                >
                  {isResending ? (
                    'Sending...'
                  ) : cooldown > 0 ? (
                    `Resend in ${cooldown}s`
                  ) : (
                    'Resend Code'
                  )}
                </button>
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={isSubmitting || otpDigits.join('').length !== 6}
                id="verify-otp-btn"
                style={{ marginTop: '1.5rem' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <Link to="/forgot-password" className="auth-secondary-btn">
                <ArrowLeft size={16} />
                <span>Change Email Address</span>
              </Link>
            </form>
          </div>
          <div className="login-form-spacer"></div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
