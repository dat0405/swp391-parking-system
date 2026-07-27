import React, {
  useEffect,
  useRef,
  useState
} from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from './api/axiosClient';
import {
  getDefaultPathByRole,
  isSupportedRole,
  normalizeRole
} from './utils/auth';

function GoogleCallbackPage() {
  const navigate = useNavigate();
  const hasHandledCallbackRef = useRef(false);
  const [message, setMessage] = useState(
    'Completing Google sign-in...'
  );

  const clearOldTokenStorage = () => {
    /*
     * Cookie-only auth:
     * access_token and refresh_token are HttpOnly cookies.
     * These removals clean data from older frontend versions.
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
        'The Google account does not have a supported system role.'
      );
    }

    return cleanRole;
  };

  const saveUserOnlyAndRedirect = (data = {}) => {
    const role = extractRoleFromResponse(data);

    const userObj = {
      userId: data.userId,
      fullName:
        data.fullName ||
        data.name ||
        data.email ||
        'Google User',
      email: data.email,
      role
    };

    /*
     * Only non-sensitive user metadata is stored in localStorage.
     * New Google accounts are created as DRIVER by the backend.
     */
    localStorage.setItem(
      'user',
      JSON.stringify(userObj)
    );
    localStorage.setItem('user_role', role);

    navigate(
      getDefaultPathByRole(role),
      { replace: true }
    );
  };

  useEffect(() => {
    if (hasHandledCallbackRef.current) {
      return;
    }

    hasHandledCallbackRef.current = true;

    const completeGoogleLogin = async () => {
      const searchParams = new URLSearchParams(
        window.location.search
      );

      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const stateFromGoogle =
        searchParams.get('state');
      const savedState = sessionStorage.getItem(
        'google_oauth_state'
      );

      clearOldTokenStorage();

      if (error) {
        setMessage(
          'Google sign-in was cancelled or failed.'
        );
        setTimeout(
          () => navigate('/login', { replace: true }),
          1200
        );
        return;
      }

      if (!code) {
        setMessage(
          'Missing Google authorization code.'
        );
        setTimeout(
          () => navigate('/login', { replace: true }),
          1200
        );
        return;
      }

      if (
        savedState &&
        stateFromGoogle &&
        savedState !== stateFromGoogle
      ) {
        setMessage('Invalid Google sign-in state.');
        setTimeout(
          () => navigate('/login', { replace: true }),
          1200
        );
        return;
      }

      const handledCodeKey =
        `google_code_handled_${code}`;

      if (
        sessionStorage.getItem(handledCodeKey) ===
        'true'
      ) {
        return;
      }

      sessionStorage.setItem(
        handledCodeKey,
        'true'
      );
      sessionStorage.removeItem(
        'google_oauth_state'
      );

      try {
        /*
         * Backend exchanges the Google authorization code and sets
         * access_token and refresh_token as HttpOnly cookies.
         */
        await axiosClient.post('/auth/google-code', {
          code
        });

        const meResponse = await axiosClient.get(
          '/auth/me'
        );

        saveUserOnlyAndRedirect(
          meResponse.data || {}
        );
      } catch (requestError) {
        console.error(
          'Google redirect login failed:',
          requestError
        );

        const errorMessage =
          requestError.response?.data?.message ||
          requestError.response?.data ||
          requestError.message ||
          'Google sign-in failed.';

        setMessage(errorMessage);
        clearOldTokenStorage();

        setTimeout(
          () => navigate('/login', { replace: true }),
          1800
        );
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
        <h2
          style={{
            margin: '0 0 0.75rem',
            color: '#ffffff'
          }}
        >
          Google Sign-in
        </h2>

        <p
          style={{
            margin: 0,
            color: '#94a3b8',
            fontSize: '0.9rem'
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}

export default GoogleCallbackPage;
