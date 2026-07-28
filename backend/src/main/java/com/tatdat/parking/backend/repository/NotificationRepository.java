package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    /**
     * Lấy toàn bộ notification của một tài khoản,
     * sắp xếp mới nhất trước.
     */
    List<Notification>
    findByRecipient_IdOrderByCreatedAtDesc(
            Integer recipientId
    );

    /**
     * Đếm notification chưa đọc của một tài khoản.
     */
    long countByRecipient_IdAndIsReadFalse(
            Integer recipientId
    );

    /**
     * Tìm notification theo ID nhưng đồng thời
     * phải thuộc về đúng tài khoản.
     *
     * Phương thức này ngăn tài khoản A đánh dấu đọc
     * notification của tài khoản B.
     */
    Optional<Notification>
    findByIdAndRecipient_Id(
            Long notificationId,
            Integer recipientId
    );

    /**
     * Lấy toàn bộ notification chưa đọc
     * của một tài khoản.
     */
    List<Notification>
    findByRecipient_IdAndIsReadFalse(
            Integer recipientId
    );
}