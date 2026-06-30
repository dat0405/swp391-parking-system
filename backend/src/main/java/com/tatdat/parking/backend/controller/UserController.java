package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.CreateUserRequest;
import com.tatdat.parking.backend.dto.ResetPasswordRequest;
import com.tatdat.parking.backend.dto.UpdateUserRequest;
import com.tatdat.parking.backend.dto.UpdateUserRoleRequest;
import com.tatdat.parking.backend.dto.UpdateUserStatusRequest;
import com.tatdat.parking.backend.dto.UserResponse;
import com.tatdat.parking.backend.dto.UserStatusEvent;
import com.tatdat.parking.backend.entity.Role;
import com.tatdat.parking.backend.entity.User;
import com.tatdat.parking.backend.repository.RoleRepository;
import com.tatdat.parking.backend.repository.UserRepository;
import com.tatdat.parking.backend.service.UserStatusEventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserStatusEventService userStatusEventService;

    @GetMapping
    public List<UserResponse> getAllUsers() {
        return userRepository.findAllByOrderByIdDesc()
                .stream()
                .map(this::mapToUserResponse)
                .toList();
    }

    @GetMapping("/status-stream")
    public SseEmitter streamUserStatus() {
        return userStatusEventService.subscribe();
    }

    @PutMapping("/me/heartbeat")
    public UserResponse heartbeat() {
        User currentUser = getCurrentUser();

        LocalDateTime now = LocalDateTime.now();

        currentUser.setLastActiveAt(now);
        currentUser.setUpdatedAt(now);

        User savedUser = userRepository.save(currentUser);
        UserResponse response = mapToUserResponse(savedUser);

        publishUserStatus(savedUser, true);

        return response;
    }

    @PutMapping("/me/offline")
    public UserResponse offline() {
        User currentUser = getCurrentUser();

        LocalDateTime now = LocalDateTime.now();

        /*
         * lastActiveAt phải để null để backend hiểu user đã offline.
         * updatedAt lưu thời điểm user vừa offline để frontend hiện:
         * Offline · just now / Offline · 2 min ago
         */
        currentUser.setLastActiveAt(null);
        currentUser.setUpdatedAt(now);

        User savedUser = userRepository.save(currentUser);
        UserResponse response = mapToUserResponse(savedUser);

        publishUserStatus(savedUser, false);

        return response;
    }

    @GetMapping("/{id}")
    public UserResponse getUserById(@PathVariable Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return mapToUserResponse(user);
    }

    @PostMapping
    public UserResponse createUser(@Valid @RequestBody CreateUserRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already exists");
        }

        String phone = null;

        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            phone = request.getPhone().trim();

            if (userRepository.existsByPhone(phone)) {
                throw new RuntimeException("Phone already exists");
            }
        }

        Role role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found"));

        LocalDateTime now = LocalDateTime.now();

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(email);
        user.setPhone(phone);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setStatus("ACTIVE");
        user.setCreatedAt(now);
        user.setUpdatedAt(now);
        user.setLastLoginAt(null);
        user.setLastActiveAt(null);

        User savedUser = userRepository.save(user);
        UserResponse response = mapToUserResponse(savedUser);

        publishUserStatus(savedUser, false);

        return response;
    }

    @PutMapping("/{id}")
    public UserResponse updateUser(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            user.setFullName(request.getFullName().trim());
        }

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String email = request.getEmail().trim().toLowerCase();

            userRepository.findByEmail(email)
                    .ifPresent(existingUser -> {
                        if (!existingUser.getId().equals(id)) {
                            throw new RuntimeException("Email already exists");
                        }
                    });

            user.setEmail(email);
        }

        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            String phone = request.getPhone().trim();

            userRepository.findByPhone(phone)
                    .ifPresent(existingUser -> {
                        if (!existingUser.getId().equals(id)) {
                            throw new RuntimeException("Phone already exists");
                        }
                    });

            user.setPhone(phone);
        }

        user.setUpdatedAt(LocalDateTime.now());

        User savedUser = userRepository.save(user);
        UserResponse response = mapToUserResponse(savedUser);

        publishUserStatus(savedUser, isOnline(savedUser.getLastActiveAt()));

        return response;
    }

    @PutMapping("/{id}/role")
    public UserResponse updateUserRole(
            @PathVariable Integer id,
            @RequestBody UpdateUserRoleRequest request
    ) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getRoleId() == null) {
            throw new RuntimeException("Role is required");
        }

        Role role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found"));

        user.setRole(role);
        user.setUpdatedAt(LocalDateTime.now());

        User savedUser = userRepository.save(user);
        UserResponse response = mapToUserResponse(savedUser);

        publishUserStatus(savedUser, isOnline(savedUser.getLastActiveAt()));

        return response;
    }

    @PutMapping("/{id}/status")
    public UserResponse updateUserStatus(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String status = request.getStatus();

        if (!"ACTIVE".equals(status)
                && !"INACTIVE".equals(status)
                && !"BANNED".equals(status)) {
            throw new RuntimeException("Invalid status");
        }

        User currentUser = getCurrentUser();

        if (currentUser.getId().equals(id)
                && ("BANNED".equals(status) || "INACTIVE".equals(status))) {
            throw new RuntimeException("You cannot disable your own account");
        }

        user.setStatus(status);
        user.setUpdatedAt(LocalDateTime.now());

        /*
         * Nếu khóa tài khoản thì tài khoản không còn online.
         * Với Locked, frontend chỉ cần hiện Locked, không cần Offline · x min ago.
         */
        if ("BANNED".equals(status) || "INACTIVE".equals(status)) {
            user.setLastActiveAt(null);
        }

        User savedUser = userRepository.save(user);
        UserResponse response = mapToUserResponse(savedUser);

        publishUserStatus(savedUser, isOnline(savedUser.getLastActiveAt()));

        return response;
    }

    @PutMapping("/{id}/reset-password")
    public UserResponse resetPassword(
            @PathVariable Integer id,
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            throw new RuntimeException("New password is required");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setUpdatedAt(LocalDateTime.now());

        User savedUser = userRepository.save(user);
        UserResponse response = mapToUserResponse(savedUser);

        publishUserStatus(savedUser, isOnline(savedUser.getLastActiveAt()));

        return response;
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getPrincipal() == null) {
            throw new RuntimeException("Current user not found");
        }

        Object principal = authentication.getPrincipal();

        String email = null;

        if (principal instanceof User currentUser) {
            return currentUser;
        }

        if (principal instanceof UserDetails userDetails) {
            email = userDetails.getUsername();
        }

        if (principal instanceof String principalString) {
            email = principalString;
        }

        if (email == null || email.isBlank() || "anonymousUser".equals(email)) {
            email = authentication.getName();
        }

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Current user not found"));
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .status(user.getStatus())
                .roleId(user.getRole().getId())
                .roleName(user.getRole().getRoleName())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .lastActiveAt(user.getLastActiveAt())
                .online(isOnline(user.getLastActiveAt()))
                .build();
    }

    private boolean isOnline(LocalDateTime lastActiveAt) {
        if (lastActiveAt == null) {
            return false;
        }

        long seconds = Duration.between(lastActiveAt, LocalDateTime.now()).getSeconds();

        return seconds >= 0 && seconds <= 90;
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