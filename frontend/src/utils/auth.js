// 1. Định nghĩa danh sách các Role chuẩn khớp 100% với cấu trúc Database và LoginPage mới
export const ROLES = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  PARKING_MANAGER: 'PARKING_MANAGER',
  PARKING_STAFF: 'PARKING_STAFF',
  DRIVER: 'DRIVER',
  USER: 'USER' // Đổi thành 'USER' vì App.jsx mới đã có bộ thắng tự động đồng bộ chéo với DRIVER rất an toàn
};

// 2. Định nghĩa mảng phân quyền cho từng cụm Route tương ứng trong file App.jsx
export const ROUTE_PERMISSIONS = {
  // Nhóm 1: Màn đặt chỗ / Booking (Tài xế, Người dùng thường và các cấp Quản lý/Admin vào kiểm tra)
  booking: [ROLES.DRIVER, ROLES.USER, ROLES.SYSTEM_ADMIN, ROLES.PARKING_MANAGER],

  // Nhóm 2: Màn cấu hình bảng giá / Pricing Policies (Tất cả mọi người đều có quyền xem hoặc sửa tùy UI bọc lót)
  pricingPolicies: [ROLES.SYSTEM_ADMIN, ROLES.PARKING_MANAGER, ROLES.PARKING_STAFF, ROLES.DRIVER, ROLES.USER],

  // Nhóm 3: Vận hành hệ thống (Dashboard, Quản lý tầng, Check In/Out, Đơn đặt chỗ của Admin)
  operationalPages: [ROLES.PARKING_STAFF, ROLES.PARKING_MANAGER, ROLES.SYSTEM_ADMIN],

  // Nhóm 4: Xem báo cáo số liệu, doanh thu doanh nghiệp (Chỉ Quản lý bãi và Admin tối cao)
  reports: [ROLES.PARKING_MANAGER, ROLES.SYSTEM_ADMIN],

  // Nhóm 5: Quản lý danh sách tài khoản, phê duyệt thành viên hệ thống (Độc quyền Admin tối cao)
  userManagement: [ROLES.SYSTEM_ADMIN]
};

// ================= CÁC HÀM TIỆN ÍCH AUTH (DÙNG CHO SIDEBAR VÀ CÁC PAGE KHÁC) =================

/**
 * Lấy thông tin Object User chuẩn hóa đang lưu dưới máy
 */
export const getSavedUser = () => {
  const savedUser = localStorage.getItem('user');
  if (!savedUser) return null;
  try {
    return JSON.parse(savedUser);
  } catch (error) {
    localStorage.removeItem('user');
    localStorage.removeItem('user_role');
    return null;
  }
};

/**
 * Lấy chuỗi Access Token phục vụ gọi API
 */
export const getToken = () => localStorage.getItem('token');

/**
 * Kiểm tra nhanh xem User đã có phiên đăng nhập hợp lệ chưa
 */
export const isAuthenticated = () => !!getToken() && !!getSavedUser();

/**
 * Hàm Logout tối ưu: Kích hoạt cờ chặn Heartbeat của bạn mày + Xóa sạch session
 * Mày chỉ cần gọi hàm này ở nút "Đăng xuất" trên Sidebar là bao mượt!
 */
export const logoutWithGuard = () => {
  // Bật cờ Guard chặn heartbeat chạy ngầm gửi request bậy lên Server trong vòng 15 giây
  localStorage.setItem('isLoggingOut', 'true');
  localStorage.setItem('logoutStartedAt', String(Date.now()));
  
  // Tiến hành dọn dẹp sạch sẽ kho lưu trữ dưới máy
  localStorage.removeItem('user');
  localStorage.removeItem('user_role');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  sessionStorage.clear();
  
  // Sút thẳng người dùng về lại trang login công cộng
  window.location.href = '/login';
};