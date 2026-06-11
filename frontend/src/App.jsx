import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

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
import Booking from './user-ui/Booking';

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

       <Route path="/user-ui" element={<Booking />} />
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