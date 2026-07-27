package com.tatdat.parking.backend.security;

import com.tatdat.parking.backend.entity.User;
import com.tatdat.parking.backend.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String ACCESS_TOKEN_COOKIE =
            "access_token";

    private static final String ROLE_PREFIX =
            "ROLE_";

    /**
     * Danh sách role hợp lệ trong hệ thống.
     *
     * Các giá trị này phải khớp với database,
     * SecurityConfig và frontend.
     */
    private static final Set<String> SUPPORTED_ROLES =
            Set.of(
                    "SYSTEM_ADMIN",
                    "PARKING_MANAGER",
                    "PARKING_STAFF",
                    "DRIVER",
                    "USER"
            );

    private final JwtService jwtService;
    private final UserRepository userRepository;

    /**
     * Những endpoint không cần chạy JWT filter.
     */
    @Override
    protected boolean shouldNotFilter(
            HttpServletRequest request
    ) {
        String path = request.getServletPath();
        String method = request.getMethod();

        /*
         * Bỏ qua CORS preflight.
         */
        if (HttpMethod.OPTIONS.matches(method)) {
            return true;
        }

        /*
         * Health check là endpoint công khai.
         */
        if (
                HttpMethod.GET.matches(method) &&
                        "/api/health".equals(path)
        ) {
            return true;
        }

        /*
         * PayOS gọi webhook từ server bên ngoài
         * nên không có access_token của người dùng.
         */
        if (
                HttpMethod.POST.matches(method) &&
                        "/api/payments/payos/webhook".equals(path)
        ) {
            return true;
        }

        /*
         * /api/auth/me phải đi qua JWT filter.
         */
        if ("/api/auth/me".equals(path)) {
            return false;
        }

        /*
         * Các API authentication công khai:
         * login, register, refresh, forgot password,
         * reset password và Google OAuth.
         */
        if (path.startsWith("/api/auth/")) {
            return true;
        }

        /*
         * Swagger và OpenAPI.
         */
        return path.startsWith("/v3/api-docs")
                || path.startsWith("/swagger-ui")
                || "/swagger-ui.html".equals(path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String token = resolveToken(request);

        /*
         * Nếu request không có token thì tiếp tục.
         *
         * SecurityConfig sẽ quyết định endpoint:
         * - public;
         * - yêu cầu đăng nhập;
         * - hoặc yêu cầu role cụ thể.
         */
        if (token == null || token.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        /*
         * Nếu request đã được xác thực bởi filter khác
         * thì không xử lý JWT thêm lần nữa.
         */
        if (
                SecurityContextHolder
                        .getContext()
                        .getAuthentication() != null
        ) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            authenticateRequest(
                    request,
                    response,
                    token
            );

            /*
             * authenticateRequest đã ghi response 401
             * nếu token hoặc user không hợp lệ.
             */
            if (response.isCommitted()) {
                return;
            }

            filterChain.doFilter(request, response);

        } catch (Exception exception) {
            /*
             * Không để token hoặc dữ liệu user bất thường
             * làm lỗi toàn bộ filter chain.
             */
            SecurityContextHolder.clearContext();

            writeUnauthorizedResponse(
                    response,
                    "Invalid access token."
            );
        }
    }

    /**
     * Xác thực token và tạo Authentication cho request.
     */
    private void authenticateRequest(
            HttpServletRequest request,
            HttpServletResponse response,
            String token
    ) throws IOException {

        String email = jwtService.extractEmail(token);

        /*
         * JwtService trả null khi:
         * - token hết hạn;
         * - token sai chữ ký;
         * - token sai cấu trúc;
         * - token rỗng.
         */
        if (email == null || email.isBlank()) {
            SecurityContextHolder.clearContext();

            writeUnauthorizedResponse(
                    response,
                    "Access token is invalid or expired."
            );

            return;
        }

        User user = userRepository
                .findByEmail(email.trim())
                .orElse(null);

        if (user == null) {
            SecurityContextHolder.clearContext();

            writeUnauthorizedResponse(
                    response,
                    "User account was not found."
            );

            return;
        }

        if (
                user.getStatus() == null ||
                        !"ACTIVE".equalsIgnoreCase(
                                user.getStatus().trim()
                        )
        ) {
            SecurityContextHolder.clearContext();

            writeUnauthorizedResponse(
                    response,
                    "User account is not active."
            );

            return;
        }

        if (!jwtService.isTokenValid(token, user)) {
            SecurityContextHolder.clearContext();

            writeUnauthorizedResponse(
                    response,
                    "Access token is invalid or expired."
            );

            return;
        }

        if (
                user.getRole() == null ||
                        user.getRole().getRoleName() == null ||
                        user.getRole().getRoleName().isBlank()
        ) {
            SecurityContextHolder.clearContext();

            writeUnauthorizedResponse(
                    response,
                    "User role was not found."
            );

            return;
        }

        String databaseRole = normalizeRole(
                user.getRole().getRoleName()
        );

        if (
                databaseRole == null ||
                        !SUPPORTED_ROLES.contains(databaseRole)
        ) {
            SecurityContextHolder.clearContext();

            writeUnauthorizedResponse(
                    response,
                    "User role is not supported."
            );

            return;
        }

        String tokenRole = normalizeRole(
                jwtService.extractRole(token)
        );

        if (
                tokenRole == null ||
                        !SUPPORTED_ROLES.contains(tokenRole)
        ) {
            SecurityContextHolder.clearContext();

            writeUnauthorizedResponse(
                    response,
                    "Access token does not contain a valid role."
            );

            return;
        }

        /*
         * Nếu Admin vừa thay đổi role của tài khoản,
         * token cũ không còn được sử dụng.
         *
         * Người dùng phải đăng nhập lại để nhận token mới.
         */
        if (!databaseRole.equals(tokenRole)) {
            SecurityContextHolder.clearContext();

            writeUnauthorizedResponse(
                    response,
                    "Your account role has changed. Please sign in again."
            );

            return;
        }

        SimpleGrantedAuthority authority =
                new SimpleGrantedAuthority(
                        ROLE_PREFIX + databaseRole
                );

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                        user.getEmail(),
                        null,
                        List.of(authority)
                );

        authentication.setDetails(
                new WebAuthenticationDetailsSource()
                        .buildDetails(request)
        );

        SecurityContextHolder
                .getContext()
                .setAuthentication(authentication);
    }

    /**
     * Lấy JWT từ Authorization header hoặc HttpOnly cookie.
     *
     * Thứ tự ưu tiên:
     * 1. Authorization: Bearer ...
     * 2. access_token cookie
     */
    private String resolveToken(
            HttpServletRequest request
    ) {
        String authorizationHeader =
                request.getHeader(
                        HttpHeaders.AUTHORIZATION
                );

        if (
                authorizationHeader != null &&
                        authorizationHeader.regionMatches(
                                true,
                                0,
                                "Bearer ",
                                0,
                                7
                        )
        ) {
            String bearerToken =
                    authorizationHeader
                            .substring(7)
                            .trim();

            if (!bearerToken.isBlank()) {
                return bearerToken;
            }
        }

        return getCookieValue(
                request,
                ACCESS_TOKEN_COOKIE
        );
    }

    /**
     * Đọc giá trị cookie theo tên.
     */
    private String getCookieValue(
            HttpServletRequest request,
            String cookieName
    ) {
        Cookie[] cookies = request.getCookies();

        if (cookies == null || cookies.length == 0) {
            return null;
        }

        for (Cookie cookie : cookies) {
            if (
                    cookie != null &&
                            cookieName.equals(cookie.getName())
            ) {
                String value = cookie.getValue();

                return value == null || value.isBlank()
                        ? null
                        : value.trim();
            }
        }

        return null;
    }

    /**
     * Chuẩn hóa role.
     *
     * Ví dụ:
     * ROLE_PARKING_STAFF -> PARKING_STAFF
     * parking_staff      -> PARKING_STAFF
     */
    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return null;
        }

        String normalizedRole =
                role.trim().toUpperCase();

        if (normalizedRole.startsWith(ROLE_PREFIX)) {
            normalizedRole =
                    normalizedRole.substring(
                            ROLE_PREFIX.length()
                    );
        }

        return normalizedRole.isBlank()
                ? null
                : normalizedRole;
    }

    /**
     * Trả lỗi 401 dưới dạng JSON để frontend
     * có thể đọc response.data.message.
     */
    private void writeUnauthorizedResponse(
            HttpServletResponse response,
            String message
    ) throws IOException {

        if (response.isCommitted()) {
            return;
        }

        response.resetBuffer();

        response.setStatus(
                HttpServletResponse.SC_UNAUTHORIZED
        );

        response.setContentType(
                "application/json"
        );

        response.setCharacterEncoding(
                StandardCharsets.UTF_8.name()
        );

        response.getWriter().write(
                "{\"message\":\"" +
                        escapeJson(message) +
                        "\"}"
        );

        response.flushBuffer();
    }

    /**
     * Escape chuỗi trước khi đặt vào JSON.
     */
    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n");
    }
}