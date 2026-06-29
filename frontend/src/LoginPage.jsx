import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosClient from './api/axiosClient';

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [notification, setNotification] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const navigate = useNavigate();

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const showToast = (message, type = 'success') => {
    setNotification({
      show: true,
      message,
      type
    });

    setTimeout(() => {
      setNotification((prev) => ({
        ...prev,
        show: false
      }));
    }, 4000);
  };

  const getRedirectPathByRole = (role) => {
    if (role === 'SYSTEM_ADMIN') return '/dashboard';
    if (role === 'PARKING_MANAGER') return '/dashboard';
    if (role === 'PARKING_STAFF') return '/check-in-out';
    if (role === 'DRIVER') return '/dashboard';

    return '/dashboard';
  };

  const saveAuthDataIfExists = (data) => {
    const accessToken = data?.accessToken || data?.token || data?.jwt;
    const refreshToken = data?.refreshToken;

    if (accessToken) {
      localStorage.setItem('token', accessToken);
    }

    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  };

  const loadCurrentUserAndRedirect = async (emailFallback = '') => {
    const meResponse = await axiosClient.get('/auth/me');
    const data = meResponse.data || {};

    const userObj = {
      userId: data.userId,
      fullName: data.fullName || data.name || data.email || emailFallback,
      email: data.email || emailFallback,
      role: data.role || 'PARKING_STAFF'
    };

    localStorage.setItem('user', JSON.stringify(userObj));

    showToast('Login successful! Redirecting...', 'success');

    setTimeout(() => {
      setIsLoading(false);
      setIsGoogleLoading(false);
      window.location.href = getRedirectPathByRole(userObj.role);
    }, 800);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    const email = formData.email.trim().toLowerCase();

    try {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');

      const loginResponse = await axiosClient.post('/auth/login', {
        email,
        password: formData.password
      });

      saveAuthDataIfExists(loginResponse.data);
      await loadCurrentUserAndRedirect(email);
    } catch (error) {
      console.error('Lỗi API login:', error);

      showToast(
        error.response?.data?.message ||
          error.response?.data ||
          'Invalid email or password.',
        'error'
      );

      setIsLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    const credential = credentialResponse?.credential;

    if (!credential) {
      showToast('Google login failed. Please try again.', 'error');
      return;
    }

    try {
      setIsGoogleLoading(true);

      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');

      const googleResponse = await axiosClient.post('/auth/google', {
        credential
      });

      saveAuthDataIfExists(googleResponse.data);
      await loadCurrentUserAndRedirect();
    } catch (error) {
      console.error('Lỗi Google login:', error);

      showToast(
        error.response?.data?.message ||
          error.response?.data ||
          'Google login failed. Your Google account may not be registered in the system.',
        'error'
      );

      setIsGoogleLoading(false);
    }
  };

  const handleGoogleLoginError = () => {
    showToast('Google login was cancelled or failed.', 'error');
  };

  const isPageLoading = isLoading || isGoogleLoading;

  return (
    <div className="auth-container" style={{ position: 'relative' }}>
      {notification.show && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: notification.type === 'success' ? '#1e293b' : '#451a1a',
            color: notification.type === 'success' ? '#4ade80' : '#f87171',
            padding: '1rem 2rem',
            borderRadius: '0.5rem',
            zIndex: 9999,
            fontWeight: '600'
          }}
        >
          {notification.message}
        </div>
      )}

      <div className="login-column">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              backgroundColor: '#3b82f6',
              padding: '0.4rem',
              borderRadius: '0.375rem',
              display: 'flex'
            }}
          >
            <span style={{ fontWeight: '800', color: '#fff' }}>P</span>
          </div>

          <span style={{ fontWeight: '600', color: '#f8fafc' }}>
            ParkSystem Pro
          </span>
        </div>

        <div style={{ margin: 'auto 0', maxWidth: '400px', width: '100%' }}>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              color: '#ffffff'
            }}
          >
            Welcome back.
          </h1>

          <p
            style={{
              color: '#64748b',
              fontSize: '0.85rem',
              marginBottom: '2.5rem'
            }}
          >
            Enter credentials to access the station.
          </p>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label className="input-label">EMAIL / USERNAME</label>

              <div className="input-wrapper">
                <User size={16} className="input-icon-left" />

                <input
                  type="text"
                  name="email"
                  className="form-input"
                  placeholder="e.g. staff@company.vn"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isPageLoading}
                  required
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label className="input-label">PASSWORD</label>

              <div className="input-wrapper">
                <Lock size={16} className="input-icon-left" />

                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isPageLoading}
                  required
                />

                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isPageLoading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem',
                marginBottom: '1.5rem'
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  style={{ accentColor: '#3b82f6' }}
                  disabled={isPageLoading}
                />
                Remember me
              </label>

              <span
                style={{
                  color: '#3b82f6',
                  cursor: isPageLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '500'
                }}
                onClick={() => !isPageLoading && navigate('/forgot-password')}
              >
                Forgot password?
              </span>
            </div>

            <button
              type="submit"
              disabled={isPageLoading}
              style={{
                width: '100%',
                padding: '0.85rem',
                backgroundColor: isPageLoading ? '#1e3a8a' : '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: isPageLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}
            >
              {isLoading ? 'Verifying Access...' : 'Sign In'}
              {!isPageLoading && <ArrowRight size={16} />}
            </button>
          </form>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}
          >
            <div style={{ flex: 1, height: '1px', background: '#1e293b' }} />
            <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
              OR
            </span>
            <div style={{ flex: 1, height: '1px', background: '#1e293b' }} />
          </div>

          <div
            style={{
              opacity: isPageLoading ? 0.65 : 1,
              pointerEvents: isPageLoading ? 'none' : 'auto',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
              text="continue_with"
              shape="rectangular"
              theme="filled_black"
              size="large"
              width="400"
            />
          </div>

          {isGoogleLoading && (
            <p
              style={{
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '0.8rem',
                marginTop: '-0.8rem',
                marginBottom: '1rem'
              }}
            >
              Verifying Google account...
            </p>
          )}

          <div
            style={{
              fontSize: '0.85rem',
              color: '#94a3b8',
              textAlign: 'center'
            }}
          >
            Don&apos;t have an account?{' '}
            <span
              style={{
                color: '#3b82f6',
                fontWeight: '600',
                textDecoration: 'underline',
                cursor: isPageLoading ? 'not-allowed' : 'pointer'
              }}
              onClick={() => !isPageLoading && navigate('/register')}
            >
              Sign Up
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            marginTop: '1.5rem'
          }}
        >
          <ShieldCheck size={16} style={{ color: '#22c55e' }} />

          <p
            style={{
              fontSize: '0.72rem',
              color: '#64748b',
              margin: 0
            }}
          >
            Protected System. Unauthorized access attempts will be logged.
          </p>
        </div>
      </div>

      <div className="showcase-column anh-dong">
        <div className="dashboard-perspective-wrapper">
          <img
            src={new URL('./Pictures/carparking.png', import.meta.url).href}
            alt="Dashboard Preview"
            style={{
              width: '100%',
              borderRadius: '0.75rem',
              boxShadow: '-20px 30px 60px rgba(0, 0, 0, 0.7)'
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default LoginPage;