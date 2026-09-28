import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Loader2,
  Users,
  BarChart2,
  ShieldCheck,
  CheckSquare,
  Square,
  Clock,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getDashboardPath } from '../utils/roleRoutes.js';
import StaffPulseLogo from '../components/common/StaffPulseLogo.jsx';
import '../styles/login.css';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, sessionExpired, clearSessionExpired } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guarantee fields are strictly empty on mount and clear session state if expired
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      email: '',
      password: '',
    }));

    if (sessionExpired) {
      setErrorMessage('Your session has expired or is invalid. Please sign in again.');
      clearSessionExpired();
    }
  }, [sessionExpired, clearSessionExpired]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email address or Employee ID is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await login(
        formData.email.trim(),
        formData.password,
        formData.rememberMe
      );

      if (result.success) {
        const user = result.user || result.admin;
        if (user?.mustChangePassword) {
          navigate('/change-password', { replace: true });
          return;
        }

        const userRole = user?.role || 'admin';
        const requestedPath = location.state?.from?.pathname;

        let destination;
        if (requestedPath && requestedPath !== '/dashboard') {
          destination = requestedPath;
        } else {
          destination = getDashboardPath(userRole);
        }

        navigate(destination, { replace: true });
      } else {
        setErrorMessage(result.message || 'Invalid email or password.');
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Left Side: Dark Hero Panel */}
        <div className="login-visual-panel">
          <div className="login-visual-grid" aria-hidden="true" />
          
          <header className="login-visual-header">
            <StaffPulseLogo variant="full" theme="dark" width={180} height="auto" className="login-hero-logo" />
          </header>
          
          <div className="login-visual-content">
            <h1 className="login-visual-title">
              Simplify <br className="desktop-break" />
              your workforce. <br className="desktop-break" />
              Build a better <br className="desktop-break" />
              <span className="text-orange">tomorrow.</span>
            </h1>
            <p className="login-visual-subtitle">
              An all-in-one platform for attendance, leave, payroll, performance and more — designed for modern teams.
            </p>
            
            <div className="login-visual-features">
              <div className="feature-item">
                <div className="feature-icon-box">
                  <Users size={20} />
                </div>
                <div className="feature-text">
                  <span className="feature-title">Manage People</span>
                  <span className="feature-desc">Grow stronger teams</span>
                </div>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon-box">
                  <BarChart2 size={20} />
                </div>
                <div className="feature-text">
                  <span className="feature-title">Track Progress</span>
                  <span className="feature-desc">Data-driven insights</span>
                </div>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon-box">
                  <ShieldCheck size={20} />
                </div>
                <div className="feature-text">
                  <span className="feature-title">Work Securely</span>
                  <span className="feature-desc">Your data, always protected</span>
                </div>
              </div>
            </div>
          </div>

          <div className="login-visual-bottom">
            <span className="copyright">© 2026 StaffPulse. All rights reserved.</span>
            <div className="handwritten-text">
              Good<br/>People<br/>Great Work
            </div>
          </div>
        </div>

        {/* Right Side: Login Form Panel */}
        <div className="login-form-panel">
          <div className="login-form-header">
            New here? <a href="mailto:admin@ems.com" className="contact-admin-link" style={{ color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'none' }}>Contact Admin</a>
          </div>

          <div className="login-card">
            <header className="login-header">
              <div className="login-mobile-brand">
                <StaffPulseLogo variant="full" theme="light" height={42} />
              </div>
              <span className="welcome-label">WELCOME BACK</span>
              <h2 className="login-title">Sign in to StaffPulse</h2>
              <p className="login-subtitle">Access your workspace and keep things moving.</p>
            </header>

            {errorMessage && (
              <div className="form-alert" role="alert">
                {errorMessage.includes('expired') ? <Clock size={20} /> : <AlertCircle size={20} />}
                <span>{errorMessage}</span>
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit} noValidate autoComplete="off">
              {/* Hidden dummy fields to neutralize aggressive browser autofill */}
              <input
                type="text"
                name="prevent_autofill_email"
                tabIndex={-1}
                aria-hidden="true"
                autoComplete="off"
                style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, pointerEvents: 'none' }}
              />
              <input
                type="password"
                name="prevent_autofill_password"
                tabIndex={-1}
                aria-hidden="true"
                autoComplete="new-password"
                style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, pointerEvents: 'none' }}
              />

              {/* Email or Employee ID */}
              <div className="form-group">
                <label className="form-label" htmlFor="email-input">
                  Email or Employee ID
                </label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    id="email-input"
                    name="email"
                    type="email"
                    className={"form-input " + (errors.email ? 'has-error' : '')}
                    placeholder="e.g. admin@ems.com or EMP-1001"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="off"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="password-input">
                  Password
                </label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    id="password-input"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className={"form-input " + (errors.password ? 'has-error' : '')}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              {/* Remember Session Option */}
              <div className="form-actions">
                <label className="remember-label" htmlFor="remember-me">
                  <input
                    type="checkbox"
                    id="remember-me"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    style={{ display: 'none' }}
                  />
                  {formData.rememberMe ? (
                    <CheckSquare size={18} color="#FF6B2C" />
                  ) : (
                    <Square size={18} color="#cbd5e1" />
                  )}
                  <span>Remember me</span>
                </label>
                <button 
                  type="button" 
                  className="forgot-link" 
                  onClick={() => navigate('/forgot-password')}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="submit-btn"
                disabled={isSubmitting}
                id="login-submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <div className="security-badge">
              <div className="security-icon">
                <ShieldCheck size={28} />
              </div>
              <div className="security-text">
                <span className="security-title">Secure login</span>
                <span className="security-desc">Your data is encrypted and protected.</span>
              </div>
            </div>
          </div>
          <div className="login-form-spacer"></div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
