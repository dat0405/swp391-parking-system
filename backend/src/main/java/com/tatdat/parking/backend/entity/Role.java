package com.tatdat.parking.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Locale;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Role {

    /*
     * Các role chính thức trong hệ thống.
     *
     * DRIVER chính là người dùng thông thường.
     * Không có role USER riêng.
     */
    public static final String SYSTEM_ADMIN =
            "SYSTEM_ADMIN";

    public static final String PARKING_MANAGER =
            "PARKING_MANAGER";

    public static final String PARKING_STAFF =
            "PARKING_STAFF";

    public static final String DRIVER =
            "DRIVER";

    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    private Integer id;

    @Column(
            name = "role_name",
            nullable = false,
            unique = true,
            length = 50
    )
    private String roleName;

    /**
     * Chuẩn hóa role trước khi thêm vào database.
     */
    @PrePersist
    public void prePersist() {
        normalizeRoleName();
    }

    /**
     * Chuẩn hóa role trước khi cập nhật database.
     */
    @PreUpdate
    public void preUpdate() {
        normalizeRoleName();
    }

    private void normalizeRoleName() {
        if (
                roleName == null ||
                        roleName.isBlank()
        ) {
            throw new IllegalStateException(
                    "Role name is required"
            );
        }

        roleName = roleName
                .trim()
                .toUpperCase(Locale.ROOT);

        /*
         * Hỗ trợ trường hợp role bị lưu dạng:
         * ROLE_SYSTEM_ADMIN
         *
         * Sau khi chuẩn hóa sẽ thành:
         * SYSTEM_ADMIN
         */
        if (roleName.startsWith("ROLE_")) {
            roleName = roleName.substring(5);
        }

        if (!isSupportedRole(roleName)) {
            throw new IllegalStateException(
                    "Unsupported role: " + roleName
            );
        }
    }

    private boolean isSupportedRole(
            String value
    ) {
        return SYSTEM_ADMIN.equals(value)
                || PARKING_MANAGER.equals(value)
                || PARKING_STAFF.equals(value)
                || DRIVER.equals(value);
    }
}