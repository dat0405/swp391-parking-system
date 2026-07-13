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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String ACCESS_TOKEN_COOKIE = "access_token";
    private static final String REFRESH_TOKEN_COOKIE = "refresh_token";

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
     *   app.cookie.secure=false
     *   app.cookie.same-site=Lax
     *
     * Deploy HTTPS, frontend/backend khác domain:
     *   app.cookie.secure=true
     *   app.cookie.same-site=None
     */
    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Lax}")
    private String cookieSameSite;

    @PostMapping("/register")
    public String register(@Valid @RequestBody RegisterRequest request) {
        if (request.getFullName() == null || request.getFullName().isBlank()) {
            throw new RuntimeException("Full name is required");
        }

        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new RuntimeException("Email is required");
        }

        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new RuntimeException("Password is required");
        }

        if (request.getConfirmPassword() == null || request.getConfirmPassword().isBlank()) {
            throw new RuntimeException("Confirm password is required");
        }

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Password and confirm password do not match");
        }

        String email = request.getEmail().trim().toLowerCase();

        User existingUser = userRepository.findByEmail(email).orElse(null);

        if (existingUser != null) {
            if ("BANNED".equalsIgnoreCase(existingUser.getStatus())) {
                throw new RuntimeException("Email này đã bị vô hiệu hóa và không thể đăng ký lại");
            }

            throw new RuntimeException("Email already exists");
        }

        String phone = null;

        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            phone = request.getPhone().trim();

            if (userRepository.findByPhone(phone).isPresent()) {
                throw new RuntimeException("Phone number already exists");
            }
        }

        Role driverRole = roleRepository.findByRoleName("DRIVER")
                .orElseThrow(() -> new RuntimeException("Driver role not found"));

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPhone(phone);
        user.setRole(driverRole);
        user.setStatus("ACTIVE");
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(null);
        user.setLastLoginAt(null);
        user.setLastActiveAt(null);

        userRepository.save(user);

        return "Register successfully";
    }

    @PostMapping("/login")
    public AuthResponse login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response
    ) {
        String email = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        validateUserCanAuthenticate(user);

        return completeSuccessfulLogin(user, response);
    }

    /*
     * OLD Google popup/implicit flow.
     *
     * Keep this endpoint for backward compatibility. The new redirect/code flow
     * uses POST /api/auth/google-code below.
     */
    @PostMapping("/google-token")
    public AuthResponse googleLoginWithAccessToken(
            @Valid @RequestBody GoogleAccessTokenRequest request,
            HttpServletResponse response
    ) {
        try {
            String userInfoUrl = "https://www.googleapis.com/oauth2/v3/userinfo";

            RestTemplate restTemplate = new RestTemplate();

            ResponseEntity<Map> googleResponse = restTemplate.exchange(
                    userInfoUrl,
                    org.springframework.http.HttpMethod.GET,
                    new HttpEntity<>(createGoogleAuthHeaders(request.getAccessToken())),
                    Map.class
            );

            Map<String, Object> googleUser = googleResponse.getBody();

            return authenticateGoogleUserAndBuildResponse(googleUser, response, "Google login failed");
        } catch (RuntimeException error) {
            throw error;
        } catch (Exception error) {
            throw new RuntimeException("Google login failed");
        }
    }

    /*
     * NEW Google redirect/auth-code flow.
     *
     * Frontend receives:
     *   /auth/google/callback?code=...
     *
     * Frontend then sends:
     *   POST /api/auth/google-code
     *   { "code": "..." }
     *
     * Backend exchanges the code with Google, reads Google user info,
     * then creates this system's access token + refresh token as HttpOnly cookies.
     */
    @PostMapping("/google-code")
    public AuthResponse googleLoginWithCode(
            @Valid @RequestBody GoogleCodeRequest request,
            HttpServletResponse response
    ) {
        if (request.getCode() == null || request.getCode().isBlank()) {
            throw new RuntimeException("Google authorization code is required");
        }

        validateGoogleCodeConfiguration();

        try {
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders tokenHeaders = new HttpHeaders();
            tokenHeaders.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> tokenBody = new LinkedMultiValueMap<>();
            tokenBody.add("code", request.getCode().trim());
            tokenBody.add("client_id", googleClientId);
            tokenBody.add("client_secret", googleClientSecret);
            tokenBody.add("redirect_uri", googleRedirectUri);
            tokenBody.add("grant_type", "authorization_code");

            ResponseEntity<Map> tokenResponse = restTemplate.postForEntity(
                    "https://oauth2.googleapis.com/token",
                    new HttpEntity<>(tokenBody, tokenHeaders),
                    Map.class
            );

            Map<String, Object> tokenData = tokenResponse.getBody();

            if (tokenData == null || tokenData.get("access_token") == null) {
                throw new RuntimeException("Cannot exchange Google authorization code");
            }

            String googleAccessToken = String.valueOf(tokenData.get("access_token"));

            ResponseEntity<Map> googleResponse = restTemplate.exchange(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    org.springframework.http.HttpMethod.GET,
                    new HttpEntity<>(createGoogleAuthHeaders(googleAccessToken)),
                    Map.class
            );

            Map<String, Object> googleUser = googleResponse.getBody();

            return authenticateGoogleUserAndBuildResponse(
                    googleUser,
                    response,
                    "Google redirect login failed"
            );
        } catch (RuntimeException error) {
            throw error;
        } catch (Exception error) {
            throw new RuntimeException("Google redirect login failed");
        }
    }

    @PostMapping("/refresh-token")
    public AuthResponse refreshToken(
            @CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String refreshTokenFromCookie,
            @RequestBody(required = false) RefreshTokenRequest request,
            HttpServletResponse response
    ) {
        String refreshTokenValue = refreshTokenFromCookie;

        /*
         * Backward compatible:
         * - New frontend uses HttpOnly cookie only.
         * - Old frontend may still send { refreshToken } in body.
         */
        if ((refreshTokenValue == null || refreshTokenValue.isBlank())
                && request != null
                && request.getRefreshToken() != null
                && !request.getRefreshToken().isBlank()) {
            refreshTokenValue = request.getRefreshToken();
        }

        if (refreshTokenValue == null || refreshTokenValue.isBlank()) {
            throw new RuntimeException("Refresh token is required");
        }

        RefreshToken oldRefreshToken = refreshTokenService.verifyRefreshToken(refreshTokenValue);

        User user = oldRefreshToken.getUser();

        validateUserCanAuthenticate(user);

        refreshTokenService.revokeRefreshToken(oldRefreshToken.getToken());

        LocalDateTime now = LocalDateTime.now();

        user.setLastActiveAt(now);
        user.setUpdatedAt(now);
        userRepository.save(user);

        publishUserStatus(user, true);

        String newAccessToken = jwtService.generateAccessToken(user);
        RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user);

        addAuthCookies(response, newAccessToken, newRefreshToken.getToken());

        /*
         * Cookie-only auth:
         * Do not expose tokens in JSON response.
         */
        return buildAuthResponse(user, null, null);
    }

    @PostMapping("/logout")
    public String logout(
            @CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String refreshTokenFromCookie,
            @RequestBody(required = false) LogoutRequest request,
            HttpServletResponse response
    ) {
        String refreshTokenValue = refreshTokenFromCookie;

        /*
         * Backward compatible:
         * - New frontend sends no body.
         * - Old frontend may still send { refreshToken }.
         */
        if ((refreshTokenValue == null || refreshTokenValue.isBlank())
                && request != null
                && request.getRefreshToken() != null
                && !request.getRefreshToken().isBlank()) {
            refreshTokenValue = request.getRefreshToken();
        }

        if (refreshTokenValue != null && !refreshTokenValue.isBlank()) {
            try {
                RefreshToken refreshToken = refreshTokenService.verifyRefreshToken(refreshTokenValue);
                User user = refreshToken.getUser();

                LocalDateTime now = LocalDateTime.now();

                /*
                 * Khi logout:
                 * - lastActiveAt = null để backend hiểu user đã offline.
                 * - updatedAt = now để frontend có mốc thời gian hiển thị:
                 *   Offline · just now / Offline · 2 min ago.
                 */
                user.setLastActiveAt(null);
                user.setUpdatedAt(now);
                userRepository.save(user);

                publishUserStatus(user, false);

                refreshTokenService.revokeRefreshToken(refreshTokenValue);
            } catch (Exception error) {
                refreshTokenService.revokeRefreshToken(refreshTokenValue);
            }
        }

        clearAuthCookies(response);

        return "Logout successfully";
    }

    @GetMapping("/me")
    public AuthResponse getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("Unauthenticated");
        }

        String email = authentication.getName().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        validateUserCanAuthenticate(user);

        return buildAuthResponse(user, null, null);
    }

    @PostMapping("/forgot-password")
    public String forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.forgotPassword(request.getEmail());
        return "OTP has been sent to your email";
    }

    @PostMapping("/reset-password")
    public String resetPassword(@Valid @RequestBody ResetForgotPasswordRequest request) {
        passwordResetService.resetPassword(
                request.getEmail(),
                request.getOtp(),
                request.getNewPassword()
        );

        return "Password has been reset successfully";
    }

    private AuthResponse authenticateGoogleUserAndBuildResponse(
            Map<String, Object> googleUser,
            HttpServletResponse response,
            String defaultErrorMessage
    ) {
        if (googleUser == null) {
            throw new RuntimeException("Cannot get Google account information");
        }

        String email = (String) googleUser.get("email");
        String name = (String) googleUser.get("name");
        Object emailVerifiedValue = googleUser.get("email_verified");

        if (email == null || email.isBlank()) {
            throw new RuntimeException("Google account does not contain an email");
        }

        boolean emailVerified = Boolean.TRUE.equals(emailVerifiedValue)
                || "true".equalsIgnoreCase(String.valueOf(emailVerifiedValue));

        if (!emailVerified) {
            throw new RuntimeException("Google email is not verified");
        }

        try {
            String normalizedEmail = email.trim().toLowerCase();

            User user = userRepository.findByEmail(normalizedEmail)
                    .orElseGet(() -> createGoogleDriverUser(normalizedEmail, name));

            validateUserCanAuthenticate(user);

            return completeSuccessfulLogin(user, response);
        } catch (RuntimeException error) {
            throw error;
        } catch (Exception error) {
            throw new RuntimeException(defaultErrorMessage);
        }
    }

    private AuthResponse completeSuccessfulLogin(User user, HttpServletResponse response) {
        LocalDateTime now = LocalDateTime.now();

        user.setLastLoginAt(now);
        user.setLastActiveAt(now);
        user.setUpdatedAt(now);
        userRepository.save(user);

        publishUserStatus(user, true);

        String accessToken = jwtService.generateAccessToken(user);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        addAuthCookies(response, accessToken, refreshToken.getToken());

        /*
         * Cookie-only auth:
         * Tokens are sent only through HttpOnly cookies.
         * JSON response contains user metadata only.
         */
        return buildAuthResponse(user, null, null);
    }

    private User createGoogleDriverUser(String email, String googleName) {
        Role driverRole = roleRepository.findByRoleName("DRIVER")
                .orElseThrow(() -> new RuntimeException("Driver role not found"));

        LocalDateTime now = LocalDateTime.now();

        String fullName = googleName;

        if (fullName == null || fullName.isBlank()) {
            fullName = email.split("@")[0];
        }

        User user = new User();
        user.setFullName(fullName.trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode("GOOGLE_AUTH_" + System.currentTimeMillis()));
        user.setPhone(null);
        user.setRole(driverRole);
        user.setStatus("ACTIVE");
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        user.setLastLoginAt(null);
        user.setLastActiveAt(null);

        return userRepository.save(user);
    }

    private HttpHeaders createGoogleAuthHeaders(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        return headers;
    }

    private void validateGoogleCodeConfiguration() {
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new RuntimeException("Missing google.client-id configuration");
        }

        if (googleClientSecret == null || googleClientSecret.isBlank()) {
            throw new RuntimeException("Missing google.client-secret configuration");
        }

        if (googleRedirectUri == null || googleRedirectUri.isBlank()) {
            throw new RuntimeException("Missing google.redirect-uri configuration");
        }
    }

    private void addAuthCookies(
            HttpServletResponse response,
            String accessToken,
            String refreshToken
    ) {
        ResponseCookie accessTokenCookie = ResponseCookie.from(ACCESS_TOKEN_COOKIE, accessToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(Duration.ofMinutes(15))
                .build();

        ResponseCookie refreshTokenCookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, refreshToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/api/auth")
                .maxAge(Duration.ofDays(7))
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, accessTokenCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString());
    }

    private void clearAuthCookies(HttpServletResponse response) {
        ResponseCookie accessTokenCookie = ResponseCookie.from(ACCESS_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(0)
                .build();

        ResponseCookie refreshTokenCookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path("/api/auth")
                .maxAge(0)
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, accessTokenCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString());
    }

    private void validateUserCanAuthenticate(User user) {
        if ("BANNED".equalsIgnoreCase(user.getStatus())) {
            throw new AccountBannedException("Tài khoản của bạn đã bị khóa");
        }

        if ("INACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new RuntimeException("Tài khoản của bạn chưa được kích hoạt");
        }

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new RuntimeException("Tài khoản không thể đăng nhập với trạng thái hiện tại");
        }
    }

    private AuthResponse buildAuthResponse(
            User user,
            String accessToken,
            String refreshToken
    ) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().getRoleName())
                .build();
    }

    private void publishUserStatus(User user, boolean online) {
        userStatusEventService.publishUserStatus(
                UserStatusEvent.builder()
                        .userId(user.getId())
                        .status(user.getStatus())
                        .online(online)
                        .lastLoginAt(user.getLastLoginAt())
                        .lastActiveAt(user.getLastActiveAt())
                        .updatedAt(user.getUpdatedAt())
                        .build()
        );
    }
}