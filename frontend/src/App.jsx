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
// Import ảnh nền bãi xe hệ thống
import bookingBg from './Pictures/booking.png';

import { userApi } from './api/userApi';
import { ROUTE_PERMISSIONS, ROLES } from './utils/auth'; 

// 🔥 GIỮ NGUYÊN HỆ THỐNG CỜ BẢO VỆ LOGOUT CỦA BẠN MÀY
const LOGOUT_FLAG_KEY = 'isLoggingOut';
const LOGOUT_STARTED_AT_KEY = 'logoutStartedAt';
const LOGOUT_GUARD_MS = 15000;

// Lấy thông tin user từ localStorage của mày
const getSavedUser = () => {
  const savedUser = localStorage.getItem('user');
  if (!savedUser) return null;
  try {
    return JSON.parse(savedUser);
  } catch (error) {
    console.error("🚨 [Chẩn đoán] Lỗi Parse JSON của key 'user' dưới localStorage:", error);
    localStorage.removeItem('user');
    localStorage.removeItem('user_role');
    return null;
  }
};

// Hàm bóc tách Quyền (Role) từ mọi cấu trúc Backend cực mạnh của mày
const extractRole = (user) => {
  if (!user) return null;
  if (user.role && typeof user.role === 'object') {
    return (user.role.roleName || user.role.name || user.role.authority || '').toUpperCase();
  }
  if (user.role && typeof user.role === 'string') return user.role.toUpperCase();
  if (user.roleName) return String(user.roleName).toUpperCase();
  if (user.authority) return String(user.authority).toUpperCase();
  
  return null;
};

// 🔥 HÀM KIỂM TRA TRẠNG THÁI LOGOUT GUARD CỦA BẠN MÀY
const isLogoutGuardActive = () => {
  const isLoggingOut = localStorage.getItem(LOGOUT_FLAG_KEY) === 'true';
  const logoutStartedAt = Number(localStorage.getItem(LOGOUT_STARTED_AT_KEY) || 0);

  if (!isLoggingOut) return false;

  const isStillFresh = logoutStartedAt > 0 && Date.now() - logoutStartedAt < LOGOUT_GUARD_MS;

  if (isStillFresh) {
    return true;
  }

  localStorage.removeItem(LOGOUT_FLAG_KEY);
  localStorage.removeItem(LOGOUT_STARTED_AT_KEY);
  return false;
};

// 🔥 HÀM XÓA CỜ GUARD CỦA BẠN MÀY
const clearLogoutGuard = () => {
  localStorage.removeItem(LOGOUT_FLAG_KEY);
  localStorage.removeItem(LOGOUT_STARTED_AT_KEY);
};

// ================= CỤM LAYOUT BẢO VỆ ROUTE CHẨN ĐOÁN =================

// 1. Cụm trang khách công cộng (Tích hợp thêm cơ chế tự xóa Logout Guard khi user quay lại đăng nhập mới)
const AuthLayout = () => {
  const user = getSavedUser();
  const token = localStorage.getItem('token'); 
  const userRole = extractRole(user);

  if (user && token && userRole) {
    console.log("ℹ️ [AuthLayout] Đã có Session hợp lệ, điều hướng vào phân khu riêng. Role:", userRole);
    clearLogoutGuard(); // 🔥 Đã đăng nhập lại thành công thì dọn dẹp cờ bảo vệ của phiên cũ luôn
    if (userRole === 'DRIVER' || userRole === 'USER') {
      return <Navigate to="/user-ui" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return <Outlet />; 
};

// 2. Kiểm tra đăng nhập bắt buộc và tự động phủ lớp nền bãi xe toàn hệ thống trang nội bộ
const PrivateLayout = () => {
  const user = getSavedUser();
  const token = localStorage.getItem('token');
  
  if (!user || !token) {
    console.error("🚨 [PrivateLayout Chặn] Thiếu dữ liệu đăng nhập, đẩy về /login:", { 
      'Có chuỗi user không?': !!user, 
      'Có token không?': !!token 
    });
    return <Navigate to="/login" replace />;
  }

  // 🔥 BỌC LAYOUT NỀN TOÀN CỤM CHỨC NĂNG NỘI BỘ TẠI ĐÂY
  return (
    <div 
      className="app-global-private-container"
      style={{ backgroundImage: `url(${bookingBg})` }}
    >
      <div className="app-global-backdrop-mask">
        <Outlet />
      </div>
    </div>
  );
};

// 3. Phân quyền chi tiết từng Route tối tân của mày (Giữ nguyên thuật toán bọc lót chống lỗi loop)
const RoleProtectedRoute = ({ allowedRoles }) => {
  const user = getSavedUser();
  const userRole = extractRole(user);
  
  if (!user || !userRole) {
    console.error("🚨 [RoleProtectedRoute Chặn] Không bóc tách được Role của User:", user);
    return <Navigate to="/login" replace />;
  }
  
  let cleanAllowedRoles = (allowedRoles || []).map(role => String(role).toUpperCase());
  
  if (cleanAllowedRoles.includes('DRIVER') || cleanAllowedRoles.includes('USER')) {
    if (!cleanAllowedRoles.includes('DRIVER')) cleanAllowedRoles.push('DRIVER');
    if (!cleanAllowedRoles.includes('USER')) cleanAllowedRoles.push('USER');
  }
  
  const hasPermission = cleanAllowedRoles.includes(userRole);
  
  if (!hasPermission) {
    console.warn(`⛔ [RoleProtectedRoute Từ chối] Quyền [${userRole}] không được phép vào đây. Danh sách hợp lệ:`, cleanAllowedRoles);
    
    if (userRole === 'DRIVER' || userRole === 'USER') {
      return <Navigate to="/user-ui" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  return <Outlet />;
};

function App() {
  useEffect(() => {
    let isMounted = true;

    const sendHeartbeat = async () => {
      const user = getSavedUser();
      const token = localStorage.getItem('token');
      if (!user || !token) return;

      // 🔥 CHÈN LOGIC CỦA BẠN MÀY VÀO ĐÂY: Nếu đang trong chu kỳ logout thì KHÔNG bắn heartbeat bậy lên server
      if (isLogoutGuardActive()) {
        return;
      }

      try {
        await userApi.heartbeat();
      } catch (error) {
        if (!isMounted) return;
        if (error.response?.status === 401) {
          console.error("🚨 [Heartbeat Lỗi 401] Token hết hạn trên Server! Tiến hành sút user.");
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user_role'); // Dọn dẹp đồng bộ biến của mày viết thêm
          clearLogoutGuard(); // 🔥 Dọn sạch cờ guard bảo vệ
          sessionStorage.clear();
          window.location.href = '/login';
          return;
        }
        console.error('Heartbeat API error:', error);
      }
    };

    sendHeartbeat();
    const intervalId = setInterval(sendHeartbeat, 30000);
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <Routes>
      {/* Trang giới thiệu công cộng */}
      <Route path="/" element={<DashboardIntro />} />

      {/* Cụm trang điều hướng Khách chưa đăng nhập */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Cụm nội bộ bắt buộc phải đăng nhập (Có chứa nền bãi xe chung) */}
      <Route element={<PrivateLayout />}>
        
        {/* Trang dành cho Driver / User thường */}
        <Route element={<RoleProtectedRoute allowedRoles={ROUTE_PERMISSIONS.booking} />}>
          <Route path="/user-ui" element={<Booking />} />
        </Route>

        {/* Cấu hình bảng giá */}
        <Route element={<RoleProtectedRoute allowedRoles={ROUTE_PERMISSIONS.pricingPolicies} />}>
          <Route path="/pricing-policies" element={<PricingPoliciesPage />} />
        </Route>

        {/* Các trang vận hành bãi xe (Dashboard, Sơ đồ tầng, Check In/Out) */}
        <Route element={<RoleProtectedRoute allowedRoles={ROUTE_PERMISSIONS.operationalPages} />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/parking-floors" element={<ParkingManagement />} />
          <Route path="/check-in-out" element={<CheckInOutPage />} />
          <Route path="/reservations" element={<ReservationAdmin />} />
        </Route>

        {/* Báo cáo thống kê */}
        <Route element={<RoleProtectedRoute allowedRoles={ROUTE_PERMISSIONS.reports} />}>
          <Route path="/reports" element={<Reports />} />
        </Route>

        {/* Quản lý người dùng hệ thống */}
        <Route element={<RoleProtectedRoute allowedRoles={ROUTE_PERMISSIONS.userManagement} />}>
          <Route path="/user-management" element={<UserManagementPage />} />
        </Route>

      </Route>

      {/* URL bậy bạ tự động đá về trang giới thiệu */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;