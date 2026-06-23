import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import DashboardIntro from './landing-page/DashboardIntro';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from "./ResetPasswordPage";
import ParkingManagement from './parking-floors/ParkingManagement';

import DashboardPage from "./DashboardPage";
import CheckInOutPage from './check-in-out/CheckInOutPage';
import PricingPoliciesPage from './pricing-policies/PricingPoliciesPage';
import UserManagementPage from './UserManagementPage/UserManagementPage';
import ReservationManagementPage from './reservation-admin/ReservationAdmin';
import Reports from './reports/Reports';
import ReservationAdmin from './reservation-admin/ReservationAdmin';
import Booking from './user-ui/Booking';

import { userApi } from './api/userApi';

const getSavedUser = () => {
  const savedUser = localStorage.getItem('user');
  if (!savedUser) return null;
  try {
    return JSON.parse(savedUser);
  } catch (error) {
    localStorage.removeItem('user');
    return null;
  }
};

const clearOldTokenStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
};

// ================= TỐI ƯU CẤU TRÚC ROUTE BẰNG OUTLET =================

// Cụm bảo vệ: Chỉ cho phép khi CHƯA đăng nhập
const AuthLayout = () => {
  const user = getSavedUser();
  if (user) {
    return user.role === 'ADMIN' || user.role === 'STAFF' 
      ? <Navigate to="/dashboard" replace /> 
      : <Navigate to="/user-ui" replace />;
  }
  return <Outlet />; // Render các trang con (Login, Register...)
};

// Cụm bảo vệ: Bắt buộc PHẢI đăng nhập
const PrivateLayout = () => {
  const user = getSavedUser();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  useEffect(() => {
    clearOldTokenStorage();

    const sendHeartbeat = async () => {
      const user = getSavedUser();
      if (!user) return;

      try {
        await userApi.heartbeat();
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem('user');
          sessionStorage.clear();
          window.location.href = '/login';
          return;
        }
        console.error('Heartbeat failed:', error);
      }
    };

    sendHeartbeat();
    const intervalId = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<DashboardIntro />} />

      {/* Nhóm các tuyến đường chỉ dành cho khách (Chưa đăng nhập) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Nhóm các tuyến đường bắt buộc phải đăng nhập (Private) */}
      <Route element={<PrivateLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/parking-floors" element={<ParkingManagement />} />
        <Route path="/check-in-out" element={<CheckInOutPage />} />
        <Route path="/user-ui" element={<Booking />} />
        <Route path="/reservations" element={<ReservationAdmin />} />
        <Route path="/user-management" element={<UserManagementPage />} />
        <Route path="/pricing-policies" element={<PricingPoliciesPage />} />
        <Route path="/reports" element={<Reports />} />
      </Route>

      {/* Sai URL -> Về trang chủ */}

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

const AuthRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return !token ? children : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
      <Route path="/forgot-password" element={<AuthRoute><ForgotPasswordPage /></AuthRoute>} />
      <Route path="/reset-password" element={<AuthRoute><ResetPasswordPage /></AuthRoute>} />

      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/check-in-out" element={<PrivateRoute><CheckInOutPage /></PrivateRoute>} />
      <Route path="/pricing-policies" element={<PrivateRoute><PricingPoliciesPage /></PrivateRoute>} />
      <Route path="/user-management" element={<PrivateRoute><UserManagementPage /></PrivateRoute>} />
       <Route path="/reservations" element={<PrivateRoute><ReservationManagementPage /></PrivateRoute>} />
       <Route path="/parking-floors" element={<PrivateRoute><ParkingManagement /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;