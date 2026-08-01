import React, { useCallback, useEffect, useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosClient from './api/axiosClient';
import {
  getDefaultPathByRole,
  isSupportedRole,
  normalizeRole
} from './utils/auth';

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

  const resetGoogleLoginState = useCallback(() => {
    setIsGoogleLoading(false);
  }, []);

  useEffect(() => {
    const handlePageShow = () => {
      resetGoogleLoginState();
    };

    const handleWindowFocus = () => {
      resetGoogleLoginState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetGoogleLoginState();
      }
    };

    window.addEventListener(
      'pageshow',
      handlePageShow
    );

    window.addEventListener(
      'focus',
      handleWindowFocus
    );

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    return () => {
      window.removeEventListener(
        'pageshow',
        handlePageShow
      );

      window.removeEventListener(
        'focus',
        handleWindowFocus
      );

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
    };
  }, [resetGoogleLoginState]);

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

  const clearOldTokenStorage = () => {
    /*
     * Cookie-only auth:
     * access_token and refresh_token are stored by the backend as
     * HttpOnly cookies. These removals clean old localStorage data.
     */
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('user_role');
    localStorage.removeItem('headerUserSyncedAt');
  };

  const extractRoleFromResponse = (data = {}) => {
    let rawRole = '';

    if (data.role && typeof data.role === 'object') {
      rawRole =
        data.role.roleName ||
        data.role.name ||
        data.role.authority ||
        '';
    } else if (typeof data.role === 'string') {
      rawRole = data.role;
    } else if (data.roleName) {
      rawRole = data.roleName;
    } else if (data.authority) {
      rawRole = data.authority;
    }

    const cleanRole = normalizeRole(rawRole);

    if (!isSupportedRole(cleanRole)) {
      throw new Error(
        'The account does not have a supported system role.'
      );
    }

    return cleanRole;
  };

  const loadCurrentUserAndRedirect = async (
    emailFallback = ''
  ) => {
    /*
     * After /auth/login succeeds, the browser already has HttpOnly
     * cookies. /auth/me reads the authenticated account from them.
     */
    const meResponse = await axiosClient.get('/auth/me');
    const data = meResponse.data || {};
    const finalRole = extractRoleFromResponse(data);

    const userObj = {
      userId: data.userId,
      fullName:
        data.fullName ||
        data.name ||
        data.email ||
        emailFallback,
      email: data.email || emailFallback,
      role: finalRole
    };

    /*
     * Only non-sensitive display/session metadata is stored here.
     * DRIVER is the normal end-user role. There is no USER role.
     */
    localStorage.setItem(
      'user',
      JSON.stringify(userObj)
    );
    localStorage.setItem('user_role', finalRole);

    showToast(
      'Login successful! Redirecting...',
      'success'
    );

    setTimeout(() => {
      setIsLoading(false);
      setIsGoogleLoading(false);
      navigate(
        getDefaultPathByRole(finalRole),
        { replace: true }
      );
    }, 800);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    const email = formData.email
      .trim()
      .toLowerCase();

    try {
      clearOldTokenStorage();

      await axiosClient.post('/auth/login', {
        email,
        password: formData.password
      });

      await loadCurrentUserAndRedirect(email);
    } catch (error) {
      console.error('Login API error:', error);

      showToast(
        error.response?.data?.message ||
          error.response?.data ||
          error.message ||
          'Invalid email or password.',
        'error'
      );

      setIsLoading(false);
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleButtonClick = () => {
    if (isLoading || isGoogleLoading) {
      return;
    }

    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      showToast(
        'Missing Google Client ID configuration.',
        'error'
      );
      return;
    }

    setIsGoogleLoading(true);

    try {
      const redirectUri =
        `${window.location.origin}/auth/google/callback`;

      const state =
        typeof crypto !== 'undefined' &&
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()
              .toString(16)
              .slice(2)}`;

      sessionStorage.setItem(
        'google_oauth_state',
        state
      );

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        prompt: 'select_account',
        state
      });

      window.location.assign(
        `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      );
    } catch (error) {
      console.error(
        'Google login redirect failed:',
        error
      );

      resetGoogleLoginState();

      showToast(
        'Unable to open Google Sign-In. Please try again.',
        'error'
      );
    }
  };

  const isNormalLoginLoading = isLoading;
  const isGoogleButtonLoading =
    isLoading || isGoogleLoading;

  return (
    <div
      className="auth-container"
      style={{ position: 'relative' }}
    >
      {notification.show && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor:
              notification.type === 'success'
                ? '#1e293b'
                : '#451a1a',
            color:
              notification.type === 'success'
                ? '#4ade80'
                : '#f87171',
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <div
            style={{
              backgroundColor: '#3b82f6',
              padding: '0.4rem',
              borderRadius: '0.375rem',
              display: 'flex'
            }}
          >
            <span
              style={{
                fontWeight: '800',
                color: '#fff'
              }}
            >
              P
            </span>
          </div>

          <span
            style={{
              fontWeight: '600',
              color: '#f8fafc'
            }}
          >
            ParkSystem Pro
          </span>
        </div>

        <div
          style={{
            margin: 'auto 0',
            maxWidth: '400px',
            width: '100%'
          }}
        >
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
              <label className="input-label">
                EMAIL / USERNAME
              </label>

              <div className="input-wrapper">
                {/* User is a Lucide icon name, not a role. */}
                <User
                  size={16}
                  className="input-icon-left"
                />

                <input
                  type="text"
                  name="email"
                  className="form-input"
                  placeholder="e.g. staff@company.vn"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isNormalLoginLoading}
                  required
                />
              </div>
            </div>

            <div
              className="input-group"
              style={{ marginBottom: '1.5rem' }}
            >
              <label className="input-label">
                PASSWORD
              </label>

              <div className="input-wrapper">
                <Lock
                  size={16}
                  className="input-icon-left"
                />

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isNormalLoginLoading}
                  required
                />

                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                  disabled={isNormalLoginLoading}
                >
                  {showPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
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
                  disabled={isNormalLoginLoading}
                />
                Remember me
              </label>

              <span
                style={{
                  color: '#3b82f6',
                  cursor: isNormalLoginLoading
                    ? 'not-allowed'
                    : 'pointer',
                  fontWeight: '500'
                }}
                onClick={() =>
                  !isNormalLoginLoading &&
                  navigate('/forgot-password')
                }
              >
                Forgot password?
              </span>
            </div>

            <button
              type="submit"
              disabled={isNormalLoginLoading}
              style={{
                width: '100%',
                padding: '0.85rem',
                backgroundColor: isNormalLoginLoading
                  ? '#1e3a8a'
                  : '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: isNormalLoginLoading
                  ? 'not-allowed'
                  : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem'
              }}
            >
              {isLoading
                ? 'Verifying Access...'
                : 'Sign In'}

              {!isNormalLoginLoading && (
                <ArrowRight size={16} />
              )}
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
            <div
              style={{
                flex: 1,
                height: '1px',
                background: '#1e293b'
              }}
            />

            <span
              style={{
                color: '#64748b',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              OR
            </span>

            <div
              style={{
                flex: 1,
                height: '1px',
                background: '#1e293b'
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleGoogleButtonClick}
            disabled={isGoogleButtonLoading}
            style={{
              width: '100%',
              height: '44px',
              backgroundColor: isGoogleButtonLoading
                ? '#f1f3f4'
                : '#ffffff',
              color: '#3c4043',
              border: '1px solid #dadce0',
              borderRadius: '4px',
              fontWeight: '500',
              fontSize: '14px',
              fontFamily: 'Roboto, Arial, sans-serif',
              cursor: isGoogleButtonLoading
                ? 'not-allowed'
                : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '1.5rem',
              opacity: isGoogleButtonLoading ? 0.75 : 1
            }}
            onMouseEnter={(event) => {
              if (!isGoogleButtonLoading) {
                event.currentTarget.style.backgroundColor =
                  '#f8fafd';
                event.currentTarget.style.borderColor =
                  '#d2e3fc';
              }
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor =
                isGoogleButtonLoading
                  ? '#f1f3f4'
                  : '#ffffff';
              event.currentTarget.style.borderColor =
                '#dadce0';
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.84 2.07-1.79 2.71v2.25h2.9c1.7-1.56 2.69-3.86 2.69-6.6z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.9-2.25c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33C2.44 15.96 5.48 18 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.95 10.7c-.18-.54-.28-1.11-.28-1.7s.1-1.16.28-1.7V4.97H.96C.35 6.18 0 7.55 0 9s.35 2.82.96 4.03l2.99-2.33z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.5.45 3.43 1.34l2.57-2.57C13.46.9 11.43 0 9 0 5.48 0 2.44 2.04.96 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"
              />
            </svg>

            <span>
              {isGoogleLoading
                ? 'Redirecting to Google...'
                : 'Continue with Google'}
            </span>
          </button>

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
                cursor: 'pointer'
              }}
              onClick={() =>
                !isNormalLoginLoading &&
                navigate('/register')
              }
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
          <ShieldCheck
            size={16}
            style={{ color: '#22c55e' }}
          />

          <p
            style={{
              fontSize: '0.72rem',
              color: '#64748b',
              margin: 0
            }}
          >
            Protected System. Unauthorized access
            attempts will be logged.
          </p>
        </div>
      </div>

      <div className="showcase-column anh-dong">
        <div className="dashboard-perspective-wrapper">
          <img
            src={
              new URL(
                './Pictures/carparking.png',
                import.meta.url
              ).href
            }
            alt="Dashboard Preview"
            style={{
              width: '100%',
              borderRadius: '0.75rem',
              boxShadow:
                '-20px 30px 60px rgba(0, 0, 0, 0.7)'
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
