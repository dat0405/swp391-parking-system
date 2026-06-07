package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.ResetPasswordRequest;
import com.tatdat.parking.backend.dto.UpdateUserRequest;
import com.tatdat.parking.backend.dto.UpdateUserRoleRequest;
import com.tatdat.parking.backend.dto.UpdateUserStatusRequest;
import com.tatdat.parking.backend.dto.UserResponse;
import com.tatdat.parking.backend.entity.Role;
import com.tatdat.parking.backend.entity.User;
import com.tatdat.parking.backend.repository.RoleRepository;
import com.tatdat.parking.backend.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import com.tatdat.parking.backend.dto.CreateUserRequest;

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

    @GetMapping
    public List<UserResponse> getAllUsers() {
        return userRepository.findAllByOrderByIdDesc()
                .stream()
                .map(this::mapToUserResponse)
                .toList();
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

        User user = new User();
        user.setFullName(request.getFullName().trim());
        user.setEmail(email);
        user.setPhone(phone);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setStatus("ACTIVE");
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(null);
        user.setLastLoginAt(null);
        user.setLastActiveAt(null);

        User savedUser = userRepository.save(user);

        return mapToUserResponse(savedUser);
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

        return mapToUserResponse(savedUser);
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

        return mapToUserResponse(savedUser);
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

        User savedUser = userRepository.save(user);

        return mapToUserResponse(savedUser);
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

        return mapToUserResponse(savedUser);
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

        long minutes = Duration.between(lastActiveAt, LocalDateTime.now()).toMinutes();

        return minutes <= 5;
    }
}