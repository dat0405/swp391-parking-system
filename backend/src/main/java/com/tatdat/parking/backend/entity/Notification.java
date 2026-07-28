package com.tatdat.parking.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.Locale;

@Entity
@Table(
        name = "notifications",
        indexes = {
                @Index(
                        name = "idx_notifications_recipient_created",
                        columnList = "recipient_user_id, created_at"
                ),
                @Index(
                        name = "idx_notifications_recipient_read",
                        columnList = "recipient_user_id, is_read"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    private Long id;

    /**
     * Tài khoản nhận thông báo.
     *
     * Mỗi notification luôn thuộc về đúng một user.
     *
     * Khi gửi thông báo toàn hệ thống, backend sẽ tạo
     * một Notification riêng cho từng tài khoản.
     */
    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "recipient_user_id",
            nullable = false
    )
    private User recipient;

    @Column(
            name = "title",
            nullable = false,
            length = 150
    )
    private String title;

    @Column(
            name = "message",
            nullable = false,
            length = 1000
    )
    private String message;

    /**
     * Các loại notification hiện tại:
     *
     * - BOOKING_CONFIRMED
     * - BOOKING_CANCELLED
     * - VEHICLE_CHECKED_IN
     * - VEHICLE_CHECKED_OUT
     * - PARKING_FEE_UPDATED
     */
    @Column(
            name = "notification_type",
            nullable = false,
            length = 50
    )
    private String notificationType;

    @Builder.Default
    @Column(
            name = "is_read",
            nullable = false
    )
    private Boolean isRead = false;

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

    /**
     * Thời điểm tài khoản đọc notification.
     */
    @Column(
            name = "read_at"
    )
    private Instant readAt;

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();

        normalizeData();

        if (isRead == null) {
            isRead = false;
        }

        if (createdAt == null) {
            createdAt = now;
        }

        if (updatedAt == null) {
            updatedAt = now;
        }

        if (!Boolean.TRUE.equals(isRead)) {
            readAt = null;
        }
    }

    @PreUpdate
    public void preUpdate() {
        normalizeData();

        if (isRead == null) {
            isRead = false;
        }

        if (!Boolean.TRUE.equals(isRead)) {
            readAt = null;
        }

        updatedAt = Instant.now();
    }

    /**
     * Đánh dấu notification đã đọc.
     */
    public void markAsRead() {
        if (!Boolean.TRUE.equals(isRead)) {
            isRead = true;
            readAt = Instant.now();
        }
    }

    /**
     * Đánh dấu notification chưa đọc.
     */
    public void markAsUnread() {
        isRead = false;
        readAt = null;
    }

    private void normalizeData() {
        if (title != null) {
            title = title.trim();
        }

        if (message != null) {
            message = message.trim();
        }

        if (notificationType != null) {
            notificationType = notificationType
                    .trim()
                    .toUpperCase(Locale.ROOT);
        }
    }
}