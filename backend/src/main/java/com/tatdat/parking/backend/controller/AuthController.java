package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.AuthResponse;
import com.tatdat.parking.backend.dto.ForgotPasswordRequest;
import com.tatdat.parking.backend.dto.LoginRequest;
import com.tatdat.parking.backend.dto.LogoutRequest;
import com.tatdat.parking.backend.dto.RefreshTokenRequest;
import com.tatdat.parking.backend.dto.RegisterRequest;
import com.tatdat.parking.backend.dto.ResetForgotPasswordRequest;
import com.tatdat.parking.backend.entity.RefreshToken;
import com.tatdat.parking.backend.entity.Role;
import com.tatdat.parking.backend.entity.User;
import com.tatdat.parking.backend.exception.AccountBannedException;
import com.tatdat.parking.backend.repository.RoleRepository;
import com.tatdat.parking.backend.repository.UserRepository;
import com.tatdat.parking.backend.security.JwtService;
import com.tatdat.parking.backend.security.RefreshTokenService;
import com.tatdat.parking.backend.service.PasswordResetService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;

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

        LocalDateTime now = LocalDateTime.now();

        user.setLastLoginAt(now);
        user.setLastActiveAt(now);
        user.setUpdatedAt(now);
        userRepository.save(user);

        String accessToken = jwtService.generateAccessToken(user);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        addAuthCookies(response, accessToken, refreshToken.getToken());

        return buildAuthResponse(user, accessToken, refreshToken.getToken());
    }

    @PostMapping("/refresh-token")
    public AuthResponse refreshToken(
            @CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String refreshTokenFromCookie,
            @RequestBody(required = false) RefreshTokenRequest request,
            HttpServletResponse response
    ) {
        String refreshTokenValue = refreshTokenFromCookie;

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

        String newAccessToken = jwtService.generateAccessToken(user);
        RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user);

        addAuthCookies(response, newAccessToken, newRefreshToken.getToken());

        return buildAuthResponse(user, newAccessToken, newRefreshToken.getToken());
    }

    @PostMapping("/logout")
    public String logout(
            @CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String refreshTokenFromCookie,
            @RequestBody(required = false) LogoutRequest request,
            HttpServletResponse response
    ) {
        String refreshTokenValue = refreshTokenFromCookie;

        if ((refreshTokenValue == null || refreshTokenValue.isBlank())
                && request != null
                && request.getRefreshToken() != null
                && !request.getRefreshToken().isBlank()) {
            refreshTokenValue = request.getRefreshToken();
        }

        if (refreshTokenValue != null && !refreshTokenValue.isBlank()) {
            refreshTokenService.revokeRefreshToken(refreshTokenValue);
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

    private void addAuthCookies(
            HttpServletResponse response,
            String accessToken,
            String refreshToken
    ) {
        ResponseCookie accessTokenCookie = ResponseCookie.from(ACCESS_TOKEN_COOKIE, accessToken)
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofMinutes(15))
                .build();

        ResponseCookie refreshTokenCookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, refreshToken)
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(Duration.ofDays(7))
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, accessTokenCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString());
    }

    private void clearAuthCookies(HttpServletResponse response) {
        ResponseCookie accessTokenCookie = ResponseCookie.from(ACCESS_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();

        ResponseCookie refreshTokenCookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
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
}