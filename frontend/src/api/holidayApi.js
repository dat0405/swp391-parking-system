import axiosClient from "./axiosClient";

export const holidayApi = {
  getHolidays() {
    return axiosClient.get("/holidays");
  },

  getActiveHolidays() {
    return axiosClient.get("/holidays/active");
  },

  getHolidayById(id) {
    return axiosClient.get(`/holidays/${id}`);
  },

  createHoliday(data) {
    return axiosClient.post("/holidays", data);
  },

  updateHoliday(id, data) {
    return axiosClient.put(`/holidays/${id}`, data);
  },

  updateHolidayStatus(id, isActive) {
    return axiosClient.patch(`/holidays/${id}/status`, null, {
      params: { isActive },
    });
  },

  deleteHoliday(id) {
    return axiosClient.delete(`/holidays/${id}`);
  },
}