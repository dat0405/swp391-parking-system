import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';

// Import các component authentication độc lập vừa được tách file
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import ForgotPasswordPage from './ForgotPasswordPage';

// Import các module quản trị hệ thống khác
import DashboardPage from "./DashboardPage";
import CheckInOutPage from './check-in-out/CheckInOutPage';
import PricingPoliciesPage from './pricing-policies/PricingPoliciesPage';

function App() {
  return (
    <Routes>
      {/* Các Route phục vụ cho cấu trúc Authentication */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      
      {/* Các Route nội bộ sau khi đăng nhập thành công */}
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/check-in-out" element={<CheckInOutPage />} />
      <Route path="/pricing-policies" element={<PricingPoliciesPage />} />
    </Routes>
  );
}

export default App;