import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div className="auth-container">
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
                <input type="text" className="form-input" placeholder="e.g. staff@company.vn" required />
              </div>
            </div>

            {/* Password Input */}
            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label className="input-label">PASSWORD</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon-left" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-input" 
                  placeholder="••••••••" 
                  required 
                />
                <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: '#3b82f6' }} /> Remember me
              </label>
              <span 
                onClick={() => navigate('/forgot-password')} 
                style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: '500', textDecoration: 'none' }}
              >
                Forgot password?
              </span>
            </div>

            {/* 🎯 SUBMIT BUTTON: ĐÃ ĐỒNG BỘ THEO ẢNH 2 */}
            <button 
              type="submit" 
              style={{
                width: '100%',
                padding: '0.85rem',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                marginBottom: '1.5rem'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
            >
              Sign In <ArrowRight size={16} />
            </button>
          </form>

          {/* CHUYỂN SANG TRANG ĐĂNG KÝ */}
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
            Don't have an account?{' '}
            <span 
              onClick={() => navigate('/register')} 
              style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' }}
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