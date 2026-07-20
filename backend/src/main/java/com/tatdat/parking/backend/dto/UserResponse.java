package com.tatdat.parking.backend.dto;

import com.tatdat.parking.backend.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private Integer id;

    private String fullName;

    private String email;

    private String phone;

    private String status;

    private Integer roleId;

    private String roleName;

    private Instant createdAt;

    private Instant updatedAt;

    private Instant lastLoginAt;

    private Instant lastActiveAt;

    private Boolean online;

    public static UserResponse fromEntity(
            User user,
            boolean online
    ) {
        if (user == null) {
            return null;
        }

        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .status(user.getStatus())
                .roleId(
                        user.getRole() != null
                                ? user.getRole().getId()
                                : null
                )
                .roleName(
                        user.getRole() != null
                                ? user.getRole().getRoleName()
                                : null
                )
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .lastActiveAt(user.getLastActiveAt())
                .online(online)
                .build();
    }
}