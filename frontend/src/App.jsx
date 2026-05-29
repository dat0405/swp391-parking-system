import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import các component authentication
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import ForgotPasswordPage from './ForgotPasswordPage';

// Import các module quản trị hệ thống
import DashboardPage from "./DashboardPage";
import CheckInOutPage from './check-in-out/CheckInOutPage';
import PricingPoliciesPage from './pricing-policies/PricingPoliciesPage';

// Bộ lọc chặn truy cập trái phép (Nếu không có token -> Đá về trang Login)
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

// Bộ lọc chặn quay lại trang Login khi đã đăng nhập (Có token -> Đẩy thẳng vào Dashboard)
const AuthRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return !token ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <Routes>
      {/* Điều hướng trang chủ mặc định về login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* 🔐 ROUTE AUTHENTICATION */}
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
      <Route path="/forgot-password" element={<AuthRoute><ForgotPasswordPage /></AuthRoute>} />
      
      {/* 🛡️ ROUTE NỘI BỘ (Chỉ hiển thị khi đã đăng nhập thành công) */}
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/check-in-out" element={<PrivateRoute><CheckInOutPage /></PrivateRoute>} />
      <Route path="/pricing-policies" element={<PrivateRoute><PricingPoliciesPage /></PrivateRoute>} />

      {/* Tự động bắt các URL gõ bậy bạ gộp về trang chủ */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;