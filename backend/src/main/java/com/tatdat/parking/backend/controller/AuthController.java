package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.AuthResponse;
import com.tatdat.parking.backend.dto.ForgotPasswordRequest;
import com.tatdat.parking.backend.dto.GoogleAccessTokenRequest;
import com.tatdat.parking.backend.dto.GoogleCodeRequest;
import com.tatdat.parking.backend.dto.LoginRequest;
import com.tatdat.parking.backend.dto.LogoutRequest;
import com.tatdat.parking.backend.dto.RefreshTokenRequest;
import com.tatdat.parking.backend.dto.RegisterRequest;
import com.tatdat.parking.backend.dto.ResetForgotPasswordRequest;
import com.tatdat.parking.backend.dto.UserStatusEvent;
import com.tatdat.parking.backend.entity.RefreshToken;
import com.tatdat.parking.backend.entity.Role;
import com.tatdat.parking.backend.entity.User;
import com.tatdat.parking.backend.exception.AccountBannedException;
import com.tatdat.parking.backend.repository.RoleRepository;
import com.tatdat.parking.backend.repository.UserRepository;
import com.tatdat.parking.backend.security.JwtService;
import com.tatdat.parking.backend.security.RefreshTokenService;
import com.tatdat.parking.backend.service.PasswordResetService;
import com.tatdat.parking.backend.service.UserStatusEventService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String ACCESS_TOKEN_COOKIE =
            "access_token";

    private static final String REFRESH_TOKEN_COOKIE =
            "refresh_token";

    private static final String STATUS_ACTIVE =
            "ACTIVE";

    private static final String STATUS_INACTIVE =
            "INACTIVE";

    private static final String STATUS_BANNED =
            "BANNED";

    private static final String DEFAULT_DRIVER_ROLE =
            "DRIVER";

    /**
     * Danh sách role hợp lệ phải khớp với:
     *
     * - Database
     * - SecurityConfig
     * - JwtAuthenticationFilter
     * - Frontend auth.js
     */
    private static final Set<String> SUPPORTED_ROLES =
            Set.of(
                    "SYSTEM_ADMIN",
                    "PARKING_MANAGER",
                    "PARKING_STAFF",
                    "DRIVER",
                    "USER"
            );

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final PasswordResetService passwordResetService;
    private final UserStatusEventService userStatusEventService;

    @Value("${google.client-id:}")
    private String googleClientId;

    @Value("${google.client-secret:}")
    private String googleClientSecret;

    @Value("${google.redirect-uri:}")
    private String googleRedirectUri;

    /*
     * Local development:
     *
     * app.cookie.secure=false
     * app.cookie.same-site=Lax
     *
     * Deploy HTTPS khi frontend/backend khác domain:
     *
     * app.cookie.secure=true
     * app.cookie.same-site=None
     */
    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Lax}")
    private String cookieSameSite;

    /**
     * Thời gian tồn tại access token tính bằng milliseconds.
     *
     * Giá trị này phải giống JwtService.
     */
    @Value("${jwt.access-token-expiration}")
    private Long accessTokenExpiration;

    /**
     * Thời gian tồn tại refresh token tính bằng milliseconds.
     *
     * Nếu application.properties chưa có thì mặc định là 7 ngày.
     */
    @Value("${jwt.refresh-token-expiration:604800000}")
    private Long refreshTokenExpiration;

    /**
     * Đăng ký tài khoản thông thường.
     *
     * Người dùng tự đăng ký luôn được cấp role DRIVER.
     * Role STAFF/MANAGER/ADMIN chỉ nên do System Admin cấp.
     */
    @PostMapping("/register")
    public String register(
            @Valid @RequestBody RegisterRequest request
    ) {
        validateRegisterRequest(request);

        String email = normalizeEmail(
                request.getEmail()
        );

        User existingUser = userRepository
                .findByEmail(email)
                .orElse(null);

        if (existingUser != null) {
            String existingStatus = normalizeText(
                    existingUser.getStatus()
            );

            if (STATUS_BANNED.equals(existingStatus)) {
                throw new RuntimeException(
                        "Email này đã bị vô hiệu hóa và không thể đăng ký lại"
                );
            }

            throw new RuntimeException(
                    "Email already exists"
            );
        }

        String phone = normalizeOptionalText(
                request.getPhone()
        );

        if (
                phone != null &&
                        userRepository.findByPhone(phone).isPresent()
        ) {
            throw new RuntimeException(
                    "Phone number already exists"
            );
        }

        Role driverRole = findRequiredRole(
                DEFAULT_DRIVER_ROLE
        );

        Instant now = Instant.now();

        User user = new User();

        user.setFullName(
                request.getFullName().trim()
        );

        user.setEmail(email);

        user.setPassword(
                passwordEncoder.encode(
                        request.getPassword()
                )
        );

        user.setPhone(phone);
        user.setRole(driverRole);
        user.setStatus(STATUS_ACTIVE);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        user.setLastLoginAt(null);
        user.setLastActiveAt(null);

        userRepository.save(user);

        return "Register successfully";
    }

    /**
     * Đăng nhập bằng email và password.
     */
    @PostMapping("/login")
    public AuthResponse login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response
    ) {
        if (
                request == null ||
                        request.getEmail() == null ||
                        request.getEmail().isBlank() ||
                        request.getPassword() == null ||
                        request.getPassword().isBlank()
        ) {
            throw new RuntimeException(
                    "Invalid email or password"
            );
        }

        String email = normalizeEmail(
                request.getEmail()
        );

        User user = userRepository
                .findByEmail(email)
                .orElseThrow(
                        () -> new RuntimeException(
                                "Invalid email or password"
                        )
                );

        if (
                user.getPassword() == null ||
                        !passwordEncoder.matches(
                                request.getPassword(),
                                user.getPassword()
                        )
        ) {
            throw new RuntimeException(
                    "Invalid email or password"
            );
        }

        validateUserCanAuthenticate(user);
        validateUserRole(user);

        return completeSuccessfulLogin(
                user,
                response
        );
    }

    /**
     * Google popup/implicit flow cũ.
     *
     * Giữ lại để tương thích với frontend phiên bản cũ.
     */
    @PostMapping("/google-token")
    public AuthResponse googleLoginWithAccessToken(
            @Valid @RequestBody
            GoogleAccessTokenRequest request,

            HttpServletResponse response
    ) {
        if (
                request == null ||
                        request.getAccessToken() == null ||
                        request.getAccessToken().isBlank()
        ) {
            throw new RuntimeException(
                    "Google access token is required"
            );
        }

        try {
            RestTemplate restTemplate =
                    new RestTemplate();

            ResponseEntity<Map> googleResponse =
                    restTemplate.exchange(
                            "https://www.googleapis.com/oauth2/v3/userinfo",
                            HttpMethod.GET,
                            new HttpEntity<>(
                                    createGoogleAuthHeaders(
                                            request.getAccessToken().trim()
                                    )
                            ),
                            Map.class
                    );

            return authenticateGoogleUserAndBuildResponse(
                    googleResponse.getBody(),
                    response,
                    "Google login failed"
            );

        } catch (RuntimeException error) {
            throw error;

        } catch (Exception error) {
            throw new RuntimeException(
                    "Google login failed"
            );
        }
    }

    /**
     * Google Authorization Code redirect flow.
     */
    @PostMapping("/google-code")
    public AuthResponse googleLoginWithCode(
            @Valid @RequestBody GoogleCodeRequest request,
            HttpServletResponse response
    ) {
        if (
                request == null ||
                        request.getCode() == null ||
                        request.getCode().isBlank()
        ) {
            throw new RuntimeException(
                    "Google authorization code is required"
            );
        }

        validateGoogleCodeConfiguration();

        try {
            RestTemplate restTemplate =
                    new RestTemplate();

            HttpHeaders tokenHeaders =
                    new HttpHeaders();

            tokenHeaders.setContentType(
                    MediaType.APPLICATION_FORM_URLENCODED
            );

            MultiValueMap<String, String> tokenBody =
                    new LinkedMultiValueMap<>();

            tokenBody.add(
                    "code",
                    request.getCode().trim()
            );

            tokenBody.add(
                    "client_id",
                    googleClientId.trim()
            );

            tokenBody.add(
                    "client_secret",
                    googleClientSecret.trim()
            );

            tokenBody.add(
                    "redirect_uri",
                    googleRedirectUri.trim()
            );

            tokenBody.add(
                    "grant_type",
                    "authorization_code"
            );

            ResponseEntity<Map> tokenResponse =
                    restTemplate.postForEntity(
                            "https://oauth2.googleapis.com/token",
                            new HttpEntity<>(
                                    tokenBody,
                                    tokenHeaders
                            ),
                            Map.class
                    );

            Map<String, Object> tokenData =
                    tokenResponse.getBody();

            if (
                    tokenData == null ||
                            tokenData.get("access_token") == null
            ) {
                throw new RuntimeException(
                        "Cannot exchange Google authorization code"
                );
            }

            String googleAccessToken =
                    String.valueOf(
                            tokenData.get("access_token")
                    ).trim();

            if (googleAccessToken.isBlank()) {
                throw new RuntimeException(
                        "Google access token is empty"
                );
            }

            ResponseEntity<Map> googleResponse =
                    restTemplate.exchange(
                            "https://www.googleapis.com/oauth2/v3/userinfo",
                            HttpMethod.GET,
                            new HttpEntity<>(
                                    createGoogleAuthHeaders(
                                            googleAccessToken
                                    )
                            ),
                            Map.class
                    );

            return authenticateGoogleUserAndBuildResponse(
                    googleResponse.getBody(),
                    response,
                    "Google redirect login failed"
            );

        } catch (RuntimeException error) {
            throw error;

        } catch (Exception error) {
            throw new RuntimeException(
                    "Google redirect login failed"
            );
        }
    }

    /**
     * Làm mới access token.
     *
     * Ưu tiên refresh token trong HttpOnly cookie.
     * Request body chỉ giữ để tương thích với frontend cũ.
     */
    @PostMapping("/refresh-token")
    public AuthResponse refreshToken(
            @CookieValue(
                    name = REFRESH_TOKEN_COOKIE,
                    required = false
            )
            String refreshTokenFromCookie,

            @RequestBody(required = false)
            RefreshTokenRequest request,

            HttpServletResponse response
    ) {
        String refreshTokenValue =
                normalizeOptionalText(
                        refreshTokenFromCookie
                );

        if (
                refreshTokenValue == null &&
                        request != null
        ) {
            refreshTokenValue =
                    normalizeOptionalText(
                            request.getRefreshToken()
                    );
        }

        if (refreshTokenValue == null) {
            clearAuthCookies(response);

            throw new RuntimeException(
                    "Refresh token is required"
            );
        }

        RefreshToken oldRefreshToken =
                refreshTokenService.verifyRefreshToken(
                        refreshTokenValue
                );

        if (
                oldRefreshToken == null ||
                        oldRefreshToken.getUser() == null
        ) {
            clearAuthCookies(response);

            throw new RuntimeException(
                    "Refresh token is invalid"
            );
        }

        User user = oldRefreshToken.getUser();

        validateUserCanAuthenticate(user);
        validateUserRole(user);

        /*
         * Rotation:
         * token cũ bị thu hồi và token mới được tạo.
         */
        refreshTokenService.revokeRefreshToken(
                oldRefreshToken.getToken()
        );

        Instant now = Instant.now();

        user.setLastActiveAt(now);
        user.setUpdatedAt(now);

        userRepository.save(user);

        publishUserStatus(user, true);

        String newAccessToken =
                jwtService.generateAccessToken(user);

        RefreshToken newRefreshToken =
                refreshTokenService.createRefreshToken(
                        user
                );

        if (
                newRefreshToken == null ||
                        newRefreshToken.getToken() == null ||
                        newRefreshToken.getToken().isBlank()
        ) {
            clearAuthCookies(response);

            throw new RuntimeException(
                    "Cannot create refresh token"
            );
        }

        addAuthCookies(
                response,
                newAccessToken,
                newRefreshToken.getToken()
        );

        return buildAuthResponse(user);
    }

    /**
     * Đăng xuất.
     *
     * Cookie luôn được xóa, kể cả refresh token đã hết hạn
     * hoặc không còn tồn tại trong database.
     */
    @PostMapping("/logout")
    public String logout(
            @CookieValue(
                    name = REFRESH_TOKEN_COOKIE,
                    required = false
            )
            String refreshTokenFromCookie,

            @RequestBody(required = false)
            LogoutRequest request,

            HttpServletResponse response
    ) {
        String refreshTokenValue =
                normalizeOptionalText(
                        refreshTokenFromCookie
                );

        if (
                refreshTokenValue == null &&
                        request != null
        ) {
            refreshTokenValue =
                    normalizeOptionalText(
                            request.getRefreshToken()
                    );
        }

        try {
            if (refreshTokenValue != null) {
                revokeRefreshTokenAndSetUserOffline(
                        refreshTokenValue
                );
            }
        } finally {
            clearAuthCookies(response);
        }

        return "Logout successfully";
    }

    /**
     * Trả thông tin user đang đăng nhập.
     *
     * Frontend sử dụng endpoint này để lấy đúng role:
     *
     * SYSTEM_ADMIN
     * PARKING_MANAGER
     * PARKING_STAFF
     * DRIVER
     * USER
     */
    @GetMapping("/me")
    public AuthResponse getCurrentUser(
            Authentication authentication
    ) {
        if (
                authentication == null ||
                        authentication.getName() == null ||
                        authentication.getName().isBlank()
        ) {
            throw new RuntimeException(
                    "Unauthenticated"
            );
        }

        String email = normalizeEmail(
                authentication.getName()
        );

        User user = userRepository
                .findByEmail(email)
                .orElseThrow(
                        () -> new RuntimeException(
                                "User not found"
                        )
                );

        validateUserCanAuthenticate(user);
        validateUserRole(user);

        return buildAuthResponse(user);
    }

    @PostMapping("/forgot-password")
    public String forgotPassword(
            @Valid @RequestBody
            ForgotPasswordRequest request
    ) {
        if (
                request == null ||
                        request.getEmail() == null ||
                        request.getEmail().isBlank()
        ) {
            throw new RuntimeException(
                    "Email is required"
            );
        }

        passwordResetService.forgotPassword(
                normalizeEmail(
                        request.getEmail()
                )
        );

        return "OTP has been sent to your email";
    }

    @PostMapping("/reset-password")
    public String resetPassword(
            @Valid @RequestBody
            ResetForgotPasswordRequest request
    ) {
        if (request == null) {
            throw new RuntimeException(
                    "Reset password request is required"
            );
        }

        passwordResetService.resetPassword(
                normalizeEmail(
                        request.getEmail()
                ),
                request.getOtp(),
                request.getNewPassword()
        );

        return "Password has been reset successfully";
    }

    /**
     * Xử lý thông tin tài khoản trả về từ Google.
     *
     * Quan trọng:
     *
     * - Nếu email đã tồn tại, hệ thống giữ nguyên role hiện tại.
     * - PARKING_STAFF đăng nhập Google vẫn là PARKING_STAFF.
     * - Chỉ tài khoản Google mới hoàn toàn được tạo dưới role DRIVER.
     */
    private AuthResponse authenticateGoogleUserAndBuildResponse(
            Map<String, Object> googleUser,
            HttpServletResponse response,
            String defaultErrorMessage
    ) {
        if (googleUser == null) {
            throw new RuntimeException(
                    "Cannot get Google account information"
            );
        }

        String email = getMapString(
                googleUser,
                "email"
        );

        String name = getMapString(
                googleUser,
                "name"
        );

        Object emailVerifiedValue =
                googleUser.get("email_verified");

        if (email == null || email.isBlank()) {
            throw new RuntimeException(
                    "Google account does not contain an email"
            );
        }

        boolean emailVerified =
                Boolean.TRUE.equals(emailVerifiedValue)
                        || "true".equalsIgnoreCase(
                        String.valueOf(
                                emailVerifiedValue
                        )
                );

        if (!emailVerified) {
            throw new RuntimeException(
                    "Google email is not verified"
            );
        }

        try {
            String normalizedEmail =
                    normalizeEmail(email);

            User user = userRepository
                    .findByEmail(normalizedEmail)
                    .orElseGet(
                            () -> createGoogleDriverUser(
                                    normalizedEmail,
                                    name
                            )
                    );

            validateUserCanAuthenticate(user);
            validateUserRole(user);

            return completeSuccessfulLogin(
                    user,
                    response
            );

        } catch (RuntimeException error) {
            throw error;

        } catch (Exception error) {
            throw new RuntimeException(
                    defaultErrorMessage
            );
        }
    }

    /**
     * Hoàn tất đăng nhập, tạo JWT và refresh token.
     */
    private AuthResponse completeSuccessfulLogin(
            User user,
            HttpServletResponse response
    ) {
        validateUserCanAuthenticate(user);
        validateUserRole(user);

        Instant now = Instant.now();

        user.setLastLoginAt(now);
        user.setLastActiveAt(now);
        user.setUpdatedAt(now);

        userRepository.save(user);

        publishUserStatus(user, true);

        String accessToken =
                jwtService.generateAccessToken(user);

        RefreshToken refreshToken =
                refreshTokenService.createRefreshToken(
                        user
                );

        if (
                refreshToken == null ||
                        refreshToken.getToken() == null ||
                        refreshToken.getToken().isBlank()
        ) {
            throw new RuntimeException(
                    "Cannot create refresh token"
            );
        }

        addAuthCookies(
                response,
                accessToken,
                refreshToken.getToken()
        );

        return buildAuthResponse(user);
    }

    /**
     * Tạo tài khoản mới từ Google.
     *
     * Chỉ tài khoản chưa tồn tại mới được tạo với role DRIVER.
     */
    private User createGoogleDriverUser(
            String email,
            String googleName
    ) {
        Role driverRole = findRequiredRole(
                DEFAULT_DRIVER_ROLE
        );

        Instant now = Instant.now();

        String fullName =
                normalizeOptionalText(
                        googleName
                );

        if (fullName == null) {
            String emailPrefix =
                    email.contains("@")
                            ? email.substring(
                            0,
                            email.indexOf("@")
                    )
                            : email;

            fullName = emailPrefix;
        }

        User user = new User();

        user.setFullName(fullName);
        user.setEmail(email);

        /*
         * Google user không sử dụng password này để đăng nhập.
         * UUID giúp tránh password dự đoán được.
         */
        user.setPassword(
                passwordEncoder.encode(
                        "GOOGLE_AUTH_" +
                                UUID.randomUUID()
                )
        );

        user.setPhone(null);
        user.setRole(driverRole);
        user.setStatus(STATUS_ACTIVE);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        user.setLastLoginAt(null);
        user.setLastActiveAt(null);

        return userRepository.save(user);
    }

    private HttpHeaders createGoogleAuthHeaders(
            String accessToken
    ) {
        if (
                accessToken == null ||
                        accessToken.isBlank()
        ) {
            throw new RuntimeException(
                    "Google access token is required"
            );
        }

        HttpHeaders headers =
                new HttpHeaders();

        headers.setBearerAuth(
                accessToken.trim()
        );

        return headers;
    }

    private void validateGoogleCodeConfiguration() {
        if (
                googleClientId == null ||
                        googleClientId.isBlank()
        ) {
            throw new RuntimeException(
                    "Missing google.client-id configuration"
            );
        }

        if (
                googleClientSecret == null ||
                        googleClientSecret.isBlank()
        ) {
            throw new RuntimeException(
                    "Missing google.client-secret configuration"
            );
        }

        if (
                googleRedirectUri == null ||
                        googleRedirectUri.isBlank()
        ) {
            throw new RuntimeException(
                    "Missing google.redirect-uri configuration"
            );
        }
    }

    /**
     * Thêm access token và refresh token dưới dạng HttpOnly cookie.
     */
    private void addAuthCookies(
            HttpServletResponse response,
            String accessToken,
            String refreshToken
    ) {
        if (
                accessToken == null ||
                        accessToken.isBlank()
        ) {
            throw new RuntimeException(
                    "Access token is required"
            );
        }

        if (
                refreshToken == null ||
                        refreshToken.isBlank()
        ) {
            throw new RuntimeException(
                    "Refresh token is required"
            );
        }

        Duration accessCookieDuration =
                durationFromMilliseconds(
                        accessTokenExpiration,
                        Duration.ofMinutes(15)
                );

        Duration refreshCookieDuration =
                durationFromMilliseconds(
                        refreshTokenExpiration,
                        Duration.ofDays(7)
                );

        ResponseCookie accessTokenCookie =
                ResponseCookie
                        .from(
                                ACCESS_TOKEN_COOKIE,
                                accessToken
                        )
                        .httpOnly(true)
                        .secure(cookieSecure)
                        .sameSite(
                                getNormalizedSameSite()
                        )
                        .path("/")
                        .maxAge(accessCookieDuration)
                        .build();

        ResponseCookie refreshTokenCookie =
                ResponseCookie
                        .from(
                                REFRESH_TOKEN_COOKIE,
                                refreshToken
                        )
                        .httpOnly(true)
                        .secure(cookieSecure)
                        .sameSite(
                                getNormalizedSameSite()
                        )
                        .path("/api/auth")
                        .maxAge(refreshCookieDuration)
                        .build();

        response.addHeader(
                HttpHeaders.SET_COOKIE,
                accessTokenCookie.toString()
        );

        response.addHeader(
                HttpHeaders.SET_COOKIE,
                refreshTokenCookie.toString()
        );
    }

    /**
     * Xóa access token và refresh token cookie.
     *
     * Path phải giống chính xác path lúc tạo cookie.
     */
    private void clearAuthCookies(
            HttpServletResponse response
    ) {
        ResponseCookie accessTokenCookie =
                ResponseCookie
                        .from(
                                ACCESS_TOKEN_COOKIE,
                                ""
                        )
                        .httpOnly(true)
                        .secure(cookieSecure)
                        .sameSite(
                                getNormalizedSameSite()
                        )
                        .path("/")
                        .maxAge(Duration.ZERO)
                        .build();

        ResponseCookie refreshTokenCookie =
                ResponseCookie
                        .from(
                                REFRESH_TOKEN_COOKIE,
                                ""
                        )
                        .httpOnly(true)
                        .secure(cookieSecure)
                        .sameSite(
                                getNormalizedSameSite()
                        )
                        .path("/api/auth")
                        .maxAge(Duration.ZERO)
                        .build();

        response.addHeader(
                HttpHeaders.SET_COOKIE,
                accessTokenCookie.toString()
        );

        response.addHeader(
                HttpHeaders.SET_COOKIE,
                refreshTokenCookie.toString()
        );
    }

    /**
     * Kiểm tra trạng thái tài khoản.
     */
    private void validateUserCanAuthenticate(
            User user
    ) {
        if (user == null) {
            throw new RuntimeException(
                    "User not found"
            );
        }

        String status = normalizeText(
                user.getStatus()
        );

        if (STATUS_BANNED.equals(status)) {
            throw new AccountBannedException(
                    "Tài khoản của bạn đã bị khóa"
            );
        }

        if (STATUS_INACTIVE.equals(status)) {
            throw new RuntimeException(
                    "Tài khoản của bạn chưa được kích hoạt"
            );
        }

        if (!STATUS_ACTIVE.equals(status)) {
            throw new RuntimeException(
                    "Tài khoản không thể đăng nhập với trạng thái hiện tại"
            );
        }
    }

    /**
     * Bảo đảm user có role hợp lệ.
     */
    private String validateUserRole(
            User user
    ) {
        if (
                user == null ||
                        user.getRole() == null ||
                        user.getRole().getRoleName() == null
        ) {
            throw new RuntimeException(
                    "User role not found"
            );
        }

        String roleName = normalizeRole(
                user.getRole().getRoleName()
        );

        if (
                roleName == null ||
                        !SUPPORTED_ROLES.contains(roleName)
        ) {
            throw new RuntimeException(
                    "User role is not supported"
            );
        }

        return roleName;
    }

    /**
     * Response dùng cho login, refresh token và /auth/me.
     *
     * Vì token nằm trong HttpOnly cookie nên không trả token
     * về JavaScript.
     */
    private AuthResponse buildAuthResponse(
            User user
    ) {
        String roleName =
                validateUserRole(user);

        return AuthResponse.builder()
                .accessToken(null)
                .refreshToken(null)
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(roleName)
                .build();
    }

    private void publishUserStatus(
            User user,
            boolean online
    ) {
        userStatusEventService.publishUserStatus(
                UserStatusEvent.builder()
                        .userId(user.getId())
                        .status(user.getStatus())
                        .online(online)
                        .lastLoginAt(
                                user.getLastLoginAt()
                        )
                        .lastActiveAt(
                                user.getLastActiveAt()
                        )
                        .updatedAt(
                                user.getUpdatedAt()
                        )
                        .build()
        );
    }

    /**
     * Thu hồi refresh token và cập nhật user offline.
     */
    private void revokeRefreshTokenAndSetUserOffline(
            String refreshTokenValue
    ) {
        try {
            RefreshToken refreshToken =
                    refreshTokenService
                            .verifyRefreshToken(
                                    refreshTokenValue
                            );

            if (
                    refreshToken != null &&
                            refreshToken.getUser() != null
            ) {
                User user =
                        refreshToken.getUser();

                Instant now = Instant.now();

                user.setLastActiveAt(null);
                user.setUpdatedAt(now);

                userRepository.save(user);

                publishUserStatus(
                        user,
                        false
                );
            }

        } catch (Exception ignored) {
            /*
             * Refresh token có thể đã hết hạn hoặc bị thu hồi.
             * Logout vẫn phải tiếp tục xóa cookie.
             */
        }

        try {
            refreshTokenService.revokeRefreshToken(
                    refreshTokenValue
            );
        } catch (Exception ignored) {
            /*
             * Không để lỗi revoke ngăn quá trình logout.
             */
        }
    }

    private void validateRegisterRequest(
            RegisterRequest request
    ) {
        if (request == null) {
            throw new RuntimeException(
                    "Register request is required"
            );
        }

        if (
                request.getFullName() == null ||
                        request.getFullName().isBlank()
        ) {
            throw new RuntimeException(
                    "Full name is required"
            );
        }

        if (
                request.getEmail() == null ||
                        request.getEmail().isBlank()
        ) {
            throw new RuntimeException(
                    "Email is required"
            );
        }

        if (
                request.getPassword() == null ||
                        request.getPassword().isBlank()
        ) {
            throw new RuntimeException(
                    "Password is required"
            );
        }

        if (
                request.getConfirmPassword() == null ||
                        request.getConfirmPassword().isBlank()
        ) {
            throw new RuntimeException(
                    "Confirm password is required"
            );
        }

        if (
                !request.getPassword().equals(
                        request.getConfirmPassword()
                )
        ) {
            throw new RuntimeException(
                    "Password and confirm password do not match"
            );
        }
    }

    private Role findRequiredRole(
            String roleName
    ) {
        return roleRepository
                .findByRoleName(roleName)
                .orElseThrow(
                        () -> new RuntimeException(
                                roleName + " role not found"
                        )
                );
    }

    private String normalizeEmail(
            String email
    ) {
        if (email == null || email.isBlank()) {
            throw new RuntimeException(
                    "Email is required"
            );
        }

        return email
                .trim()
                .toLowerCase();
    }

    private String normalizeRole(
            String role
    ) {
        if (role == null || role.isBlank()) {
            return null;
        }

        String normalizedRole =
                role.trim().toUpperCase();

        if (
                normalizedRole.startsWith(
                        "ROLE_"
                )
        ) {
            normalizedRole =
                    normalizedRole.substring(5);
        }

        return normalizedRole.isBlank()
                ? null
                : normalizedRole;
    }

    private String normalizeText(
            String value
    ) {
        if (value == null) {
            return "";
        }

        return value
                .trim()
                .toUpperCase();
    }

    private String normalizeOptionalText(
            String value
    ) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private String getMapString(
            Map<String, Object> map,
            String key
    ) {
        if (map == null || key == null) {
            return null;
        }

        Object value = map.get(key);

        if (value == null) {
            return null;
        }

        String stringValue =
                String.valueOf(value).trim();

        return stringValue.isBlank()
                ? null
                : stringValue;
    }

    private Duration durationFromMilliseconds(
            Long milliseconds,
            Duration fallback
    ) {
        if (
                milliseconds == null ||
                        milliseconds <= 0
        ) {
            return fallback;
        }

        return Duration.ofMillis(
                milliseconds
        );
    }

    /**
     * ResponseCookie chỉ nên nhận:
     *
     * Lax
     * Strict
     * None
     */
    private String getNormalizedSameSite() {
        if (
                cookieSameSite == null ||
                        cookieSameSite.isBlank()
        ) {
            return "Lax";
        }

        String value =
                cookieSameSite.trim();

        if ("none".equalsIgnoreCase(value)) {
            return "None";
        }

        if ("strict".equalsIgnoreCase(value)) {
            return "Strict";
        }

        return "Lax";
    }
}