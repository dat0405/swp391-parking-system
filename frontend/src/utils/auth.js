// Role definitions must match backend/database role names.
// DRIVER is the normal end-user role.
// There is no separate USER role.
export const ROLES = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  PARKING_MANAGER: 'PARKING_MANAGER',
  PARKING_STAFF: 'PARKING_STAFF',
  DRIVER: 'DRIVER',
};

/**
 * Chuẩn hóa role từ backend, database hoặc localStorage.
 *
 * Ví dụ:
 * ROLE_PARKING_STAFF -> PARKING_STAFF
 * parking_staff      -> PARKING_STAFF
 */
export const normalizeRole = (role) => {
  if (!role) {
    return '';
  }

  return String(role)
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/, '');
};

/**
 * Kiểm tra role có thuộc bốn role chính thức hay không.
 */
export const isSupportedRole = (role) => {
  const cleanRole = normalizeRole(role);

  return Object.values(ROLES).includes(cleanRole);
};

/**
 * Lấy role từ nhiều cấu trúc user response khác nhau.
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
    typeof user.role.roleName === 'string'
  ) {
    return user.role.roleName;
  }

  if (
    user.role &&
    typeof user.role.name === 'string'
  ) {
    return user.role.name;
  }

  if (
    user.role &&
    typeof user.role.authority === 'string'
  ) {
    return user.role.authority;
  }

  if (typeof user.authority === 'string') {
    return user.authority;
  }

  return '';
};

/**
 * Phân quyền các trang frontend.
 */
export const ROUTE_PERMISSIONS = {
  // Người dùng thông thường.
  booking: [ROLES.DRIVER],

  bookingHistory: [ROLES.DRIVER],

  /*
   * DRIVER:
   * - Chỉ xem tình trạng chỗ đỗ.
   *
   * PARKING_MANAGER và SYSTEM_ADMIN:
   * - Có thể quản lý tầng và chỗ đỗ.
   */
  parkingFloors: [
    ROLES.DRIVER,
    ROLES.PARKING_MANAGER,
    ROLES.SYSTEM_ADMIN,
  ],

  /*
   * PARKING_STAFF không được vào Dashboard.
   */
  dashboard: [
    ROLES.PARKING_MANAGER,
    ROLES.SYSTEM_ADMIN,
  ],

  /*
   * Trang Check-in/out.
   */
  checkInOut: [
    ROLES.PARKING_STAFF,
    ROLES.PARKING_MANAGER,
    ROLES.SYSTEM_ADMIN,
  ],

  /*
   * Quản lý đặt chỗ.
   */
  reservations: [
    ROLES.PARKING_MANAGER,
    ROLES.SYSTEM_ADMIN,
  ],

  /*
   * DRIVER:
   * - Chỉ xem bảng giá.
   *
   * PARKING_MANAGER và SYSTEM_ADMIN:
   * - Có thể quản lý chính sách giá và ngày lễ.
   */
  pricingPolicies: [
    ROLES.DRIVER,
    ROLES.PARKING_MANAGER,
    ROLES.SYSTEM_ADMIN,
  ],

  reports: [
    ROLES.PARKING_MANAGER,
    ROLES.SYSTEM_ADMIN,
  ],

  userManagement: [
    ROLES.SYSTEM_ADMIN,
  ],
};

/**
 * Lấy user đã lưu trong localStorage.
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
 * Lấy role hiện tại.
 *
 * Ưu tiên:
 * 1. Role bên trong object user.
 * 2. Giá trị user_role trong localStorage.
 */
export const getSavedUserRole = () => {
  const user = getSavedUser();

  const roleFromUser = normalizeRole(
    getUserRoleValue(user)
  );

  if (isSupportedRole(roleFromUser)) {
    return roleFromUser;
  }

  const roleFromStorage = normalizeRole(
    localStorage.getItem('user_role')
  );

  return isSupportedRole(roleFromStorage)
    ? roleFromStorage
    : '';
};

/**
 * Xác định trang mặc định sau khi đăng nhập.
 */
export const getDefaultPathByRole = (role) => {
  const cleanRole = normalizeRole(role);

  if (
    cleanRole === ROLES.SYSTEM_ADMIN ||
    cleanRole === ROLES.PARKING_MANAGER
  ) {
    return '/dashboard';
  }

  if (cleanRole === ROLES.PARKING_STAFF) {
    return '/check-in-out';
  }

  if (cleanRole === ROLES.DRIVER) {
    return '/user-ui';
  }

  return '/login';
};

/**
 * Kiểm tra role hiện tại có nằm trong danh sách được phép.
 */
export const hasRole = (allowedRoles = []) => {
  const currentRole = getSavedUserRole();

  if (
    !currentRole ||
    !Array.isArray(allowedRoles)
  ) {
    return false;
  }

  return allowedRoles
    .map(normalizeRole)
    .filter(isSupportedRole)
    .includes(currentRole);
};

/**
 * Alias để tương thích với các file cũ.
 */
export const hasAnyRole = hasRole;

/**
 * Kiểm tra trạng thái đăng nhập ở frontend.
 *
 * Token thật được lưu trong HttpOnly Cookie.
 */
export const isAuthenticated = () => {
  return Boolean(
    getSavedUser() &&
    getSavedUserRole()
  );
};

/**
 * Giữ lại để tương thích với code cũ.
 *
 * Hệ thống hiện tại sử dụng HttpOnly Cookie,
 * nên thông thường hàm này sẽ trả về null.
 */
export const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * Xóa toàn bộ dữ liệu xác thực cũ khỏi trình duyệt.
 */
export const clearLocalAuthData = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('user_role');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('authToken');
  localStorage.removeItem('headerUserSyncedAt');
};

/**
 * Đặt cờ đang logout để tránh interceptor
 * tự gọi refresh token trong lúc đăng xuất.
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
 * Kiểm tra cờ logout có còn hiệu lực hay không.
 *
 * Cờ tự hết hạn sau 15 giây.
 */
export const isLogoutGuardActive = () => {
  const isLoggingOut =
    localStorage.getItem('isLoggingOut') ===
    'true';

  const startedAt = Number(
    localStorage.getItem('logoutStartedAt') ||
    0
  );

  if (!isLoggingOut || !startedAt) {
    return false;
  }

  const elapsedMs =
    Date.now() - startedAt;

  if (elapsedMs > 15000) {
    clearLogoutGuard();
    return false;
  }

  return true;
};

/**
 * Đăng xuất ở frontend và chuyển về trang login.
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
  normalizeRole,
  isSupportedRole,
  getSavedUser,
  getSavedUserRole,
  getDefaultPathByRole,
  hasRole,
  hasAnyRole,
  isAuthenticated,
  getToken,
  clearLocalAuthData,
  setLogoutGuard,
  clearLogoutGuard,
  isLogoutGuardActive,
  logoutWithGuard,
};