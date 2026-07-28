package com.tatdat.parking.backend.dto;

import com.tatdat.parking.backend.entity.Notification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {

    private Long notificationId;

    private String title;

    private String message;

    private String notificationType;

    private Boolean isRead;

    private Instant createdAt;

    private Instant readAt;

    /**
     * Chuyển Notification entity thành DTO.
     *
     * Không trả recipient ra frontend nhằm tránh
     * làm lộ dữ liệu tài khoản người nhận.
     */
    public static NotificationResponse fromEntity(
            Notification notification
    ) {
        if (notification == null) {
            return null;
        }

        return NotificationResponse.builder()
                .notificationId(
                        notification.getId()
                )
                .title(
                        notification.getTitle()
                )
                .message(
                        notification.getMessage()
                )
                .notificationType(
                        notification.getNotificationType()
                )
                .isRead(
                        Boolean.TRUE.equals(
                                notification.getIsRead()
                        )
                )
                .createdAt(
                        notification.getCreatedAt()
                )
                .readAt(
                        notification.getReadAt()
                )
                .build();
    }
}