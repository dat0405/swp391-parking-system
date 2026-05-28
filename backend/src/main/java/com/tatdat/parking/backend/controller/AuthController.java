package com.tatdat.parking.backend.controller;


import com.tatdat.parking.backend.dto.AuthResponse;
import com.tatdat.parking.backend.dto.LoginRequest;
import com.tatdat.parking.backend.dto.LogoutRequest;
import com.tatdat.parking.backend.dto.RefreshTokenRequest;
import com.tatdat.parking.backend.dto.RegisterRequest;
import com.tatdat.parking.backend.entity.RefreshToken;
import com.tatdat.parking.backend.entity.Role;
import com.tatdat.parking.backend.entity.User;
import com.tatdat.parking.backend.exception.AccountBannedException;
import com.tatdat.parking.backend.repository.RoleRepository;
import com.tatdat.parking.backend.repository.UserRepository;
import com.tatdat.parking.backend.security.JwtService;
import com.tatdat.parking.backend.security.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    @PostMapping("/register")
    public String register(@RequestBody RegisterRequest request) {

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            return "Email already exists";
        }

        Role driverRole = roleRepository.findByRoleName("DRIVER")
                .orElseThrow(() -> new RuntimeException("Driver role not found"));

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setPhone(request.getPhone());
        user.setRole(driverRole);
        user.setStatus("ACTIVE");
        user.setCreatedAt(LocalDateTime.now());

        userRepository.save(user);

        return "Register successfully";
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        if ("BANNED".equals(user.getStatus())) {
            throw new AccountBannedException("Tài khoản của bạn đã bị khóa");
        }

        if ("INACTIVE".equals(user.getStatus())) {
            throw new RuntimeException("Tài khoản của bạn chưa được kích hoạt");
        }

        if (!"ACTIVE".equals(user.getStatus())) {
            throw new RuntimeException("Tài khoản không thể đăng nhập với trạng thái hiện tại");
        }

        String accessToken = jwtService.generateAccessToken(user);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().getRoleName())
                .build();
    }

    @PostMapping("/refresh-token")
    public AuthResponse refreshToken(@RequestBody RefreshTokenRequest request) {

        RefreshToken oldRefreshToken = refreshTokenService.verifyRefreshToken(request.getRefreshToken());

        User user = oldRefreshToken.getUser();

        refreshTokenService.revokeRefreshToken(oldRefreshToken.getToken());

        String newAccessToken = jwtService.generateAccessToken(user);
        RefreshToken newRefreshToken = refreshTokenService.createRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken.getToken())
                .userId(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole().getRoleName())
                .build();
    }

    @PostMapping("/logout")
    public String logout(@RequestBody LogoutRequest request) {
        refreshTokenService.revokeRefreshToken(request.getRefreshToken());
        return "Logout successfully";
    }
}