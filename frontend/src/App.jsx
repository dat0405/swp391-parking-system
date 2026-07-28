import React, { useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';
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

import {
  ROUTE_PERMISSIONS,
  getDefaultPathByRole,
  isSupportedRole,
  normalizeRole,
} from './utils/auth';

const LOGOUT_FLAG_KEY = 'isLoggingOut';
const LOGOUT_STARTED_AT_KEY = 'logoutStartedAt';
const LOGOUT_GUARD_MS = 15000;

/**
 * Xóa dữ liệu xác thực đang lưu tại frontend.
 *
 * Token chính được lưu trong HttpOnly Cookie.
 * Các key token bên dưới được giữ để dọn dữ liệu
 * còn sót lại từ phiên bản frontend cũ.
 */
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

/**
 * Lấy thông tin user từ localStorage.
 */
const getSavedUser = () => {
  const savedUser =
    localStorage.getItem('user');

  if (!savedUser) {
    return null;
  }

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

/**
 * Lấy và chuẩn hóa role từ user.
 *
 * Hệ thống chỉ có bốn role:
 * - SYSTEM_ADMIN
 * - PARKING_MANAGER
 * - PARKING_STAFF
 * - DRIVER
 *
 * DRIVER chính là người dùng thông thường.
 */
const extractRole = (user) => {
  if (!user) {
    return null;
  }

  let rawRole = '';

  if (
    user.role &&
    typeof user.role === 'object'
  ) {
    rawRole =
      user.role.roleName ||
      user.role.name ||
      user.role.authority ||
      '';
  } else if (
    typeof user.role === 'string'
  ) {
    rawRole = user.role;
  } else if (
    typeof user.roleName === 'string'
  ) {
    rawRole = user.roleName;
  } else if (
    typeof user.authority === 'string'
  ) {
    rawRole = user.authority;
  } else {
    rawRole =
      localStorage.getItem('user_role');
  }

  const cleanRole =
    normalizeRole(rawRole);

  return isSupportedRole(cleanRole)
    ? cleanRole
    : null;
};

/**
 * Kiểm tra cờ logout có còn hiệu lực hay không.
 *
 * Cờ này giúp tránh việc interceptor refresh token
 * trong lúc người dùng đang đăng xuất.
 */
const isLogoutGuardActive = () => {
  const isLoggingOut =
    localStorage.getItem(
      LOGOUT_FLAG_KEY
    ) === 'true';

  const logoutStartedAt = Number(
    localStorage.getItem(
      LOGOUT_STARTED_AT_KEY
    ) || 0
  );

  if (!isLoggingOut) {
    return false;
  }

  const isStillFresh =
    logoutStartedAt > 0 &&
    Date.now() - logoutStartedAt <
      LOGOUT_GUARD_MS;

  if (isStillFresh) {
    return true;
  }

  localStorage.removeItem(
    LOGOUT_FLAG_KEY
  );

  localStorage.removeItem(
    LOGOUT_STARTED_AT_KEY
  );

  return false;
};

/**
 * Xóa cờ logout.
 */
const clearLogoutGuard = () => {
  localStorage.removeItem(
    LOGOUT_FLAG_KEY
  );

  localStorage.removeItem(
    LOGOUT_STARTED_AT_KEY
  );
};

/**
 * Layout dành cho các trang đăng nhập,
 * đăng ký và quên mật khẩu.
 *
 * Nếu người dùng đã đăng nhập thì chuyển đến
 * trang mặc định của role.
 */
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

/**
 * Layout dành cho các trang cần đăng nhập.
 */
const PrivateLayout = () => {
  const user = getSavedUser();
  const userRole = extractRole(user);

  if (!user || !userRole) {
    clearLocalSession();

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return (
    <div
      className="app-global-private-container"
      style={{
        backgroundImage: `url(${bookingBg})`,
      }}
    >
      <div className="app-global-backdrop-mask">
        <Outlet />
      </div>
    </div>
  );
};

/**
 * Bảo vệ route theo role.
 *
 * Khi role không có quyền truy cập,
 * người dùng được chuyển về trang mặc định.
 *
 * Ví dụ:
 * PARKING_MANAGER truy cập /check-in-out
 * sẽ được chuyển về /dashboard.
 */
const RoleProtectedRoute = ({
  allowedRoles,
}) => {
  const user = getSavedUser();
  const userRole = extractRole(user);

  if (!user || !userRole) {
    clearLocalSession();

    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const cleanAllowedRoles = (
    allowedRoles || []
  )
    .map(normalizeRole)
    .filter(isSupportedRole);

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
  /**
   * Gửi heartbeat mỗi 30 giây để cập nhật
   * trạng thái online của user.
   */
  useEffect(() => {
    let isMounted = true;

    const sendHeartbeat = async () => {
      const user = getSavedUser();
      const userRole = extractRole(user);

      if (
        !user ||
        !userRole ||
        isLogoutGuardActive()
      ) {
        return;
      }

      try {
        await userApi.heartbeat();
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (
          error.response?.status === 401
        ) {
          clearLocalSession();
          sessionStorage.clear();

          window.location.replace(
            '/login'
          );

          return;
        }

        console.error(
          'Heartbeat API error:',
          error
        );
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
      {/* Landing page */}
      <Route
        path="/"
        element={<DashboardIntro />}
      />

      {/*
       * Google callback phải nằm ngoài AuthLayout.
       *
       * Điều này tránh dữ liệu user cũ trong localStorage
       * chuyển hướng trước khi OAuth hoàn tất.
       */}
      <Route
        path="/auth/google/callback"
        element={<GoogleCallbackPage />}
      />

      {/* Public authentication routes */}
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

      {/* Private routes */}
      <Route element={<PrivateLayout />}>
        {/* DRIVER: New Booking */}
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

        {/* DRIVER: Booking History */}
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
            element={
              <BookingHistoryPage />
            }
          />
        </Route>

        {/*
         * DRIVER:
         * - Xem Price List.
         *
         * PARKING_MANAGER và SYSTEM_ADMIN:
         * - Quản lý Pricing Policies.
         */}
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
            element={
              <PricingPoliciesPage />
            }
          />
        </Route>

        {/*
         * DRIVER:
         * - Chỉ xem Parking Floors.
         *
         * PARKING_MANAGER và SYSTEM_ADMIN:
         * - Quản lý Parking Floors.
         */}
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
            element={
              <ParkingManagement />
            }
          />
        </Route>

        {/*
         * PARKING_MANAGER và SYSTEM_ADMIN:
         * - Dashboard.
         */}
        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={
                ROUTE_PERMISSIONS.dashboard
              }
            />
          }
        >
          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />
        </Route>

        {/*
         * Chỉ PARKING_STAFF và SYSTEM_ADMIN:
         * - Check-in/out.
         *
         * PARKING_MANAGER không có quyền.
         */}
        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={
                ROUTE_PERMISSIONS.checkInOut
              }
            />
          }
        >
          <Route
            path="/check-in-out"
            element={<CheckInOutPage />}
          />
        </Route>

        {/*
         * PARKING_MANAGER và SYSTEM_ADMIN:
         * - Reservations.
         */}
        <Route
          element={
            <RoleProtectedRoute
              allowedRoles={
                ROUTE_PERMISSIONS.reservations
              }
            />
          }
        >
          <Route
            path="/reservations"
            element={<ReservationAdmin />}
          />
        </Route>

        {/*
         * PARKING_MANAGER và SYSTEM_ADMIN:
         * - Reports.
         */}
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

        {/*
         * Chỉ SYSTEM_ADMIN:
         * - User Management.
         */}
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
            element={
              <UserManagementPage />
            }
          />
        </Route>
      </Route>

      {/* Unknown route */}
      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;