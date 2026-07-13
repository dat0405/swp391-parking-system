// Role definitions phải khớp chính xác với role trong backend và database.
export const ROLES = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  PARKING_MANAGER: 'PARKING_MANAGER',
  PARKING_STAFF: 'PARKING_STAFF',
  DRIVER: 'DRIVER',
  USER: 'USER'
};

/**
 * Chuẩn hóa role để tránh lỗi khác biệt định dạng.
 *
 * Ví dụ:
 * ROLE_DRIVER -> DRIVER
 * driver -> DRIVER
 * " DRIVER " -> DRIVER
 */
const normalizeRole = (role) => {
  if (!role) {
    return '';
  }

  return String(role)
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, '');
};

/**
 * Lấy giá trị role từ nhiều cấu trúc user khác nhau.
 *
 * Hỗ trợ:
 * user.role = "DRIVER"
 * user.roleName = "DRIVER"
 * user.role.roleName = "DRIVER"
 * user.role.name = "DRIVER"
 * user.role.authority = "ROLE_DRIVER"
 */
const getUserRoleValue = (user) => {
  if (!user) {
    return '';
  }

  if (typeof user.role === 'string') {
    return user.role;
  }

  if (typeof user.roleName === 'string') {
    return user.roleName;
  }

  if (
    user.role &&
    typeof user.role === 'object'
  ) {
    if (typeof user.role.roleName === 'string') {
      return user.role.roleName;
    }

    if (typeof user.role.name === 'string') {
      return user.role.name;
    }

    if (typeof user.role.authority === 'string') {
      return user.role.authority;
    }
  }

  if (typeof user.authority === 'string') {
    return user.authority;
  }

  return '';
};

/**
 * Quyền truy cập route.
 *
 * Được sử dụng chung trong:
 * - App.jsx
 * - Sidebar.jsx
 * - Các component cần kiểm tra role
 */
export const ROUTE_PERMISSIONS = {
  /**
   * DRIVER và USER được tạo booking mới.
   */
  booking: [
    ROLES.DRIVER,
    ROLES.USER
  ],

  /**
   * DRIVER và USER được xem lịch sử booking của chính mình.
   */
  bookingHistory: [
    ROLES.DRIVER,
    ROLES.USER
  ],

  /**
   * DRIVER và USER chỉ được xem tình trạng bãi xe.
   *
   * PARKING_STAFF, PARKING_MANAGER và SYSTEM_ADMIN
   * được truy cập để thực hiện các chức năng quản lý
   * tùy theo quyền được kiểm tra trong từng trang.
   */
  parkingFloors: [
    ROLES.DRIVER,
    ROLES.USER,
    ROLES.PARKING_STAFF,
    ROLES.PARKING_MANAGER,
    ROLES.SYSTEM_ADMIN
  ],

  /**
   * Tất cả role đã đăng nhập đều được xem bảng giá.
   *
   * Chức năng thêm, sửa, xóa chính sách giá vẫn cần
   * được backend kiểm tra quyền riêng.
   */
  pricingPolicies: [
    ROLES.DRIVER,
    ROLES.USER,
    ROLES.PARKING_STAFF,
    ROLES.PARKING_MANAGER,
    ROLES.SYSTEM_ADMIN
  ],

  /**
   * Các trang vận hành:
   * - Dashboard
   * - Check-in/out
   * - Reservations
   *
   * Chỉ dành cho Staff, Manager và System Admin.
   */
  operationalPages: [
    ROLES.PARKING_STAFF,
    ROLES.PARKING_MANAGER,
    ROLES.SYSTEM_ADMIN
  ],

  /**
   * Reports chỉ dành cho Manager và System Admin.
   */
  reports: [
    ROLES.PARKING_MANAGER,
    ROLES.SYSTEM_ADMIN
  ],

  /**
   * User Management chỉ dành cho System Admin.
   */
  userManagement: [
    ROLES.SYSTEM_ADMIN
  ]
};

/**
 * Lấy user snapshot từ localStorage.
 *
 * Lưu ý:
 * User trong localStorage chỉ dùng cho giao diện.
 * Backend vẫn là nơi xác thực phiên đăng nhập thật
 * thông qua HttpOnly cookie.
 */
export const getSavedUser = () => {
  const savedUser = localStorage.getItem('user');

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch (error) {
    console.error(
      'Cannot parse saved user from localStorage:',
      error
    );

    localStorage.removeItem('user');
    localStorage.removeItem('user_role');

    return null;
  }
};

/**
 * Lấy role hiện tại của user.
 *
 * Ưu tiên:
 * 1. Role trong object user.
 * 2. user_role trong localStorage.
 */
export const getSavedUserRole = () => {
  const user = getSavedUser();

  const roleFromUser = normalizeRole(
    getUserRoleValue(user)
  );

  if (roleFromUser) {
    return roleFromUser;
  }

  return normalizeRole(
    localStorage.getItem('user_role')
  );
};

/**
 * Kiểm tra user hiện tại có thuộc danh sách role được phép hay không.
 *
 * @param {string[]} allowedRoles
 * @returns {boolean}
 */
export const hasRole = (allowedRoles = []) => {
  const currentRole = getSavedUserRole();

  if (!currentRole) {
    return false;
  }

  if (!Array.isArray(allowedRoles)) {
    return false;
  }

  const normalizedAllowedRoles = allowedRoles
    .map((role) => normalizeRole(role))
    .filter(Boolean);

  return normalizedAllowedRoles.includes(
    currentRole
  );
};

/**
 * Alias để code dễ đọc hơn khi kiểm tra nhiều role.
 */
export const hasAnyRole = hasRole;

/**
 * Cookie-only authentication.
 *
 * Access token và refresh token được lưu trong
 * HttpOnly cookie nên JavaScript không thể đọc trực tiếp.
 *
 * Hàm này chỉ kiểm tra frontend còn user snapshot hay không.
 * Backend mới là nơi xác thực phiên đăng nhập thật.
 */
export const isAuthenticated = () => {
  return Boolean(getSavedUser());
};

/**
 * Chỉ giữ lại để tương thích với code cũ.
 *
 * Không nên dùng token trong localStorage để gửi
 * Authorization header nữa.
 */
export const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * Xóa toàn bộ dữ liệu xác thực lưu tại frontend.
 *
 * HttpOnly cookie sẽ được backend xóa thông qua API logout.
 */
export const clearLocalAuthData = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('user_role');

  /*
   * Xóa token cũ từ những phiên bản trước
   * từng lưu token trong localStorage.
   */
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('authToken');

  localStorage.removeItem('headerUserSyncedAt');
};

/**
 * Bật cờ logout để ngăn các API nền như heartbeat
 * chạy lại trong lúc quá trình logout đang diễn ra.
 */
export const setLogoutGuard = () => {
  localStorage.setItem(
    'isLoggingOut',
    'true'
  );

  localStorage.setItem(
    'logoutStartedAt',
    String(Date.now())
  );
};

/**
 * Xóa cờ logout.
 */
export const clearLogoutGuard = () => {
  localStorage.removeItem('isLoggingOut');
  localStorage.removeItem('logoutStartedAt');
};

/**
 * Kiểm tra logout guard còn hiệu lực hay không.
 *
 * Guard tự hết hạn sau 15 giây để tránh bị kẹt
 * nếu quá trình logout bị gián đoạn.
 */
export const isLogoutGuardActive = () => {
  const isLoggingOut =
    localStorage.getItem('isLoggingOut') === 'true';

  const startedAt = Number(
    localStorage.getItem('logoutStartedAt') || 0
  );

  if (!isLoggingOut || !startedAt) {
    return false;
  }

  const elapsedMs = Date.now() - startedAt;

  if (elapsedMs > 15000) {
    clearLogoutGuard();
    return false;
  }

  return true;
};

/**
 * Logout phía frontend.
 *
 * Hàm này:
 * - Bật logout guard.
 * - Xóa user snapshot.
 * - Xóa sessionStorage.
 * - Chuyển về trang login.
 *
 * Cookie HttpOnly vẫn nên được backend xóa
 * thông qua API /auth/logout trước khi gọi hàm này.
 */
export const logoutWithGuard = () => {
  setLogoutGuard();

  clearLocalAuthData();

  sessionStorage.clear();

  window.location.replace('/login');
};

export default {
  ROLES,
  ROUTE_PERMISSIONS,
  getSavedUser,
  getSavedUserRole,
  hasRole,
  hasAnyRole,
  isAuthenticated,
  getToken,
  clearLocalAuthData,
  setLogoutGuard,
  clearLogoutGuard,
  isLogoutGuardActive,
  logoutWithGuard
};