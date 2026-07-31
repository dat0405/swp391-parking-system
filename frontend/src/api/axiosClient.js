import axios from "axios";

/*
 * VITE_API_BASE_URL chỉ chứa domain backend.
 *
 * Local:
 * http://localhost:8080
 *
 * Production:
 * https://swp391-parking-backend-2005-budsfhhce2d6gte8.southeastasia-01.azurewebsites.net
 */
const BACKEND_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080";

/*
 * Chuẩn hóa URL và thêm /api.
 */
const API_BASE_URL = `${BACKEND_URL.replace(
  /\/+$/,
  ""
)}/api`;

const axiosClient = axios.create({
  baseURL: API_BASE_URL,

  /*
   * Bắt buộc để gửi và nhận HttpOnly cookies
   * giữa Cloudflare Frontend và Azure Backend.
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
 * Chuẩn hóa URL để việc kiểm tra endpoint
 * không phụ thuộc query string.
 */
const normalizeRequestUrl = (url = "") => {
  return String(url).split("?")[0];
};

/*
 * Các API xác thực công khai không được tự động refresh
 * khi trả về 401 hoặc 400.
 */
const isPublicAuthUrl = (url = "") => {
  const normalizedUrl =
    normalizeRequestUrl(url);

  return (
    normalizedUrl.includes("/auth/login") ||
    normalizedUrl.includes("/auth/register") ||
    normalizedUrl.includes("/auth/google-token") ||
    normalizedUrl.includes("/auth/google-code") ||
    normalizedUrl.includes("/auth/forgot-password") ||
    normalizedUrl.includes("/auth/reset-password")
  );
};

const isRefreshUrl = (url = "") => {
  return normalizeRequestUrl(url).includes(
    "/auth/refresh-token"
  );
};

const isLogoutUrl = (url = "") => {
  return normalizeRequestUrl(url).includes(
    "/auth/logout"
  );
};

/*
 * /auth/me thường được gọi khi ứng dụng khởi động
 * để kiểm tra người dùng đã đăng nhập hay chưa.
 *
 * Trên trang Login, 401 từ endpoint này là bình thường
 * và không được kích hoạt refresh token.
 */
const isCurrentUserUrl = (url = "") => {
  return normalizeRequestUrl(url).includes(
    "/auth/me"
  );
};

const isLoginPage = () => {
  const pathname =
    window.location.pathname || "";

  return (
    pathname === "/login" ||
    pathname.startsWith("/login/")
  );
};

/*
 * Giải quyết các request đang chờ trong lúc
 * một request khác refresh token.
 */
const processQueue = (error = null) => {
  failedQueue.forEach(
    ({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    }
  );

  failedQueue = [];
};

/*
 * Xóa dữ liệu xác thực cũ phía Frontend.
 *
 * access_token và refresh_token là HttpOnly cookies,
 * JavaScript không trực tiếp đọc hoặc xóa được.
 */
const clearLocalAuthState = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("authToken");

  localStorage.removeItem("user");
  localStorage.removeItem("user_role");
  localStorage.removeItem(
    "headerUserSyncedAt"
  );

  localStorage.removeItem("isLoggingOut");
  localStorage.removeItem(
    "logoutStartedAt"
  );

  sessionStorage.clear();
};

/*
 * Xóa session Frontend rồi đưa người dùng về Login.
 */
const clearAuthAndRedirect = () => {
  clearLocalAuthState();

  if (!isLoginPage()) {
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
     * Không gửi Bearer token cũ từ localStorage.
     */
    if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }

    return config;
  },

  (error) => Promise.reject(error)
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
     * - Backend chưa chạy;
     * - lỗi DNS;
     * - CORS;
     * - request bị trình duyệt chặn.
     */
    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response.status;

    const requestUrl =
      originalRequest.url || "";

    /*
     * Trên trang Login:
     *
     * GET /auth/me trả 401 chỉ có nghĩa là người dùng
     * chưa đăng nhập. Không gọi refresh-token và không
     * chuyển thành lỗi "Refresh token is required".
     */
    if (
      status === 401 &&
      isCurrentUserUrl(requestUrl) &&
      isLoginPage()
    ) {
      clearLocalAuthState();
      return Promise.reject(error);
    }

    /*
     * Không được refresh token cho chính các API auth.
     */
    if (
      isPublicAuthUrl(requestUrl) ||
      isRefreshUrl(requestUrl) ||
      isLogoutUrl(requestUrl)
    ) {
      return Promise.reject(error);
    }

    /*
     * Chỉ thử refresh khi:
     * - Backend trả 401;
     * - request chưa từng retry;
     * - không phải API xác thực công khai;
     * - không phải refresh hoặc logout;
     * - không phải /auth/me trên trang Login.
     */
    const shouldTryRefresh =
      status === 401 &&
      !originalRequest._retry;

    if (!shouldTryRefresh) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    /*
     * Nếu đã có một request đang refresh,
     * request hiện tại đợi kết quả đó.
     */
    if (isRefreshing) {
      return new Promise(
        (resolve, reject) => {
          failedQueue.push({
            resolve,
            reject,
          });
        }
      )
        .then(() =>
          axiosClient(originalRequest)
        )
        .catch((queueError) =>
          Promise.reject(queueError)
        );
    }

    isRefreshing = true;

    try {
      /*
       * Backend lấy refresh_token từ HttpOnly cookie.
       * Không gửi token trong request body.
       */
      await axiosClient.post(
        "/auth/refresh-token"
      );

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