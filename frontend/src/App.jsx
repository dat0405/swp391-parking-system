import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import './App.css';

import DashboardIntro from './landing-page/DashboardIntro';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import ResetPasswordPage from './ResetPasswordPage';
import GoogleCallbackPage from './GoogleCallbackPage';

import DashboardPage from './DashboardPage';
import ParkingManagement from './parking-floors/ParkingManagement';
import CheckInOutPage from './check-in-out/CheckInOutPage';
import PricingPoliciesPage from './pricing-policies/PricingPoliciesPage';
import UserManagementPage from './UserManagementPage/UserManagementPage';
import Reports from './reports/Reports';
import ReservationAdmin from './reservation-admin/ReservationAdmin';
import Booking from './user-ui/Booking';
import BookingHistoryPage from './booking-history/BookingHistoryPage';
import bookingBg from './Pictures/booking.png';

import { userApi } from './api/userApi';
import { ROUTE_PERMISSIONS } from './utils/auth';

const LOGOUT_FLAG_KEY = 'isLoggingOut';
const LOGOUT_STARTED_AT_KEY = 'logoutStartedAt';
const LOGOUT_GUARD_MS = 15000;

const clearLocalSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  localStorage.removeItem('user_role');
  localStorage.removeItem('headerUserSyncedAt');
  localStorage.removeItem(LOGOUT_FLAG_KEY);
  localStorage.removeItem(LOGOUT_STARTED_AT_KEY);
};

const normalizeRole = (role) => {
  if (!role) return null;

  return String(role)
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, '');
};

const getSavedUser = () => {
  const savedUser = localStorage.getItem('user');

  if (!savedUser) return null;

  try {
    return JSON.parse(savedUser);
  } catch (error) {
    console.error(
      "Cannot parse localStorage key 'user':",
      error
    );

    localStorage.removeItem('user');
    localStorage.removeItem('user_role');
    return null;
  }
};

const extractRole = (user) => {
  if (!user) return null;

  if (user.role && typeof user.role === 'object') {
    return normalizeRole(
      user.role.roleName ||
        user.role.name ||
        user.role.authority ||
        ''
    );
  }

  if (user.role && typeof user.role === 'string') {
    return normalizeRole(user.role);
  }

  if (user.roleName) {
    return normalizeRole(user.roleName);
  }

  if (user.authority) {
    return normalizeRole(user.authority);
  }

  return normalizeRole(
    localStorage.getItem('user_role')
  );
};

const isLogoutGuardActive = () => {
  const isLoggingOut =
    localStorage.getItem(LOGOUT_FLAG_KEY) === 'true';

  const logoutStartedAt = Number(
    localStorage.getItem(LOGOUT_STARTED_AT_KEY) || 0
  );

  if (!isLoggingOut) return false;

  const isStillFresh =
    logoutStartedAt > 0 &&
    Date.now() - logoutStartedAt < LOGOUT_GUARD_MS;

  if (isStillFresh) {
    return true;
  }

  localStorage.removeItem(LOGOUT_FLAG_KEY);
  localStorage.removeItem(LOGOUT_STARTED_AT_KEY);
  return false;
};

const clearLogoutGuard = () => {
  localStorage.removeItem(LOGOUT_FLAG_KEY);
  localStorage.removeItem(LOGOUT_STARTED_AT_KEY);
};

const getDefaultPathByRole = (role) => {
  const cleanRole = normalizeRole(role);

  if (
    cleanRole === 'DRIVER' ||
    cleanRole === 'USER'
  ) {
    return '/user-ui';
  }

  return '/dashboard';
};

const AuthLayout = () => {
  const user = getSavedUser();
  const userRole = extractRole(user);

  if (
    user &&
    userRole &&
    !isLogoutGuardActive()
  ) {
    clearLogoutGuard();

    return (
      <Navigate
        to={getDefaultPathByRole(userRole)}
        replace
      />
    );
  }

  return <Outlet />;
};

const PrivateLayout = () => {
  const user = getSavedUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div
      className="app-global-private-container"
      style={{
        backgroundImage: `url(${bookingBg})`
      }}
    >
      <div className="app-global-backdrop-mask">
        <Outlet />
      </div>
    </div>
  );
};

const RoleProtectedRoute = ({
  allowedRoles
}) => {
  const user = getSavedUser();
  const userRole = extractRole(user);

  if (!user || !userRole) {
    return <Navigate to="/login" replace />;
  }

  const cleanAllowedRoles = (
    allowedRoles || []
  )
    .map((role) => normalizeRole(role))
    .filter(Boolean);

  const hasPermission =
    cleanAllowedRoles.includes(userRole);

  if (!hasPermission) {
    return (
      <Navigate
        to={getDefaultPathByRole(userRole)}
        replace
      />
    );
  }

  return <Outlet />;
};

function App() {
  useEffect(() => {
    let isMounted = true;

    const sendHeartbeat = async () => {
      const user = getSavedUser();

      if (!user || isLogoutGuardActive()) {
        return;
      }

      try {
        await userApi.heartbeat();
      } catch (error) {
        if (!isMounted) return;

        if (error.response?.status === 401) {
          clearLocalSession();
          sessionStorage.clear();
          window.location.replace('/login');
          return;
        }

        console.error('Heartbeat API error:', error);
      }
    };

    sendHeartbeat();

    const intervalId = setInterval(
      sendHeartbeat,
      30000
    );

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <Routes>
      <Route
        path="/"
        element={<DashboardIntro />}
      />

      <Route
        path="/auth/google/callback"
        element={<GoogleCallbackPage />}
      />

      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/register"
          element={<RegisterPage />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />

        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />
      </Route>

      <Route element={<PrivateLayout />}>
        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={
                ROUTE_PERMISSIONS.booking
              }
            />
          }
        >
          <Route
            path="/user-ui"
            element={<Booking />}
          />

          <Route
            path="/booking"
            element={<Booking />}
          />
        </Route>

        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={
                ROUTE_PERMISSIONS.bookingHistory
              }
            />
          }
        >
          <Route
            path="/booking-history"
            element={<BookingHistoryPage />}
          />
        </Route>

        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={
                ROUTE_PERMISSIONS.pricingPolicies
              }
            />
          }
        >
          <Route
            path="/pricing-policies"
            element={<PricingPoliciesPage />}
          />
        </Route>

        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={
                ROUTE_PERMISSIONS.parkingFloors
              }
            />
          }
        >
          <Route
            path="/parking-floors"
            element={<ParkingManagement />}
          />
        </Route>

        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={
                ROUTE_PERMISSIONS.operationalPages
              }
            />
          }
        >
          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />

          <Route
            path="/check-in-out"
            element={<CheckInOutPage />}
          />

          <Route
            path="/reservations"
            element={<ReservationAdmin />}
          />
        </Route>

        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={
                ROUTE_PERMISSIONS.reports
              }
            />
          }
        >
          <Route
            path="/reports"
            element={<Reports />}
          />
        </Route>

        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={
                ROUTE_PERMISSIONS.userManagement
              }
            />
          }
        >
          <Route
            path="/user-management"
            element={<UserManagementPage />}
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default App;
