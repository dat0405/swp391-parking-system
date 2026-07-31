package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.NotificationResponse;
import com.tatdat.parking.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Mở kết nối SSE realtime cho tài khoản đang đăng nhập.
     *
     * Endpoint:
     * GET /api/notifications/stream
     *
     * Backend tự xác định user từ JWT/Security Context.
     * Frontend không được truyền userId.
     *
     * Các event frontend có thể nhận:
     * - CONNECTED
     * - NOTIFICATION_CREATED
     * - HEARTBEAT
     */
    @GetMapping(
            value = "/stream",
            produces = MediaType.TEXT_EVENT_STREAM_VALUE
    )
    public SseEmitter streamMyNotifications() {
        return notificationService
                .subscribeToMyNotifications();
    }

    /**
     * Lấy toàn bộ notification của tài khoản
     * đang đăng nhập.
     *
     * Endpoint:
     * GET /api/notifications/me
     */
    @GetMapping("/me")
    public List<NotificationResponse>
    getMyNotifications() {
        return notificationService
                .getMyNotifications();
    }

    /**
     * Lấy số notification chưa đọc
     * của tài khoản đang đăng nhập.
     *
     * Endpoint:
     * GET /api/notifications/me/unread-count
     */
    @GetMapping("/me/unread-count")
    public long getMyUnreadCount() {
        return notificationService
                .getMyUnreadCount();
    }

    /**
     * Đánh dấu một notification là đã đọc.
     *
     * Backend chỉ cho phép cập nhật khi notification
     * thuộc về tài khoản đang đăng nhập.
     *
     * Endpoint:
     * PUT /api/notifications/{notificationId}/read
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
     * đang đăng nhập là đã đọc.
     *
     * Endpoint:
     * PUT /api/notifications/me/read-all
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