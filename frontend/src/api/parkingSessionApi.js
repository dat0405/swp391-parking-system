import axiosClient from "./axiosClient";

export const parkingSessionApi = {
  checkIn(data) {
    return axiosClient.post("/parking-operations/check-in", data);
  },

  searchCheckout(params) {
    return axiosClient.get("/parking-operations/check-out/search", {
      params,
    });
  },

  checkOut(data) {
    return axiosClient.post("/parking-operations/check-out", data);
  },

  getActiveSessions() {
    return axiosClient.get("/parking-operations/active");
  },

  getParkingFloorStats() {
    return axiosClient.get("/parking-operations/floor-stats");
  },
};