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

const isAuthUrl = (url = "") => {
  return (
    url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/google-token") ||
    url.includes("/auth/google-code") ||
    url.includes("/auth/forgot-password") ||
    url.includes("/auth/reset-password")
  );
};

const isRefreshUrl = (url = "") => url.includes("/auth/refresh-token");
const isLogoutUrl = (url = "") => url.includes("/auth/logout");

const processQueue = (error = null) => {
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
  /*
   * Cookie-only auth:
   * - access_token and refresh_token are HttpOnly cookies from backend.
   * - JavaScript cannot and should not read those token values.
   * - These localStorage removals are cleanup for old versions of the app.
   */
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("user_role");
  localStorage.removeItem("headerUserSyncedAt");
  localStorage.removeItem("isLoggingOut");
  localStorage.removeItem("logoutStartedAt");

  sessionStorage.clear();

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
};

axiosClient.interceptors.request.use(
  (config) => {
    /*
     * Cookie-only auth:
     * Do NOT attach Authorization: Bearer from localStorage.
     * Browser will automatically send HttpOnly cookies because withCredentials=true.
     */
    if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response.status;
    const requestUrl = originalRequest.url || "";

    const shouldTryRefresh =
      status === 401 &&
      !originalRequest._retry &&
      !isRefreshUrl(requestUrl) &&
      !isLogoutUrl(requestUrl) &&
      !isAuthUrl(requestUrl);

    if (!shouldTryRefresh) {
      return Promise.reject(error);
    }

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
      /*
       * Backend reads refresh_token from HttpOnly cookie:
       * @CookieValue(name = "refresh_token")
       *
       * No request body is needed here.
       */
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
);

export default axiosClient;