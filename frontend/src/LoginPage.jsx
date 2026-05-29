import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [isLoading, setIsLoading] = useState(false); // Quản lý trạng thái đợi API
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const showToast = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 4000);
  };

const handleLogin = async (e) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    // 🌐 API CONNECTION PLACEHOLDER (GIỮ NGUYÊN ĐỂ SAU NÀY DÙNG)
    /*
    const response = await axios.post('https://api.yourdomain.com/auth/login', {
      email: formData.email,
      password: formData.password
    });
    if (response.data.success) { ... }
    */

    // --- ĐOẠN GIẢ LẬP ĐÃ SỬA: NHẬP BẤT KỲ CÁI GÌ CŨNG ĐĂNG NHẬP ĐƯỢC ---
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(); // Chấp nhận tất cả mọi tài khoản nhập vào, không check đúng sai nữa
      }, 1200);
    });

    showToast("Login successful! Redirecting...", "success");
    setTimeout(() => navigate('/dashboard'), 1500);
    // -----------------------------------------------------------------

  } catch (err) {
    showToast(err.message || "Login failed. Internal server error.", "error");
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="auth-container" style={{ position: 'relative' }}>
      {/* TOAST NOTIFICATION */}
      {notification.show && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: notification.type === 'success' ? '#1e293b' : '#451a1a',
          color: notification.type === 'success' ? '#4ade80' : '#f87171',
          border: notification.type === 'success' ? '1px solid #22c55e' : '1px solid #ef4444',
          padding: '1rem 2rem', borderRadius: '0.5rem', zIndex: 9999, fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: notification.type === 'success' ? '#22c55e' : '#ef4444' }} />
          {notification.message}
        </div>
      )}

      {/* LEFT COLUMN: LOGIN FORM */}
      <div className="login-column">
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ backgroundColor: '#3b82f6', padding: '0.4rem', borderRadius: '0.375rem', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: '800', fontSize: '0.9rem', color: '#fff' }}>P</span>
          </div>
          <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#f8fafc' }}>ParkSystem Pro</span>
        </div>

        {/* Main Login Card Area */}
        <div style={{ margin: 'auto 0', maxWidth: '400px', width: '100%' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', color: '#ffffff' }}>
            Welcome back.
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '2.5rem', lineHeight: '1.4' }}>
            Enter your credentials provided by the Administrator to access the station.
          </p>

          <form onSubmit={handleLogin}>
            {/* Email Input */}
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
                  disabled={isLoading}
                  required 
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label className="input-label">PASSWORD</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon-left" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password"
                  className="form-input" 
                  placeholder="••••••••" 
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required 
                />
                <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)} disabled={isLoading}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                <input type="checkbox" style={{ accentColor: '#3b82f6' }} disabled={isLoading} /> Remember me
              </label>
              <span 
                onClick={() => !isLoading && navigate('/forgot-password')} 
                style={{ color: '#3b82f6', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: '500', textDecoration: 'none' }}
              >
                Forgot password?
              </span>
            </div>

            {/* 🎯 SUBMIT BUTTON: ĐỒNG BỘ TRẠNG THÁI LOADING THEO REGISTER */}
            <button 
              type="submit" 
              disabled={isLoading}
              style={{
                width: '100%', padding: '0.85rem',
                backgroundColor: isLoading ? '#1e3a8a' : '#3b82f6',
                color: isLoading ? '#93c5fd' : '#ffffff',
                border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.9rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s', marginBottom: '1.5rem'
              }}
              onMouseOver={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#2563eb')}
              onMouseOut={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#3b82f6')}
            >
              {isLoading ? "Verifying Station Access..." : "Sign In"} 
              {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>

          {/* CHUYỂN SANG TRANG ĐĂNG KÝ */}
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
            Don't have an account?{' '}
            <span 
              onClick={() => !isLoading && navigate('/register')} 
              style={{ color: '#3b82f6', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: '600', textDecoration: 'underline' }}
            >
              Sign Up
            </span>
          </div>
        </div>

        {/* Security Footer Note */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', maxWidth: '360px', marginTop: '1.5rem' }}>
          <ShieldCheck size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
          <p style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: '1.4', margin: 0 }}>
            Protected System. Unauthorized access attempts to the internal database will be logged.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: PRODUCT SHOWCASE */}
      <div className="showcase-column anh-dong">
        <div className="dashboard-perspective-wrapper">
          <img
            src={new URL('./Pictures/carparking.png', import.meta.url).href}
            alt="Dashboard Preview"
            style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '0.75rem', boxShadow: '-20px 30px 60px rgba(0, 0, 0, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
          />
        </div>
        <div style={{ textAlign: 'center', maxWidth: '440px', marginTop: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#ffffff' }}>
            Real-time Infrastructure Control
          </h3>
          <p style={{ color: '#475569', fontSize: '0.82rem', lineHeight: '1.5' }}>
            Monitor floor occupancy, manage dynamic pricing, and automate gate access from a single source of truth.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;