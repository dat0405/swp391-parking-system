import axiosClient from './axiosClient';

export const notificationApi = {
  /**
   * Lấy toàn bộ notification của tài khoản
   * hiện đang đăng nhập.
   *
   * Endpoint:
   * GET /api/notifications/me
   */
  getMyNotifications: async () => {
    const response = await axiosClient.get(
      '/notifications/me'
    );

    return Array.isArray(response.data)
      ? response.data
      : [];
  },

  /**
   * Lấy số notification chưa đọc.
   *
   * Endpoint:
   * GET /api/notifications/me/unread-count
   */
  getMyUnreadCount: async () => {
    const response = await axiosClient.get(
      '/notifications/me/unread-count'
    );

    const unreadCount = Number(response.data);

    if (
      !Number.isFinite(unreadCount) ||
      unreadCount <= 0
    ) {
      return 0;
    }

    return Math.floor(unreadCount);
  },

  /**
   * Đánh dấu một notification là đã đọc.
   *
   * Endpoint:
   * PUT /api/notifications/{notificationId}/read
   */
  markAsRead: async (notificationId) => {
    const normalizedId = Number(notificationId);

    if (
      !Number.isInteger(normalizedId) ||
      normalizedId <= 0
    ) {
      throw new Error(
        'A valid notification ID is required'
      );
    }

    const response = await axiosClient.put(
      `/notifications/${normalizedId}/read`
    );

    return response.data;
  },

  /**
   * Đánh dấu toàn bộ notification là đã đọc.
   *
   * Endpoint:
   * PUT /api/notifications/me/read-all
   */
  markAllAsRead: async () => {
    await axiosClient.put(
      '/notifications/me/read-all'
    );
  }
};