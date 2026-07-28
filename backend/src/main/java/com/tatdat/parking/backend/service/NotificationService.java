package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.dto.NotificationResponse;
import com.tatdat.parking.backend.entity.Notification;
import com.tatdat.parking.backend.entity.User;
import com.tatdat.parking.backend.repository.NotificationRepository;
import com.tatdat.parking.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final int MAX_TITLE_LENGTH = 150;
    private static final int MAX_MESSAGE_LENGTH = 1000;
    private static final int MAX_TYPE_LENGTH = 50;

    private final NotificationRepository notificationRepository;

    private final UserRepository userRepository;

    /**
     * Tạo notification cá nhân.
     *
     * Dùng cho:
     * - Driver booking thành công.
     * - Driver hủy booking.
     * - Staff/Admin check-in.
     * - Staff/Admin checkout.
     */
    @Transactional
    public NotificationResponse createPersonalNotification(
            Integer recipientUserId,
            String title,
            String message,
            String notificationType
    ) {
        if (recipientUserId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Notification recipient is required"
            );
        }

        User recipient =
                userRepository
                        .findById(recipientUserId)
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Notification recipient not found"
                                )
                        );

        Notification notification =
                buildNotification(
                        recipient,
                        title,
                        message,
                        notificationType
                );

        Notification savedNotification =
                notificationRepository.save(
                        notification
                );

        return NotificationResponse.fromEntity(
                savedNotification
        );
    }

    /**
     * Gửi notification đến toàn bộ tài khoản trong hệ thống.
     *
     * Mỗi user nhận một bản ghi Notification riêng,
     * do đó trạng thái đã đọc của các user không ảnh hưởng nhau.
     *
     * Dùng khi Manager/Admin thay đổi:
     * - Giá đỗ xe mặc định.
     * - Phí quá giờ booking.
     */
    @Transactional
    public void broadcastNotification(
            String title,
            String message,
            String notificationType
    ) {
        String safeTitle =
                normalizeRequiredText(
                        title,
                        "Notification title",
                        MAX_TITLE_LENGTH
                );

        String safeMessage =
                normalizeRequiredText(
                        message,
                        "Notification message",
                        MAX_MESSAGE_LENGTH
                );

        String safeNotificationType =
                normalizeNotificationType(
                        notificationType
                );

        /*
         * Theo yêu cầu hiện tại, broadcast được gửi đến
         * toàn bộ account trong database.
         */
        List<User> recipients =
                userRepository
                        .findAllByOrderByIdDesc();

        if (
                recipients == null
                        || recipients.isEmpty()
        ) {
            return;
        }

        List<Notification> notifications =
                recipients
                        .stream()
                        .filter(user ->
                                user != null
                                        && user.getId() != null
                        )
                        .map(user ->
                                Notification.builder()
                                        .recipient(user)
                                        .title(safeTitle)
                                        .message(safeMessage)
                                        .notificationType(
                                                safeNotificationType
                                        )
                                        .isRead(false)
                                        .build()
                        )
                        .toList();

        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(
                    notifications
            );
        }
    }

    /**
     * Lấy notification của tài khoản đang đăng nhập.
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse>
    getMyNotifications() {
        User currentUser =
                getCurrentAuthenticatedUser();

        return notificationRepository
                .findByRecipient_IdOrderByCreatedAtDesc(
                        currentUser.getId()
                )
                .stream()
                .map(
                        NotificationResponse::fromEntity
                )
                .toList();
    }

    /**
     * Đếm notification chưa đọc của tài khoản hiện tại.
     */
    @Transactional(readOnly = true)
    public long getMyUnreadCount() {
        User currentUser =
                getCurrentAuthenticatedUser();

        return notificationRepository
                .countByRecipient_IdAndIsReadFalse(
                        currentUser.getId()
                );
    }

    /**
     * Đánh dấu một notification là đã đọc.
     *
     * Notification bắt buộc phải thuộc về
     * tài khoản hiện đang đăng nhập.
     */
    @Transactional
    public NotificationResponse markMyNotificationAsRead(
            Long notificationId
    ) {
        if (notificationId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Notification ID is required"
            );
        }

        User currentUser =
                getCurrentAuthenticatedUser();

        Notification notification =
                notificationRepository
                        .findByIdAndRecipient_Id(
                                notificationId,
                                currentUser.getId()
                        )
                        .orElseThrow(() ->
                                new ResponseStatusException(
                                        HttpStatus.NOT_FOUND,
                                        "Notification not found"
                                )
                        );

        notification.markAsRead();

        Notification savedNotification =
                notificationRepository.save(
                        notification
                );

        return NotificationResponse.fromEntity(
                savedNotification
        );
    }

    /**
     * Đánh dấu toàn bộ notification của tài khoản
     * đang đăng nhập là đã đọc.
     */
    @Transactional
    public void markAllMyNotificationsAsRead() {
        User currentUser =
                getCurrentAuthenticatedUser();

        List<Notification> unreadNotifications =
                notificationRepository
                        .findByRecipient_IdAndIsReadFalse(
                                currentUser.getId()
                        );

        if (
                unreadNotifications == null
                        || unreadNotifications.isEmpty()
        ) {
            return;
        }

        unreadNotifications.forEach(
                Notification::markAsRead
        );

        notificationRepository.saveAll(
                unreadNotifications
        );
    }

    /**
     * Tạo entity Notification đã được chuẩn hóa.
     */
    private Notification buildNotification(
            User recipient,
            String title,
            String message,
            String notificationType
    ) {
        String safeTitle =
                normalizeRequiredText(
                        title,
                        "Notification title",
                        MAX_TITLE_LENGTH
                );

        String safeMessage =
                normalizeRequiredText(
                        message,
                        "Notification message",
                        MAX_MESSAGE_LENGTH
                );

        String safeNotificationType =
                normalizeNotificationType(
                        notificationType
                );

        return Notification.builder()
                .recipient(recipient)
                .title(safeTitle)
                .message(safeMessage)
                .notificationType(
                        safeNotificationType
                )
                .isRead(false)
                .build();
    }

    /**
     * Lấy tài khoản hiện tại từ JWT/Spring Security.
     *
     * authentication.getName() trong hệ thống hiện tại
     * chính là email của user.
     */
    private User getCurrentAuthenticatedUser() {
        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (
                authentication == null
                        || !authentication.isAuthenticated()
                        || authentication
                        instanceof AnonymousAuthenticationToken
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not authenticated"
            );
        }

        String email =
                authentication.getName();

        if (
                email == null
                        || email.isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authenticated user email is missing"
            );
        }

        return userRepository
                .findByEmail(
                        email.trim()
                                .toLowerCase(
                                        Locale.ROOT
                                )
                )
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.UNAUTHORIZED,
                                "Authenticated user not found"
                        )
                );
    }

    private String normalizeRequiredText(
            String value,
            String fieldName,
            int maximumLength
    ) {
        if (
                value == null
                        || value.isBlank()
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    fieldName + " is required"
            );
        }

        String normalizedValue =
                value.trim();

        if (
                normalizedValue.length()
                        > maximumLength
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    fieldName
                            + " cannot exceed "
                            + maximumLength
                            + " characters"
            );
        }

        return normalizedValue;
    }

    private String normalizeNotificationType(
            String notificationType
    ) {
        String normalizedType =
                normalizeRequiredText(
                        notificationType,
                        "Notification type",
                        MAX_TYPE_LENGTH
                )
                        .toUpperCase(
                                Locale.ROOT
                        )
                        .replace(' ', '_')
                        .replace('-', '_');

        if (
                !normalizedType.matches(
                        "^[A-Z0-9_]+$"
                )
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Notification type contains invalid characters"
            );
        }

        return normalizedType;
    }
}