import axiosClient from "./axiosClient";

export const userApi = {
  /**
   * Lấy danh sách toàn bộ user.
   *
   * config cho phép truyền AbortSignal từ UserManagementPage.
   *
   * Endpoint:
   * GET /api/users
   */
  getUsers(config = {}) {
    return axiosClient.get(
      "/users",
      config
    );
  },

  /**
   * Tạo tài khoản mới.
   *
   * Endpoint:
   * POST /api/users
   */
  createUser(data) {
    return axiosClient.post(
      "/users",
      data
    );
  },

  /**
   * Cập nhật thông tin tài khoản.
   *
   * Endpoint:
   * PUT /api/users/{userId}
   */
  updateUser(userId, data) {
    return axiosClient.put(
      `/users/${userId}`,
      data
    );
  },

  /**
   * Cập nhật role của tài khoản.
   *
   * Endpoint:
   * PUT /api/users/{userId}/role
   */
  updateUserRole(userId, data) {
    return axiosClient.put(
      `/users/${userId}/role`,
      data
    );
  },

  /**
   * Khóa hoặc mở khóa tài khoản.
   *
   * Endpoint:
   * PUT /api/users/{userId}/status
   */
  updateUserStatus(userId, data) {
    return axiosClient.put(
      `/users/${userId}/status`,
      data
    );
  },

  /**
   * Đặt lại mật khẩu cho tài khoản.
   *
   * Endpoint:
   * PUT /api/users/{userId}/reset-password
   */
  resetPassword(userId, data) {
    return axiosClient.put(
      `/users/${userId}/reset-password`,
      data
    );
  },

  /**
   * Cập nhật lastActiveAt của tài khoản
   * đang đăng nhập.
   *
   * Endpoint:
   * PUT /api/users/me/heartbeat
   */
  heartbeat() {
    return axiosClient.put(
      "/users/me/heartbeat"
    );
  },

  /**
   * Chuyển tài khoản đang đăng nhập
   * sang trạng thái offline.
   *
   * Endpoint:
   * PUT /api/users/me/offline
   */
  offline() {
    return axiosClient.put(
      "/users/me/offline"
    );
  }
};