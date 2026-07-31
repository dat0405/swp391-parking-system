import axiosClient from './axiosClient';

/**
 * Chuẩn hóa base URL của Backend.
 *
 * Ví dụ:
 * https://backend.azurewebsites.net/api/
 *
 * sẽ thành:
 * https://backend.azurewebsites.net/api
 */
const getApiBaseUrl = () => {
  const configuredBaseUrl = String(
    axiosClient.defaults.baseURL || ''
  ).trim();

  /*
   * Trường hợp axiosClient chưa khai báo baseURL,
   * dùng /api cho môi trường cùng domain.
   */
  if (!configuredBaseUrl) {
    return '/api';
  }

  return configuredBaseUrl.replace(/\/+$/, '');
};

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
  },

  /**
   * Tạo URL dùng để mở kết nối SSE realtime.
   *
   * Không gọi endpoint này bằng axios.
   * Header.jsx sẽ dùng URL này với EventSource.
   *
   * Endpoint:
   * GET /api/notifications/stream
   */
  getNotificationStreamUrl: () => {
    const apiBaseUrl = getApiBaseUrl();

    return `${apiBaseUrl}/notifications/stream`;
  },

  /**
   * Mở kết nối realtime đến Backend.
   *
   * withCredentials: true cho phép trình duyệt
   * gửi JWT cookie đến Azure Backend.
   *
   * Các event Backend gửi:
   * - CONNECTED
   * - NOTIFICATION_CREATED
   * - HEARTBEAT
   */
  createNotificationEventSource: () => {
    if (
      typeof window === 'undefined' ||
      typeof window.EventSource === 'undefined'
    ) {
      throw new Error(
        'EventSource is not supported in this environment'
      );
    }

    const streamUrl =
      notificationApi.getNotificationStreamUrl();

    return new window.EventSource(
      streamUrl,
      {
        withCredentials: true
      }
    );
  }
};