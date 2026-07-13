import axiosClient from './axiosClient';

const BOOKING_HISTORY_ENDPOINT = '/bookings/my-history';

const validateBookingId = (bookingId) => {
  const numericBookingId = Number(bookingId);

  if (
    !bookingId ||
    Number.isNaN(numericBookingId) ||
    numericBookingId <= 0
  ) {
    throw new Error('Booking ID không hợp lệ.');
  }

  return numericBookingId;
};

export const bookingHistoryApi = {
  /**
   * Lấy toàn bộ lịch sử booking của tài khoản đang đăng nhập.
   *
   * Backend tự xác định người dùng từ access_token
   * trong HttpOnly cookie.
   */
  getMyHistory: async () => {
    const response = await axiosClient.get(
      BOOKING_HISTORY_ENDPOINT
    );

    return Array.isArray(response.data)
      ? response.data
      : [];
  },

  /**
   * Lấy chi tiết một booking của tài khoản đang đăng nhập.
   *
   * @param {number|string} bookingId
   */
  getMyHistoryDetail: async (bookingId) => {
    const validBookingId =
      validateBookingId(bookingId);

    const response = await axiosClient.get(
      `${BOOKING_HISTORY_ENDPOINT}/${validBookingId}`
    );

    return response.data;
  }
};

export default bookingHistoryApi;