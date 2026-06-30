import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './App.css';

import DashboardIntro from './landing-page/DashboardIntro';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';

import DashboardPage from './DashboardPage';
import ParkingManagement from './parking-floors/ParkingManagement';
import CheckInOutPage from './check-in-out/CheckInOutPage';
import PricingPoliciesPage from './pricing-policies/PricingPoliciesPage';
import UserManagementPage from './UserManagementPage/UserManagementPage';
import Reports from './reports/Reports';
import ReservationAdmin from './reservation-admin/ReservationAdmin';
import Booking from './user-ui/Booking';

import { userApi } from './api/userApi';

const LOGOUT_FLAG_KEY = 'isLoggingOut';
const LOGOUT_STARTED_AT_KEY = 'logoutStartedAt';
const LOGOUT_GUARD_MS = 15000;

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

const isLogoutGuardActive = () => {
  const isLoggingOut = localStorage.getItem(LOGOUT_FLAG_KEY) === 'true';
  const logoutStartedAt = Number(localStorage.getItem(LOGOUT_STARTED_AT_KEY) || 0);

  if (!isLoggingOut) return false;

  const isStillFresh = logoutStartedAt > 0 && Date.now() - logoutStartedAt < LOGOUT_GUARD_MS;

  if (isStillFresh) {
    return true;
  }

  /*
   * Nếu cờ logout bị sót lại quá lâu thì tự xóa,
   * tránh việc user login lại nhưng heartbeat vẫn bị chặn.
   */
  localStorage.removeItem(LOGOUT_FLAG_KEY);
  localStorage.removeItem(LOGOUT_STARTED_AT_KEY);

  return false;
};

const clearLogoutGuard = () => {
  localStorage.removeItem(LOGOUT_FLAG_KEY);
  localStorage.removeItem(LOGOUT_STARTED_AT_KEY);
};

const getRedirectPathByRole = (role) => {
  if (role === 'SYSTEM_ADMIN') return '/dashboard';
  if (role === 'PARKING_MANAGER') return '/dashboard';
  if (role === 'PARKING_STAFF') return '/check-in-out';
  if (role === 'DRIVER') return '/user-ui';

  return '/dashboard';
};

const AuthLayout = () => {
  const user = getSavedUser();

  if (user) {
    clearLogoutGuard();
    return <Navigate to={getRedirectPathByRole(user.role)} replace />;
  }

  return <Outlet />;
};

const PrivateLayout = () => {
  const user = getSavedUser();

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  useEffect(() => {
    const sendHeartbeat = async () => {
      const user = getSavedUser();

      if (!user) return;

      if (isLogoutGuardActive()) {
        return;
      }

      try {
        await userApi.heartbeat();
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          clearLogoutGuard();
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
      <Route path="/" element={<DashboardIntro />} />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;