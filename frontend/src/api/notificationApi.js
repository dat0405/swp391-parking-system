import axiosClient from './axiosClient';

export const notificationApi = {
  /**
   * Lấy toàn bộ notification của tài khoản
   * hiện đang đăng nhập.
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
   */
  getMyUnreadCount: async () => {
    const response = await axiosClient.get(
      '/notifications/me/unread-count'
    );

    const unreadCount = Number(response.data);

    return Number.isFinite(unreadCount) &&
      unreadCount > 0
      ? unreadCount
      : 0;
  },

  /**
   * Đánh dấu một notification là đã đọc.
   */
  markAsRead: async (notificationId) => {
    if (
      notificationId === null ||
      notificationId === undefined
    ) {
      throw new Error('Notification ID is required');
    }

    const response = await axiosClient.put(
      `/notifications/${notificationId}/read`
    );

    return response.data;
  },

  /**
   * Đánh dấu toàn bộ notification là đã đọc.
   */
  markAllAsRead: async () => {
    await axiosClient.put(
      '/notifications/me/read-all'
    );
  }
};