import axios from "axios";

const API_BASE_URL = "http://localhost:8080/api";

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((request) => {
    if (error) {
      request.reject(error);
    } else {
      request.resolve();
    }
  });

  failedQueue = [];
};

const clearAuthAndRedirect = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  sessionStorage.clear();

  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

axiosClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const isUnauthorized = error.response.status === 401;
    const isRefreshRequest = originalRequest.url?.includes("/auth/refresh-token");
    const isLoginRequest = originalRequest.url?.includes("/auth/login");

    if (
      isUnauthorized &&
      !originalRequest._retry &&
      !isRefreshRequest &&
      !isLoginRequest
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => axiosClient(originalRequest))
          .catch((queueError) => Promise.reject(queueError));
      }

      isRefreshing = true;

      try {
        await axiosClient.post("/auth/refresh-token");

        processQueue(null);

        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        clearAuthAndRedirect();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;