import React, { useState } from 'react';
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

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true);

    const email = formData.email.trim().toLowerCase();

    try {
     const response = await fetch('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json' // Đưa về JSON vì Backend yêu cầu
  },
  body: JSON.stringify({ 
    email: formData.email, 
    password: formData.password 
  })
});

      const data = await response.json();

      if (response.ok) {
        const token = data.token || data.accessToken || data.jwt;
        const backendUser = data.user || data; 

        // 🌟 VÉT SẠCH TÊN: Tìm mọi ngóc ngách lấy ra Tên thực tế của Account
        const userName = backendUser.fullName || backendUser.name || backendUser.displayName || backendUser.username || formData.email;

        // 🌟 VÉT SẠCH ROLE: Ép đúng định dạng viết hoa của Spring Boot để so khớp phân quyền
        let userRole = "PARKING_STAFF"; 
        if (backendUser.role) {
          userRole = backendUser.role;
        } else if (backendUser.roles && backendUser.roles.length > 0) {
          userRole = backendUser.roles[0];
        }

        const userObj = { fullName: userName, role: userRole };

        if (token) {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(userObj));
          
          showToast("Login successful! Redirecting...", "success");
          setTimeout(() => {
            setIsLoading(false);
            navigate('/dashboard');
          }, 800);
        } else {
          showToast("Missing token key from server payload.", "error");
          setIsLoading(false);
        }
      } else {
        showToast(data.message || "Invalid credentials.", "error");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Lỗi API mạng:", err);
      showToast("Cannot connect to server.", "error");
      const response = await axiosClient.post('/auth/login', {
        email,
        password: formData.password
      });

      const data = response.data;

      const accessToken = data.accessToken || data.token || data.jwt;
      const refreshToken = data.refreshToken;

      const userObj = {
        userId: data.userId,
        fullName: data.fullName || data.name || data.email || email,
        email: data.email || email,
        role: data.role || 'PARKING_STAFF'
      };

      if (!accessToken) {
        showToast('Missing access token from server payload.', 'error');
        setIsLoading(false);
        return;
      }

      if (!refreshToken) {
        showToast('Missing refresh token from server payload.', 'error');
        setIsLoading(false);
        return;
      }

      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userObj));

      showToast('Login successful! Redirecting...', 'success');

      setTimeout(() => {
        setIsLoading(false);
        navigate(getRedirectPathByRole(userObj.role), { replace: true });
      }, 800);
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

  return (
    <div className="auth-container" style={{ position: 'relative' }}>
      {notification.show && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: notification.type === 'success' ? '#1e293b' : '#451a1a', color: notification.type === 'success' ? '#4ade80' : '#f87171', padding: '1rem 2rem', borderRadius: '0.5rem', zIndex: 9999, fontWeight: '600' }}>
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
          <div style={{ backgroundColor: '#3b82f6', padding: '0.4rem', borderRadius: '0.375rem', display: 'flex' }}><span style={{ fontWeight: '800', color: '#fff' }}>P</span></div>
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

          <span style={{ fontWeight: '600', color: '#f8fafc' }}>ParkSystem Pro</span>
        </div>

        <div style={{ margin: 'auto 0', maxWidth: '400px', width: '100%' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', color: '#ffffff' }}>Welcome back.</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '2.5rem' }}>Enter credentials to access the station.</p>
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
                <input type="text" name="email" className="form-input" placeholder="e.g. staff@company.vn" value={formData.email} onChange={handleInputChange} disabled={isLoading} required />

                <input
                  type="text"
                  name="email"
                  className="form-input"
                  placeholder="e.g. staff@company.vn"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label className="input-label">PASSWORD</label>

              <div className="input-wrapper">
                <Lock size={16} className="input-icon-left" />
                <input type={showPassword ? "text" : "password"} name="password" className="form-input" placeholder="••••••••" value={formData.password} onChange={handleInputChange} disabled={isLoading} required />
                <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', cursor: 'pointer' }}><input type="checkbox" style={{ accentColor: '#3b82f6' }} disabled={isLoading} /> Remember me</label>
              <span style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: '500' }} onClick={() => !isLoading && navigate('/forgot-password')}>Forgot password?</span>
            </div>

            <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '0.85rem', backgroundColor: isLoading ? '#1e3a8a' : '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '0.5rem', fontWeight: '600', cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {isLoading ? "Verifying Access..." : "Sign In"} {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>

          <div style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
            Don't have an account? <span style={{ color: '#3b82f6', fontWeight: '600', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => !isLoading && navigate('/register')}>Sign Up</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1.5rem' }}>
          <ShieldCheck size={16} style={{ color: '#22c55e' }} />
          <p style={{ fontSize: '0.72rem', color: '#64748b', margin: 0 }}>Protected System. Unauthorized access attempts will be logged.</p>

                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />

                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
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
                <input type="checkbox" style={{ accentColor: '#3b82f6' }} disabled={isLoading} />
                Remember me
              </label>

              <span
                style={{
                  color: '#3b82f6',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
                onClick={() => !isLoading && navigate('/forgot-password')}
              >
                Forgot password?
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.85rem',
                backgroundColor: isLoading ? '#1e3a8a' : '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1.5rem'
              }}
            >
              {isLoading ? 'Verifying Access...' : 'Sign In'}
              {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>

          <div
            style={{
              fontSize: '0.85rem',
              color: '#94a3b8',
              textAlign: 'center'
            }}
          >
            Don't have an account?{' '}
            <span
              style={{
                color: '#3b82f6',
                fontWeight: '600',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
              onClick={() => !isLoading && navigate('/register')}
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
          <img src={new URL('./Pictures/carparking.png', import.meta.url).href} alt="Dashboard Preview" style={{ width: '100%', borderRadius: '0.75rem', boxShadow: '-20px 30px 60px rgba(0, 0, 0, 0.7)' }} />
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