package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.dto.NotificationResponse;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;

@Service
public class NotificationEventService {

    /**
     * Tên các sự kiện SSE gửi đến frontend.
     */
    public static final String EVENT_CONNECTED =
            "CONNECTED";

    public static final String EVENT_NOTIFICATION_CREATED =
            "NOTIFICATION_CREATED";

    public static final String EVENT_HEARTBEAT =
            "HEARTBEAT";

    /**
     * Thời gian tồn tại tối đa của một kết nối SSE.
     *
     * EventSource trên trình duyệt sẽ tự kết nối lại
     * nếu kết nối hết hạn hoặc bị ngắt.
     */
    private static final long SSE_TIMEOUT_MS =
            30L * 60L * 1000L;

    /**
     * Gửi heartbeat mỗi 25 giây để tránh:
     *
     * - Azure đóng kết nối vì không có dữ liệu;
     * - proxy hoặc trình duyệt xem kết nối là idle;
     * - EventSource bị ngắt mà frontend không nhận biết.
     */
    private static final long HEARTBEAT_INTERVAL_SECONDS =
            25L;

    /**
     * Mỗi user có thể mở website ở nhiều tab hoặc thiết bị.
     *
     * Vì vậy mỗi userId có thể có nhiều SseEmitter.
     */
    private final Map<Integer, CopyOnWriteArrayList<SseEmitter>>
            emittersByUser =
            new ConcurrentHashMap<>();

    /**
     * Thread riêng để gửi heartbeat.
     *
     * Dùng daemon thread để không chặn ứng dụng shutdown.
     */
    private final ScheduledExecutorService heartbeatExecutor =
            Executors.newSingleThreadScheduledExecutor(
                    new NotificationHeartbeatThreadFactory()
            );

    /**
     * Khởi động heartbeat sau khi Spring tạo service.
     */
    @PostConstruct
    public void startHeartbeatTask() {
        heartbeatExecutor.scheduleAtFixedRate(
                this::sendHeartbeatToAllUsers,
                HEARTBEAT_INTERVAL_SECONDS,
                HEARTBEAT_INTERVAL_SECONDS,
                TimeUnit.SECONDS
        );
    }

    /**
     * Đăng ký kết nối realtime cho một tài khoản.
     *
     * NotificationController phải lấy userId từ JWT,
     * không nhận userId tùy ý từ frontend.
     */
    public SseEmitter subscribe(
            Integer userId
    ) {
        validateUserId(userId);

        SseEmitter emitter =
                new SseEmitter(
                        SSE_TIMEOUT_MS
                );

        emittersByUser
                .computeIfAbsent(
                        userId,
                        ignored ->
                                new CopyOnWriteArrayList<>()
                )
                .add(emitter);

        /*
         * Xóa emitter khỏi bộ nhớ khi trình duyệt
         * đóng tab hoặc kết nối hoàn tất.
         */
        emitter.onCompletion(
                () -> removeEmitter(
                        userId,
                        emitter
                )
        );

        /*
         * Xóa emitter khi kết nối hết thời gian.
         */
        emitter.onTimeout(() -> {
            removeEmitter(
                    userId,
                    emitter
            );

            try {
                emitter.complete();
            } catch (Exception ignored) {
                // Kết nối có thể đã được đóng trước đó.
            }
        });

        /*
         * Xóa emitter khi kết nối gặp lỗi.
         */
        emitter.onError(error ->
                removeEmitter(
                        userId,
                        emitter
                )
        );

        /*
         * Gửi sự kiện xác nhận kết nối thành công.
         *
         * reconnectTime hướng dẫn trình duyệt thử kết nối lại
         * sau 3 giây nếu kết nối SSE bị gián đoạn.
         */
        try {
            emitter.send(
                    SseEmitter
                            .event()
                            .name(
                                    EVENT_CONNECTED
                            )
                            .reconnectTime(
                                    3000L
                            )
                            .data(
                                    Map.of(
                                            "connected",
                                            true,
                                            "userId",
                                            userId,
                                            "connectedAt",
                                            Instant.now()
                                                    .toString()
                                    )
                            )
            );
        } catch (
                IOException
                | IllegalStateException error
        ) {
            removeEmitter(
                    userId,
                    emitter
            );

            try {
                emitter.completeWithError(
                        error
                );
            } catch (Exception ignored) {
                // Không xử lý thêm khi emitter đã đóng.
            }
        }

        return emitter;
    }

    /**
     * Gửi notification mới đến đúng tài khoản nhận.
     *
     * Tất cả tab hoặc thiết bị đang đăng nhập bằng tài khoản đó
     * đều nhận được sự kiện ngay lập tức.
     */
    public void publish(
            Integer recipientUserId,
            NotificationResponse notification
    ) {
        if (
                recipientUserId == null
                        || recipientUserId <= 0
                        || notification == null
        ) {
            return;
        }

        CopyOnWriteArrayList<SseEmitter> emitters =
                emittersByUser.get(
                        recipientUserId
                );

        if (
                emitters == null
                        || emitters.isEmpty()
        ) {
            return;
        }

        for (
                SseEmitter emitter
                : emitters
        ) {
            try {
                SseEmitter.SseEventBuilder event =
                        SseEmitter
                                .event()
                                .name(
                                        EVENT_NOTIFICATION_CREATED
                                )
                                .data(
                                        notification
                                );

                /*
                 * Event ID giúp trình duyệt theo dõi sự kiện.
                 */
                if (
                        notification.getNotificationId()
                                != null
                ) {
                    event.id(
                            String.valueOf(
                                    notification
                                            .getNotificationId()
                            )
                    );
                }

                emitter.send(event);
            } catch (
                    IOException
                    | IllegalStateException error
            ) {
                removeEmitter(
                        recipientUserId,
                        emitter
                );

                try {
                    emitter.complete();
                } catch (Exception ignored) {
                    // Emitter có thể đã đóng.
                }
            }
        }
    }

    /**
     * Gửi heartbeat đến toàn bộ kết nối đang mở.
     *
     * Heartbeat không làm tăng badge notification
     * và không được lưu vào database.
     */
    private void sendHeartbeatToAllUsers() {
        for (
                Map.Entry<
                        Integer,
                        CopyOnWriteArrayList<SseEmitter>
                        > entry
                : emittersByUser.entrySet()
        ) {
            Integer userId =
                    entry.getKey();

            CopyOnWriteArrayList<SseEmitter> emitters =
                    entry.getValue();

            if (
                    emitters == null
                            || emitters.isEmpty()
            ) {
                emittersByUser.remove(
                        userId,
                        emitters
                );

                continue;
            }

            for (
                    SseEmitter emitter
                    : emitters
            ) {
                try {
                    emitter.send(
                            SseEmitter
                                    .event()
                                    .name(
                                            EVENT_HEARTBEAT
                                    )
                                    .data(
                                            Map.of(
                                                    "timestamp",
                                                    Instant.now()
                                                            .toString()
                                            )
                                    )
                    );
                } catch (
                        IOException
                        | IllegalStateException error
                ) {
                    removeEmitter(
                            userId,
                            emitter
                    );

                    try {
                        emitter.complete();
                    } catch (Exception ignored) {
                        // Kết nối đã đóng.
                    }
                }
            }
        }
    }

    /**
     * Xóa một kết nối SSE khỏi user.
     */
    private void removeEmitter(
            Integer userId,
            SseEmitter emitter
    ) {
        if (
                userId == null
                        || emitter == null
        ) {
            return;
        }

        CopyOnWriteArrayList<SseEmitter> emitters =
                emittersByUser.get(
                        userId
                );

        if (emitters == null) {
            return;
        }

        emitters.remove(emitter);

        if (emitters.isEmpty()) {
            emittersByUser.remove(
                    userId,
                    emitters
            );
        }
    }

    /**
     * Kiểm tra userId trước khi mở kết nối SSE.
     */
    private void validateUserId(
            Integer userId
    ) {
        if (
                userId == null
                        || userId <= 0
        ) {
            throw new IllegalArgumentException(
                    "Notification stream user ID is required"
            );
        }
    }

    /**
     * Đóng scheduler và toàn bộ emitter khi ứng dụng dừng.
     */
    @PreDestroy
    public void shutdown() {
        heartbeatExecutor.shutdownNow();

        emittersByUser
                .values()
                .forEach(emitters ->
                        emitters.forEach(
                                emitter -> {
                                    try {
                                        emitter.complete();
                                    } catch (
                                            Exception ignored
                                    ) {
                                        // Emitter đã đóng.
                                    }
                                }
                        )
                );

        emittersByUser.clear();
    }

    /**
     * Tạo daemon thread cho heartbeat.
     */
    private static final class
    NotificationHeartbeatThreadFactory
            implements ThreadFactory {

        @Override
        public Thread newThread(
                Runnable runnable
        ) {
            Thread thread =
                    new Thread(
                            runnable,
                            "notification-sse-heartbeat"
                    );

            thread.setDaemon(true);

            return thread;
        }
    }
}