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
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
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
    private final NotificationEventService notificationEventService;

    /**
     * Tạo notification cá nhân.
     *
     * Dùng cho:
     * - Driver booking thành công.
     * - Driver hủy booking.
     * - Staff/Admin check-in.
     * - Staff/Admin checkout.
     *
     * Sau khi transaction lưu database thành công,
     * notification sẽ được đẩy realtime đến đúng user qua SSE.
     */
    @Transactional
    public NotificationResponse createPersonalNotification(
            Integer recipientUserId,
            String title,
            String message,
            String notificationType
    ) {
        if (recipientUserId == null || recipientUserId <= 0) {
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
                notificationRepository.save(notification);

        NotificationResponse response =
                NotificationResponse.fromEntity(
                        savedNotification
                );

        /*
         * Chỉ publish sau khi transaction commit thành công.
         * Điều này tránh frontend nhận SSE trước khi dữ liệu
         * thực sự tồn tại trong database.
         */
        publishAfterCommit(
                recipientUserId,
                response
        );

        return response;
    }

    /**
     * Gửi notification đến toàn bộ tài khoản trong hệ thống.
     *
     * Mỗi user nhận một bản ghi Notification riêng,
     * do đó trạng thái đã đọc của các user không ảnh hưởng nhau.
     *
     * Sau khi saveAll commit thành công, mỗi user đang mở website
     * sẽ nhận notification realtime qua SSE.
     *
     * Dùng khi Manager/Admin thay đổi:
     * - Price per hour;
     * - Overtime fee;
     * - Overstay fee.
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
         * Broadcast đến toàn bộ account trong database.
         * Mỗi account có một row notification riêng.
         */
        List<User> recipients =
                userRepository
                        .findAllByOrderByIdDesc();

        if (recipients == null || recipients.isEmpty()) {
            return;
        }

        List<Notification> notifications =
                recipients
                        .stream()
                        .filter(user ->
                                user != null
                                        && user.getId() != null
                                        && user.getId() > 0
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

        if (notifications.isEmpty()) {
            return;
        }

        List<Notification> savedNotifications =
                notificationRepository.saveAll(
                        notifications
                );

        /*
         * Chuẩn bị dữ liệu SSE ngay trong transaction
         * để không phụ thuộc lazy-loading sau khi commit.
         */
        List<PendingRealtimeNotification> pendingEvents =
                new ArrayList<>();

        for (Notification savedNotification : savedNotifications) {
            if (
                    savedNotification == null
                            || savedNotification.getRecipient() == null
                            || savedNotification.getRecipient().getId() == null
            ) {
                continue;
            }

            NotificationResponse response =
                    NotificationResponse.fromEntity(
                            savedNotification
                    );

            pendingEvents.add(
                    new PendingRealtimeNotification(
                            savedNotification
                                    .getRecipient()
                                    .getId(),
                            response
                    )
            );
        }

        publishAllAfterCommit(
                pendingEvents
        );
    }

    /**
     * Mở kết nối SSE cho tài khoản đang đăng nhập.
     *
     * NotificationController gọi method này tại:
     * GET /api/notifications/stream
     *
     * User ID được lấy từ JWT/Security Context,
     * frontend không được truyền userId.
     */
    @Transactional(readOnly = true)
    public SseEmitter subscribeToMyNotifications() {
        User currentUser =
                getCurrentAuthenticatedUser();

        return notificationEventService
                .subscribe(
                        currentUser.getId()
                );
    }

    /**
     * Lấy notification của tài khoản đang đăng nhập.
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications() {
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
        if (notificationId == null || notificationId <= 0) {
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
        if (recipient == null || recipient.getId() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Notification recipient is required"
            );
        }

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
     * Publish một notification sau khi transaction commit.
     */
    private void publishAfterCommit(
            Integer recipientUserId,
            NotificationResponse response
    ) {
        if (
                recipientUserId == null
                        || recipientUserId <= 0
                        || response == null
        ) {
            return;
        }

        if (
                TransactionSynchronizationManager
                        .isSynchronizationActive()
        ) {
            TransactionSynchronizationManager
                    .registerSynchronization(
                            new TransactionSynchronization() {
                                @Override
                                public void afterCommit() {
                                    notificationEventService.publish(
                                            recipientUserId,
                                            response
                                    );
                                }
                            }
                    );

            return;
        }

        /*
         * Trường hợp method được gọi ngoài transaction.
         */
        notificationEventService.publish(
                recipientUserId,
                response
        );
    }

    /**
     * Publish danh sách notification sau khi transaction commit.
     */
    private void publishAllAfterCommit(
            List<PendingRealtimeNotification> pendingEvents
    ) {
        if (
                pendingEvents == null
                        || pendingEvents.isEmpty()
        ) {
            return;
        }

        List<PendingRealtimeNotification> safeEvents =
                List.copyOf(
                        pendingEvents
                );

        Runnable publisher = () -> {
            for (
                    PendingRealtimeNotification pendingEvent
                    : safeEvents
            ) {
                if (
                        pendingEvent == null
                                || pendingEvent.getRecipientUserId() == null
                                || pendingEvent.getResponse() == null
                ) {
                    continue;
                }

                notificationEventService.publish(
                        pendingEvent.getRecipientUserId(),
                        pendingEvent.getResponse()
                );
            }
        };

        if (
                TransactionSynchronizationManager
                        .isSynchronizationActive()
        ) {
            TransactionSynchronizationManager
                    .registerSynchronization(
                            new TransactionSynchronization() {
                                @Override
                                public void afterCommit() {
                                    publisher.run();
                                }
                            }
                    );

            return;
        }

        publisher.run();
    }

    /**
     * Lấy tài khoản hiện tại từ JWT/Spring Security.
     *
     * authentication.getName() trong hệ thống hiện tại
     * là email của user.
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

        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authenticated user email is missing"
            );
        }

        return userRepository
                .findByEmail(
                        email
                                .trim()
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
        if (value == null || value.isBlank()) {
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

    /**
     * Dữ liệu chờ publish realtime sau commit.
     *
     * Dùng class thông thường để tương thích tốt
     * với các phiên bản Java cũ hơn.
     */
    private static final class PendingRealtimeNotification {

        private final Integer recipientUserId;
        private final NotificationResponse response;

        private PendingRealtimeNotification(
                Integer recipientUserId,
                NotificationResponse response
        ) {
            this.recipientUserId = recipientUserId;
            this.response = response;
        }

        private Integer getRecipientUserId() {
            return recipientUserId;
        }

        private NotificationResponse getResponse() {
            return response;
        }
    }
}
