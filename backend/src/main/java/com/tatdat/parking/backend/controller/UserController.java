package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.CreateUserRequest;
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
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    /*
     * SSE đã được loại bỏ để tránh giữ kết nối dài hạn.
     *
     * Trạng thái online/offline vẫn được xác định từ lastActiveAt.
     * Frontend sẽ tải lại danh sách user theo chu kỳ polling.
     */

    /**
     * User được xem là online nếu heartbeat gần nhất
     * không quá 90 giây.
     */
    private static final long ONLINE_TIMEOUT_SECONDS = 90;

    private static final String STATUS_ACTIVE =
            "ACTIVE";

    private static final String STATUS_INACTIVE =
            "INACTIVE";

    private static final String STATUS_BANNED =
            "BANNED";

    private static final String ROLE_SYSTEM_ADMIN =
            "SYSTEM_ADMIN";

    /**
     * Các role chính thức trong hệ thống.
     *
     * DRIVER chính là người dùng thông thường.
     * Không tồn tại role USER.
     */
    private static final Set<String> SUPPORTED_ROLES =
            Set.of(
                    ROLE_SYSTEM_ADMIN,
                    "PARKING_MANAGER",
                    "PARKING_STAFF",
                    "DRIVER"
            );

    private static final Set<String> SUPPORTED_STATUSES =
            Set.of(
                    STATUS_ACTIVE,
                    STATUS_INACTIVE,
                    STATUS_BANNED
            );

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Lấy danh sách tất cả tài khoản.
     *
     * Chỉ SYSTEM_ADMIN được truy cập theo SecurityConfig.
     */
    @GetMapping
    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository
                .findAllByOrderByIdDesc()
                .stream()
                .map(this::mapToUserResponse)
                .toList();
    }

    /**
     * Cập nhật heartbeat của chính tài khoản đang đăng nhập.
     *
     * Đây là một trong các nghiệp vụ được phép
     * thay đổi lastActiveAt.
     */
    @PutMapping("/me/heartbeat")
    @Transactional
    public UserResponse heartbeat() {
        User currentUser =
                getCurrentUser();

        validateUserIsActive(
                currentUser
        );

        Instant now =
                Instant.now();

        currentUser.setLastActiveAt(
                now
        );

        currentUser.setUpdatedAt(
                now
        );

        User savedUser =
                userRepository.save(
                        currentUser
                );

        return mapToUserResponse(
                savedUser
        );
    }

    /**
     * Đánh dấu chính tài khoản đang đăng nhập là offline.
     *
     * lastActiveAt được xóa để trạng thái online
     * chuyển thành false ngay lập tức.
     */
    @PutMapping("/me/offline")
    @Transactional
    public UserResponse offline() {
        User currentUser =
                getCurrentUser();

        currentUser.setLastActiveAt(
                null
        );

        currentUser.setUpdatedAt(
                Instant.now()
        );

        User savedUser =
                userRepository.save(
                        currentUser
                );

        return mapToUserResponse(
                savedUser
        );
    }

    /**
     * Lấy user theo ID.
     */
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public UserResponse getUserById(
            @PathVariable Integer id
    ) {
        validateUserId(id);

        User user =
                findUserById(id);

        return mapToUserResponse(user);
    }

    /**
     * System Admin tạo tài khoản mới.
     */
    @PostMapping
    @Transactional
    public UserResponse createUser(
            @Valid @RequestBody
            CreateUserRequest request
    ) {
        validateCreateUserRequest(
                request
        );

        String email =
                normalizeEmail(
                        request.getEmail()
                );

        if (
                userRepository.existsByEmail(
                        email
                )
        ) {
            throw new RuntimeException(
                    "Email already exists"
            );
        }

        String phone =
                normalizeOptionalText(
                        request.getPhone()
                );

        if (
                phone != null
                        && userRepository
                        .existsByPhone(phone)
        ) {
            throw new RuntimeException(
                    "Phone already exists"
            );
        }

        Role role =
                findAndValidateRole(
                        request.getRoleId()
                );

        Instant now =
                Instant.now();

        User user =
                new User();

        user.setFullName(
                request.getFullName()
                        .trim()
        );

        user.setEmail(email);
        user.setPhone(phone);

        user.setPassword(
                passwordEncoder.encode(
                        request.getPassword()
                )
        );

        user.setRole(role);
        user.setStatus(STATUS_ACTIVE);
        user.setCreatedAt(now);
        user.setUpdatedAt(now);

        /*
         * Tài khoản mới chưa đăng nhập,
         * vì vậy chưa có thời gian hoạt động.
         */
        user.setLastLoginAt(null);
        user.setLastActiveAt(null);

        User savedUser =
                userRepository.save(user);

        return mapToUserResponse(
                savedUser
        );
    }

    /**
     * Cập nhật thông tin cơ bản của user.
     *
     * Không thay đổi:
     * - lastLoginAt
     * - lastActiveAt
     * - trạng thái online/offline
     */
    @PutMapping("/{id}")
    @Transactional
    public UserResponse updateUser(
            @PathVariable Integer id,
            @Valid @RequestBody
            UpdateUserRequest request
    ) {
        validateUserId(id);

        if (request == null) {
            throw new RuntimeException(
                    "Update user request is required"
            );
        }

        User user =
                findUserById(id);

        if (
                request.getFullName() != null
                        && !request
                        .getFullName()
                        .isBlank()
        ) {
            user.setFullName(
                    request.getFullName()
                            .trim()
            );
        }

        if (
                request.getEmail() != null
                        && !request
                        .getEmail()
                        .isBlank()
        ) {
            String email =
                    normalizeEmail(
                            request.getEmail()
                    );

            userRepository
                    .findByEmail(email)
                    .ifPresent(
                            existingUser -> {
                                if (
                                        !existingUser
                                                .getId()
                                                .equals(id)
                                ) {
                                    throw new RuntimeException(
                                            "Email already exists"
                                    );
                                }
                            }
                    );

            user.setEmail(email);
        }

        /*
         * Chuỗi rỗng nghĩa là xóa số điện thoại.
         */
        if (request.getPhone() != null) {
            String phone =
                    normalizeOptionalText(
                            request.getPhone()
                    );

            if (phone != null) {
                userRepository
                        .findByPhone(phone)
                        .ifPresent(
                                existingUser -> {
                                    if (
                                            !existingUser
                                                    .getId()
                                                    .equals(id)
                                    ) {
                                        throw new RuntimeException(
                                                "Phone already exists"
                                        );
                                    }
                                }
                        );
            }

            user.setPhone(phone);
        }

        /*
         * updatedAt chỉ là thời gian sửa dữ liệu.
         * Không được dùng để tính trạng thái hoạt động.
         */
        user.setUpdatedAt(
                Instant.now()
        );

        User savedUser =
                userRepository.save(user);

        /*
         * Chỉnh sửa thông tin không thay đổi lastActiveAt
         * và không làm thay đổi trạng thái online/offline.
         */
        return mapToUserResponse(
                savedUser
        );
    }

    /**
     * Cập nhật role của tài khoản.
     *
     * Việc đổi role không được thay đổi:
     * - lastLoginAt
     * - lastActiveAt
     * - trạng thái online/offline hiện tại
     */
    @PutMapping("/{id}/role")
    @Transactional
    public UserResponse updateUserRole(
            @PathVariable Integer id,
            @Valid @RequestBody
            UpdateUserRoleRequest request
    ) {
        validateUserId(id);

        if (
                request == null
                        || request.getRoleId()
                        == null
        ) {
            throw new RuntimeException(
                    "Role is required"
            );
        }

        User currentUser =
                getCurrentUser();

        User targetUser =
                findUserById(id);

        String currentUserRole =
                normalizeRoleName(
                        currentUser.getRole()
                );

        String targetCurrentRole =
                normalizeRoleName(
                        targetUser.getRole()
                );

        if (
                !ROLE_SYSTEM_ADMIN.equals(
                        currentUserRole
                )
        ) {
            throw new RuntimeException(
                    "Only System Admin can change user roles"
            );
        }

        /**
         * Admin không được tự đổi role.
         */
        if (
                currentUser.getId()
                        .equals(
                                targetUser.getId()
                        )
        ) {
            throw new RuntimeException(
                    "You cannot change your own administrator role"
            );
        }

        /**
         * Admin không được thay đổi role của Admin khác.
         */
        if (
                ROLE_SYSTEM_ADMIN.equals(
                        targetCurrentRole
                )
        ) {
            throw new RuntimeException(
                    "You cannot change another administrator's role"
            );
        }

        Role newRole =
                findAndValidateRole(
                        request.getRoleId()
                );

        String newRoleName =
                normalizeRoleName(
                        newRole
                );

        if (
                newRoleName.equals(
                        targetCurrentRole
                )
        ) {
            return mapToUserResponse(
                    targetUser
            );
        }

        /*
         * Chỉ thay đổi role.
         *
         * Tuyệt đối không xóa lastActiveAt và không
         * cưỡng chế trạng thái offline.
         */
        targetUser.setRole(
                newRole
        );

        targetUser.setUpdatedAt(
                Instant.now()
        );

        User savedUser =
                userRepository.save(
                        targetUser
                );

        /*
         * Đổi role không phải là sự kiện hoạt động.
         *
         * Không thay đổi lastActiveAt. Nếu heartbeat của user
         * dừng, trạng thái sẽ tự chuyển offline sau timeout.
         */
        return mapToUserResponse(
                savedUser
        );
    }

    /**
     * Cập nhật trạng thái nghiệp vụ của tài khoản:
     *
     * - ACTIVE
     * - INACTIVE
     * - BANNED
     */
    @PutMapping("/{id}/status")
    @Transactional
    public UserResponse updateUserStatus(
            @PathVariable Integer id,
            @Valid @RequestBody
            UpdateUserStatusRequest request
    ) {
        validateUserId(id);

        if (
                request == null
                        || request.getStatus()
                        == null
                        || request.getStatus()
                        .isBlank()
        ) {
            throw new RuntimeException(
                    "Status is required"
            );
        }

        User targetUser =
                findUserById(id);

        String status =
                normalizeStatus(
                        request.getStatus()
                );

        if (
                !SUPPORTED_STATUSES.contains(
                        status
                )
        ) {
            throw new RuntimeException(
                    "Invalid status"
            );
        }

        User currentUser =
                getCurrentUser();

        if (
                currentUser.getId()
                        .equals(id)
                        && (
                        STATUS_BANNED.equals(status)
                                || STATUS_INACTIVE.equals(
                                status
                        )
                )
        ) {
            throw new RuntimeException(
                    "You cannot disable your own account"
            );
        }

        targetUser.setStatus(status);

        targetUser.setUpdatedAt(
                Instant.now()
        );

        /*
         * Tài khoản bị khóa hoặc vô hiệu hóa
         * phải được chuyển offline ngay.
         */
        if (
                STATUS_BANNED.equals(status)
                        || STATUS_INACTIVE.equals(
                        status
                )
        ) {
            targetUser.setLastActiveAt(
                    null
            );
        }

        User savedUser =
                userRepository.save(
                        targetUser
                );

        return mapToUserResponse(
                savedUser
        );
    }

    /**
     * System Admin đặt lại mật khẩu.
     *
     * Reset mật khẩu không được tự động thay đổi
     * thời gian hoạt động của tài khoản.
     */
    @PutMapping("/{id}/reset-password")
    @Transactional
    public UserResponse resetPassword(
            @PathVariable Integer id,
            @Valid @RequestBody
            ResetPasswordRequest request
    ) {
        validateUserId(id);

        if (
                request == null
                        || request.getNewPassword()
                        == null
                        || request.getNewPassword()
                        .isBlank()
        ) {
            throw new RuntimeException(
                    "New password is required"
            );
        }

        User user =
                findUserById(id);

        user.setPassword(
                passwordEncoder.encode(
                        request.getNewPassword()
                )
        );

        user.setUpdatedAt(
                Instant.now()
        );

        User savedUser =
                userRepository.save(user);

        /*
         * Không xóa lastActiveAt và không làm thay đổi
         * trạng thái online/offline hiện tại.
         */
        return mapToUserResponse(
                savedUser
        );
    }

    /**
     * Lấy user hiện tại từ Security Context.
     */
    private User getCurrentUser() {
        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (
                authentication == null
                        || !authentication
                        .isAuthenticated()
                        || authentication
                        instanceof AnonymousAuthenticationToken
        ) {
            throw new RuntimeException(
                    "Current user not found"
            );
        }

        Object principal =
                authentication.getPrincipal();

        String email = null;

        if (principal instanceof User currentUser) {
            return currentUser;
        }

        if (
                principal instanceof
                        UserDetails userDetails
        ) {
            email =
                    userDetails.getUsername();
        } else if (
                principal instanceof
                        String principalString
        ) {
            email =
                    principalString;
        }

        if (
                email == null
                        || email.isBlank()
                        || "anonymousUser"
                        .equalsIgnoreCase(email)
        ) {
            email =
                    authentication.getName();
        }

        if (
                email == null
                        || email.isBlank()
                        || "anonymousUser"
                        .equalsIgnoreCase(email)
        ) {
            throw new RuntimeException(
                    "Current user not found"
            );
        }

        return userRepository
                .findByEmail(
                        normalizeEmail(email)
                )
                .orElseThrow(
                        () -> new RuntimeException(
                                "Current user not found"
                        )
                );
    }

    /**
     * Chuyển User entity thành response.
     */
    private UserResponse mapToUserResponse(
            User user
    ) {
        if (user == null) {
            throw new RuntimeException(
                    "User cannot be null"
            );
        }

        Integer roleId = null;
        String roleName = null;

        if (user.getRole() != null) {
            roleId =
                    user.getRole().getId();

            roleName =
                    normalizeRoleName(
                            user.getRole()
                    );
        }

        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .status(
                        normalizeStatus(
                                user.getStatus()
                        )
                )
                .roleId(roleId)
                .roleName(roleName)
                .createdAt(
                        user.getCreatedAt()
                )
                .updatedAt(
                        user.getUpdatedAt()
                )
                .lastLoginAt(
                        user.getLastLoginAt()
                )
                .lastActiveAt(
                        user.getLastActiveAt()
                )
                .online(
                        isUserOnline(user)
                )
                .build();
    }

    /**
     * User chỉ được xem là online khi:
     *
     * - status là ACTIVE;
     * - lastActiveAt khác null;
     * - heartbeat không quá 90 giây.
     */
    private boolean isUserOnline(
            User user
    ) {
        if (user == null) {
            return false;
        }

        if (
                !STATUS_ACTIVE.equals(
                        normalizeStatus(
                                user.getStatus()
                        )
                )
        ) {
            return false;
        }

        return isOnline(
                user.getLastActiveAt()
        );
    }

    private boolean isOnline(
            Instant lastActiveAt
    ) {
        if (lastActiveAt == null) {
            return false;
        }

        long seconds =
                Duration.between(
                                lastActiveAt,
                                Instant.now()
                        )
                        .getSeconds();

        return seconds >= 0
                && seconds
                <= ONLINE_TIMEOUT_SECONDS;
    }

    private User findUserById(
            Integer id
    ) {
        return userRepository
                .findById(id)
                .orElseThrow(
                        () -> new RuntimeException(
                                "User not found"
                        )
                );
    }

    private Role findAndValidateRole(
            Integer roleId
    ) {
        if (roleId == null) {
            throw new RuntimeException(
                    "Role is required"
            );
        }

        Role role =
                roleRepository
                        .findById(roleId)
                        .orElseThrow(
                                () ->
                                        new RuntimeException(
                                                "Role not found"
                                        )
                        );

        String roleName =
                normalizeRoleName(role);

        if (
                !SUPPORTED_ROLES.contains(
                        roleName
                )
        ) {
            throw new RuntimeException(
                    "Role is not supported"
            );
        }

        return role;
    }

    private void validateCreateUserRequest(
            CreateUserRequest request
    ) {
        if (request == null) {
            throw new RuntimeException(
                    "Create user request is required"
            );
        }

        if (
                request.getFullName() == null
                        || request.getFullName()
                        .isBlank()
        ) {
            throw new RuntimeException(
                    "Full name is required"
            );
        }

        if (
                request.getEmail() == null
                        || request.getEmail()
                        .isBlank()
        ) {
            throw new RuntimeException(
                    "Email is required"
            );
        }

        if (
                request.getPassword() == null
                        || request.getPassword()
                        .isBlank()
        ) {
            throw new RuntimeException(
                    "Password is required"
            );
        }

        if (
                request.getRoleId()
                        == null
        ) {
            throw new RuntimeException(
                    "Role is required"
            );
        }
    }

    private void validateUserId(
            Integer id
    ) {
        if (
                id == null
                        || id <= 0
        ) {
            throw new RuntimeException(
                    "Invalid user ID"
            );
        }
    }

    private void validateUserIsActive(
            User user
    ) {
        if (user == null) {
            throw new RuntimeException(
                    "Current user not found"
            );
        }

        if (
                !STATUS_ACTIVE.equals(
                        normalizeStatus(
                                user.getStatus()
                        )
                )
        ) {
            throw new RuntimeException(
                    "User account is not active"
            );
        }
    }

    private String normalizeEmail(
            String email
    ) {
        if (
                email == null
                        || email.isBlank()
        ) {
            throw new RuntimeException(
                    "Email is required"
            );
        }

        return email
                .trim()
                .toLowerCase(
                        Locale.ROOT
                );
    }

    private String normalizeStatus(
            String status
    ) {
        if (
                status == null
                        || status.isBlank()
        ) {
            return "";
        }

        return status
                .trim()
                .toUpperCase(
                        Locale.ROOT
                );
    }

    /**
     * Ví dụ:
     *
     * ROLE_PARKING_STAFF -> PARKING_STAFF
     */
    private String normalizeRoleName(
            Role role
    ) {
        if (
                role == null
                        || role.getRoleName()
                        == null
                        || role.getRoleName()
                        .isBlank()
        ) {
            throw new RuntimeException(
                    "Role name is missing"
            );
        }

        String roleName =
                role.getRoleName()
                        .trim()
                        .toUpperCase(
                                Locale.ROOT
                        );

        if (
                roleName.startsWith(
                        "ROLE_"
                )
        ) {
            roleName =
                    roleName.substring(5);
        }

        if (roleName.isBlank()) {
            throw new RuntimeException(
                    "Role name is invalid"
            );
        }

        return roleName;
    }

    private String normalizeOptionalText(
            String value
    ) {
        if (
                value == null
                        || value.isBlank()
        ) {
            return null;
        }

        return value.trim();
    }
}