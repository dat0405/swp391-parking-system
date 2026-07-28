package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.NotificationResponse;
import com.tatdat.parking.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Lấy toàn bộ notification của tài khoản
     * đang đăng nhập.
     */
    @GetMapping("/me")
    public List<NotificationResponse>
    getMyNotifications() {
        return notificationService
                .getMyNotifications();
    }

    /**
     * Lấy số notification chưa đọc
     * của tài khoản hiện tại.
     */
    @GetMapping("/me/unread-count")
    public long getMyUnreadCount() {
        return notificationService
                .getMyUnreadCount();
    }

    /**
     * Đánh dấu một notification là đã đọc.
     *
     * Backend chỉ cho phép đánh dấu nếu notification
     * thuộc về tài khoản đang đăng nhập.
     */
    @PutMapping("/{notificationId}/read")
    public NotificationResponse
    markNotificationAsRead(
            @PathVariable Long notificationId
    ) {
        return notificationService
                .markMyNotificationAsRead(
                        notificationId
                );
    }

    /**
     * Đánh dấu toàn bộ notification của tài khoản
     * hiện tại là đã đọc.
     */
    @PutMapping("/me/read-all")
    public ResponseEntity<Void>
    markAllNotificationsAsRead() {
        notificationService
                .markAllMyNotificationsAsRead();

        return ResponseEntity
                .noContent()
                .build();
    }
}