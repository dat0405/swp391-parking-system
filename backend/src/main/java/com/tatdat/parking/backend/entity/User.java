package com.tatdat.parking.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.Locale;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User {

    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_INACTIVE = "INACTIVE";
    public static final String STATUS_BANNED = "BANNED";

    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    private Integer id;

    @Column(
            name = "full_name",
            nullable = false,
            length = 100
    )
    private String fullName;

    @Column(
            name = "email",
            nullable = false,
            unique = true,
            length = 150
    )
    private String email;

    @Column(
            name = "password",
            nullable = false,
            length = 255
    )
    private String password;

    @Column(
            name = "phone",
            length = 20
    )
    private String phone;

    /*
     * Hệ thống hiện có 4 role:
     *
     * 1 = SYSTEM_ADMIN
     * 2 = PARKING_MANAGER
     * 3 = PARKING_STAFF
     * 4 = DRIVER
     *
     * DRIVER chính là người dùng thông thường.
     */
    @ManyToOne(
            fetch = FetchType.EAGER,
            optional = false
    )
    @JoinColumn(
            name = "role_id",
            nullable = false
    )
    private Role role;

    @Column(
            name = "status",
            nullable = false,
            length = 20
    )
    private String status = STATUS_ACTIVE;

    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private Instant createdAt;

    @Column(
            name = "updated_at",
            nullable = false
    )
    private Instant updatedAt;

    @Column(
            name = "last_login_at"
    )
    private Instant lastLoginAt;

    @Column(
            name = "last_active_at"
    )
    private Instant lastActiveAt;

    /**
     * Chạy trước khi tạo bản ghi mới.
     */
    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();

        normalizeUserData();

        if (createdAt == null) {
            createdAt = now;
        }

        if (updatedAt == null) {
            updatedAt = now;
        }

        if (
                status == null ||
                        status.isBlank()
        ) {
            status = STATUS_ACTIVE;
        } else {
            status = normalizeStatus(status);
        }
    }

    /**
     * Chạy trước khi cập nhật bản ghi.
     */
    @PreUpdate
    public void preUpdate() {
        normalizeUserData();

        if (
                status == null ||
                        status.isBlank()
        ) {
            status = STATUS_ACTIVE;
        } else {
            status = normalizeStatus(status);
        }

        updatedAt = Instant.now();
    }

    /**
     * Chuẩn hóa dữ liệu cơ bản trước khi lưu database.
     */
    private void normalizeUserData() {
        if (fullName != null) {
            fullName = fullName.trim();
        }

        if (email != null) {
            email = email
                    .trim()
                    .toLowerCase(Locale.ROOT);
        }

        if (
                phone == null ||
                        phone.isBlank()
        ) {
            phone = null;
        } else {
            phone = phone.trim();
        }
    }

    private String normalizeStatus(
            String value
    ) {
        return value
                .trim()
                .toUpperCase(Locale.ROOT);
    }
}