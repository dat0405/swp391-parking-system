import axios from "axios";

/*
 * VITE_API_BASE_URL chỉ chứa domain backend, ví dụ:
 *
 * Local:
 * http://localhost:8080
 *
 * Production:
 * https://swp391-parking-backend-2005-budsfhhce2d6gte8.southeastasia-01.azurewebsites.net
 */
const BACKEND_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

/*
 * Xóa dấu "/" thừa ở cuối URL rồi thêm "/api".
 *
 * Ví dụ:
 * http://localhost:8080
 * trở thành:
 * http://localhost:8080/api
 */
const API_BASE_URL = `${BACKEND_URL.replace(/\/+$/, "")}/api`;

const axiosClient = axios.create({
  baseURL: API_BASE_URL,

  /*
   * Bắt buộc để trình duyệt gửi và nhận HttpOnly cookie
   * giữa frontend Cloudflare và backend Azure.
   */
  withCredentials: true,

  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

let isRefreshing = false;
let failedQueue = [];

/*
 * Những API đăng nhập công khai không được tự động gọi refresh token
 * khi nhận lỗi 401.
 */
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

const isRefreshUrl = (url = "") => {
  return url.includes("/auth/refresh-token");
};

const isLogoutUrl = (url = "") => {
  return url.includes("/auth/logout");
};

/*
 * Giải quyết các request đang chờ trong lúc refresh token.
 */
const processQueue = (error = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });

  failedQueue = [];
};

/*
 * Xóa dữ liệu đăng nhập cũ phía frontend và đưa người dùng về Login.
 *
 * access_token và refresh_token là HttpOnly cookies nên JavaScript
 * không thể và cũng không nên đọc trực tiếp.
 */
const clearAuthAndRedirect = () => {
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

/*
 * Request interceptor.
 */
axiosClient.interceptors.request.use(
  (config) => {
    /*
     * Hệ thống sử dụng cookie-only authentication.
     * Không lấy token cũ từ localStorage để thêm Bearer token.
     */
    if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

/*
 * Response interceptor.
 */
axiosClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    /*
     * Không có response thường là:
     * - mất mạng;
     * - backend không chạy;
     * - DNS;
     * - trình duyệt chặn request.
     */
    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response.status;
    const requestUrl = originalRequest.url || "";

    /*
     * Chỉ thử refresh khi:
     * - API trả 401;
     * - request chưa retry;
     * - không phải refresh API;
     * - không phải logout API;
     * - không phải API đăng nhập công khai.
     */
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

    /*
     * Nếu một request khác đang refresh token,
     * request hiện tại sẽ đợi kết quả thay vì refresh thêm lần nữa.
     */
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve,
          reject,
        });
      })
        .then(() => axiosClient(originalRequest))
        .catch((queueError) => Promise.reject(queueError));
    }

    isRefreshing = true;

    try {
      /*
       * Backend đọc refresh_token từ HttpOnly cookie.
       * Không cần gửi refresh token trong request body.
       */
      await axiosClient.post("/auth/refresh-token");

      processQueue();

      /*
       * Gửi lại request ban đầu sau khi refresh thành công.
       */
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