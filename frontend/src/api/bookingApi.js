import axiosClient from "./axiosClient";

export const bookingApi = {
  getAllBookings: () => {
    return axiosClient.get("/bookings");
  },

  getBookingById: (bookingId) => {
    return axiosClient.get(`/bookings/${bookingId}`);
  },

  createBooking: (payload) => {
    return axiosClient.post("/bookings", payload);
  },

  confirmBooking: (bookingId) => {
    return axiosClient.put(`/bookings/${bookingId}/confirm`);
  },

  cancelBooking: (bookingId) => {
    return axiosClient.put(`/bookings/${bookingId}/cancel`);
  },

  deleteBooking: (bookingId) => {
    return axiosClient.delete(`/bookings/${bookingId}`);
  },

  updateVehicleInfo: (bookingId, payload) => {
    return axiosClient.put(`/bookings/${bookingId}/edit-vehicle`, payload);
  },
};