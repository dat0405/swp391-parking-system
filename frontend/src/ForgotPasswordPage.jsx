import React, { useState } from 'react';
import { Mail, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();

  const showToast = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 4000);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      showToast("Invalid email format!", "error");
      return;
    }

    try {
      console.log('API call placeholder for password reset email:', email);
      showToast("Reset link has been sent! Please check your business inbox.", "success");
    } catch (err) {
      showToast("Failed to process request. Server error.", "error");
    }
  };

  return (
    <div className="auth-container" style={{ position: 'relative' }}>
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

      {/* LEFT COLUMN: FORGOT FORM */}
      <div className="login-column">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ backgroundColor: '#3b82f6', padding: '0.4rem', borderRadius: '0.375rem', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontWeight: '800', fontSize: '0.9rem', color: '#fff' }}>P</span>
          </div>
          <span style={{ fontWeight: '600', fontSize: '0.95rem', color: '#f8fafc' }}>ParkSystem Pro</span>
        </div>

        <div style={{ margin: 'auto 0', maxWidth: '400px', width: '100%' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', color: '#ffffff' }}>Forgot Password?</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '2.5rem', lineHeight: '1.4' }}>
            Enter your registered business email and we'll send you a secure link to reset your station access.
          </p>

          <form onSubmit={handleForgotPassword}>
            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
              <label className="input-label">YOUR REGISTERED EMAIL</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon-left" />
                <input type="text" className="form-input" placeholder="staff@company.vn" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            {/* 🎯 SUBMIT BUTTON: ĐÃ ĐỒNG BỘ THEO ẢNH 2 */}
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
              Reset Password <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ fontSize: '0.85rem', textAlign: 'center' }}>
            <span onClick={() => navigate('/')} style={{ color: '#64748b', cursor: 'pointer', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'underline' }}>
              <ArrowLeft size={14} /> Back to Sign In
            </span>
          </div>
        </div>

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

export default ForgotPasswordPage;