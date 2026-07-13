import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from './api/axiosClient';

function GoogleCallbackPage() {
  const navigate = useNavigate();
  const hasHandledCallbackRef = useRef(false);
  const [message, setMessage] = useState('Completing Google sign-in...');

  const getRedirectPathByRole = (role) => {
    const cleanRole = String(role || '').toUpperCase();

    if (cleanRole === 'SYSTEM_ADMIN' || cleanRole === 'PARKING_MANAGER') {
      return '/dashboard';
    }

    if (cleanRole === 'PARKING_STAFF') {
      return '/check-in-out';
    }

    if (cleanRole === 'DRIVER' || cleanRole === 'USER') {
      return '/user-ui';
    }

    return '/user-ui';
  };

  const clearOldTokenStorage = () => {
    /*
     * Cookie-only auth:
     * access_token and refresh_token are stored as HttpOnly cookies by backend.
     * These removals only clean old localStorage tokens from previous versions.
     */
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('headerUserSyncedAt');
  };

  const normalizeRole = (data = {}) => {
    if (data.role && typeof data.role === 'object') {
      return String(
        data.role.roleName ||
          data.role.name ||
          data.role.authority ||
          'DRIVER'
      ).toUpperCase();
    }

    if (data.role && typeof data.role === 'string') {
      return data.role.toUpperCase();
    }

    if (data.roleName) {
      return String(data.roleName).toUpperCase();
    }

    if (data.authority) {
      return String(data.authority).toUpperCase();
    }

    return 'DRIVER';
  };

  const saveUserOnlyAndRedirect = (data = {}) => {
    const role = normalizeRole(data);

    const userObj = {
      userId: data.userId,
      fullName: data.fullName || data.name || data.email || 'Google User',
      email: data.email,
      role
    };

    /*
     * Only non-sensitive user metadata is stored in localStorage.
     * Do not store accessToken or refreshToken here.
     */
    localStorage.setItem('user', JSON.stringify(userObj));
    localStorage.setItem('user_role', role);

    navigate(getRedirectPathByRole(role), { replace: true });
  };

  useEffect(() => {
    if (hasHandledCallbackRef.current) {
      return;
    }

    hasHandledCallbackRef.current = true;

    const completeGoogleLogin = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const stateFromGoogle = searchParams.get('state');
      const savedState = sessionStorage.getItem('google_oauth_state');

      clearOldTokenStorage();

      if (error) {
        setMessage('Google sign-in was cancelled or failed.');
        setTimeout(() => navigate('/login', { replace: true }), 1200);
        return;
      }

      if (!code) {
        setMessage('Missing Google authorization code.');
        setTimeout(() => navigate('/login', { replace: true }), 1200);
        return;
      }

      if (savedState && stateFromGoogle && savedState !== stateFromGoogle) {
        setMessage('Invalid Google sign-in state.');
        setTimeout(() => navigate('/login', { replace: true }), 1200);
        return;
      }

      const handledCodeKey = `google_code_handled_${code}`;

      if (sessionStorage.getItem(handledCodeKey) === 'true') {
        return;
      }

      sessionStorage.setItem(handledCodeKey, 'true');
      sessionStorage.removeItem('google_oauth_state');

      try {
        /*
         * Backend exchanges Google authorization code, then sets:
         * - access_token HttpOnly cookie
         * - refresh_token HttpOnly cookie
         *
         * Frontend should not store tokens from this response.
         */
        await axiosClient.post('/auth/google-code', {
          code
        });

        /*
         * Read the logged-in user through cookie-authenticated /auth/me.
         * This keeps token values outside JavaScript.
         */
        const meResponse = await axiosClient.get('/auth/me');
        saveUserOnlyAndRedirect(meResponse.data || {});
      } catch (error) {
        console.error('Google redirect login failed:', error);

        const errorMessage =
          error.response?.data?.message ||
          error.response?.data ||
          'Google sign-in failed.';

        setMessage(errorMessage);

        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        localStorage.removeItem('user_role');
        localStorage.removeItem('headerUserSyncedAt');

        setTimeout(() => navigate('/login', { replace: true }), 1800);
      }
    };

    completeGoogleLogin();
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#020617',
        color: '#e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, Arial, sans-serif'
      }}
    >
      <div
        style={{
          width: '360px',
          padding: '2rem',
          borderRadius: '1rem',
          background: '#0f172a',
          border: '1px solid #1e293b',
          textAlign: 'center'
        }}
      >
        <h2 style={{ margin: '0 0 0.75rem', color: '#ffffff' }}>
          Google Sign-in
        </h2>

        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
          {message}
        </p>
      </div>
    </div>
  );
}

export default GoogleCallbackPage;