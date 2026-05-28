import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setErrorMessage('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: usernameOrEmail,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('fullName', data.fullName);
      localStorage.setItem('email', data.email);
      localStorage.setItem('role', data.role);

      navigate('/dashboard');
    } catch (error) {
      setErrorMessage(error.message || 'Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="login-column">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div
            style={{
              backgroundColor: '#3b82f6',
              padding: '0.4rem',
              borderRadius: '0.375rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: '800', fontSize: '0.9rem', color: '#fff' }}>
              P
            </span>
          </div>

          <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#f8fafc' }}>
            ParkSystem Pro
          </span>
        </div>

        <div style={{ margin: 'auto 0', maxWidth: '400px', width: '100%' }}>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              color: '#ffffff',
            }}
          >
            Welcome back.
          </h1>

          <p
            style={{
              color: '#64748b',
              fontSize: '0.85rem',
              marginBottom: '2.5rem',
              lineHeight: '1.4',
            }}
          >
            Enter your credentials provided by the Administrator to access the station.
          </p>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label className="input-label">EMAIL / USERNAME</label>

              <div className="input-wrapper">
                <User size={16} className="input-icon-left" />

                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. staff@company.vn"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label className="input-label">PASSWORD</label>

              <div className="input-wrapper">
                <Lock size={16} className="input-icon-left" />

                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
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
                marginBottom: '1.5rem',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                <input type="checkbox" style={{ accentColor: '#3b82f6' }} />
                Remember me
              </label>

              <span
                onClick={() => navigate('/forgot-password')}
                style={{
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontWeight: '500',
                  textDecoration: 'none',
                }}
              >
                Forgot password?
              </span>
            </div>

            {errorMessage && (
              <div
                style={{
                  backgroundColor: '#7f1d1d',
                  color: '#fecaca',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.8rem',
                  marginBottom: '1rem',
                }}
              >
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.85rem',
                backgroundColor: loading ? '#64748b' : '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                marginBottom: '1.5rem',
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'} {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
            Don&apos;t have an account?{' '}
            <span
              onClick={() => navigate('/register')}
              style={{
                color: '#3b82f6',
                cursor: 'pointer',
                fontWeight: '600',
                textDecoration: 'underline',
              }}
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
            maxWidth: '360px',
            marginTop: '1.5rem',
          }}
        >
          <ShieldCheck size={16} style={{ color: '#22c55e', flexShrink: 0 }} />

          <p
            style={{
              fontSize: '0.72rem',
              color: '#64748b',
              lineHeight: '1.4',
              margin: 0,
            }}
          >
            Protected System. Unauthorized access attempts to the internal database will be
            logged.
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
              height: 'auto',
              display: 'block',
              borderRadius: '0.75rem',
              boxShadow: '-20px 30px 60px rgba(0, 0, 0, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          />
        </div>

        <div style={{ textAlign: 'center', maxWidth: '440px', marginTop: '1rem' }}>
          <h3
            style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#ffffff',
            }}
          >
            Real-time Infrastructure Control
          </h3>

          <p style={{ color: '#475569', fontSize: '0.82rem', lineHeight: '1.5' }}>
            Monitor floor occupancy, manage dynamic pricing, and automate gate access from a
            single source of truth.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;