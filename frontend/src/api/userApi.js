import axiosClient from "./axiosClient";

export const userApi = {
  getUsers() {
    return axiosClient.get("/users");
  },

  createUser(data) {
    return axiosClient.post("/users", data);
  },

  updateUser(userId, data) {
    return axiosClient.put(`/users/${userId}`, data);
  },

  updateUserRole(userId, data) {
    return axiosClient.put(`/users/${userId}/role`, data);
  },

  updateUserStatus(userId, data) {
    return axiosClient.put(`/users/${userId}/status`, data);
  },

  resetPassword(userId, data) {
    return axiosClient.put(`/users/${userId}/reset-password`, data);
  },

  heartbeat() {
    return axiosClient.put("/users/me/heartbeat");
  },

  offline() {
    return axiosClient.put("/users/me/offline");
  },
};