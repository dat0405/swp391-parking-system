import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

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

const getSavedUser = () => {
  const savedUser = localStorage.getItem('user');

  if (!savedUser) {
    return null;
  }

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

const PrivateRoute = ({ children }) => {
  const user = getSavedUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const AuthRoute = ({ children }) => {
  const user = getSavedUser();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const ComingSoonPage = ({ title }) => (
  <div
    style={{
      minHeight: '100vh',
      backgroundColor: '#020617',
      color: '#f8fafc',
      padding: '2rem'
    }}
  >
    <h1 style={{ margin: 0, fontSize: '2rem' }}>{title}</h1>
    <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
      This module is ready for implementation.
    </p>
  </div>
);

function App() {
  useEffect(() => {
    clearOldTokenStorage();

    const sendHeartbeat = async () => {
      const user = getSavedUser();

      if (!user) {
        return;
      }

      try {
        await userApi.heartbeat();
      } catch (error) {
        const status = error.response?.status;

        if (status === 401) {
          localStorage.removeItem('user');
          sessionStorage.clear();
          return;
        }

        console.error('Heartbeat failed:', error);
      }
    };

    sendHeartbeat();

    const intervalId = setInterval(() => {
      sendHeartbeat();
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/login"
        element={
          <AuthRoute>
            <LoginPage />
          </AuthRoute>
        }
      />

      <Route
        path="/register"
        element={
          <AuthRoute>
            <RegisterPage />
          </AuthRoute>
        }
      />

      <Route
        path="/forgot-password"
        element={
          <AuthRoute>
            <ForgotPasswordPage />
          </AuthRoute>
        }
      />

      <Route
        path="/reset-password"
        element={
          <AuthRoute>
            <ResetPasswordPage />
          </AuthRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/parking-floors"
        element={
          <PrivateRoute>
            <ParkingManagement />
          </PrivateRoute>
        }
      />

      <Route
        path="/check-in-out"
        element={
          <PrivateRoute>
            <CheckInOutPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/user-ui"
        element={
          <PrivateRoute>
            <Booking />
          </PrivateRoute>
        }
      />

      <Route
        path="/reservations"
        element={
          <PrivateRoute>
            <ReservationAdmin />
          </PrivateRoute>
        }
      />

      <Route
        path="/user-management"
        element={
          <PrivateRoute>
            <UserManagementPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/pricing-policies"
        element={
          <PrivateRoute>
            <PricingPoliciesPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <Reports />
          </PrivateRoute>
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;