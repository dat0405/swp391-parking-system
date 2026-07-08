package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public interface PaymentRepository extends JpaRepository<Payment, Integer> {

    @Query("""
            SELECT COALESCE(SUM(p.amount), 0)
            FROM Payment p
            WHERE UPPER(p.paymentStatus) = 'PAID'
            """)
    BigDecimal getTotalRevenue();

    long countByPaymentStatus(String paymentStatus);

    @Query("""
            SELECT COALESCE(SUM(p.amount), 0)
            FROM Payment p
            WHERE UPPER(p.paymentStatus) = 'PAID'
              AND p.paymentTime >= :startOfDay
              AND p.paymentTime < :endOfDay
            """)
    BigDecimal sumTodayRevenue(
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );

    /*
     * Doanh thu từ Booking PayOS.
     *
     * Bảng bookings không phải entity Payment,
     * nên mình dùng nativeQuery để sum trực tiếp từ database.
     */
    @Query(value = """
            SELECT COALESCE(SUM(b.payment_amount), 0)
            FROM bookings b
            WHERE UPPER(b.status) = 'CONFIRMED'
              AND UPPER(b.payment_status) = 'PAID'
              AND b.paid_at IS NOT NULL
              AND b.paid_at >= :startOfDay
              AND b.paid_at < :endOfDay
            """, nativeQuery = true)
    BigDecimal sumTodayBookingRevenue(
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );
}