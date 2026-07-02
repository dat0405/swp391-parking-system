package com.tatdat.parking.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    /*
     * Booking status flow:
     *
     * PENDING_PAYMENT: User created booking, waiting for payment
     * CONFIRMED: Payment/admin confirmation completed
     * CHECKED_IN: Vehicle has entered the parking lot
     * COMPLETED: Booking finished / checked out
     * CANCELLED: Cancelled by user/admin
     * EXPIRED: Payment timeout / pending booking expired
     * NO_SHOW: User did not arrive at booking time
     * REFUNDED: Refund completed
     */

    public static final String STATUS_PENDING_PAYMENT = "PENDING_PAYMENT";
    public static final String STATUS_CONFIRMED = "CONFIRMED";
    public static final String STATUS_CHECKED_IN = "CHECKED_IN";
    public static final String STATUS_COMPLETED = "COMPLETED";
    public static final String STATUS_CANCELLED = "CANCELLED";
    public static final String STATUS_EXPIRED = "EXPIRED";
    public static final String STATUS_NO_SHOW = "NO_SHOW";
    public static final String STATUS_REFUNDED = "REFUNDED";

    /*
     * Keep this old constant temporarily so old service/controller code
     * that still uses Booking.STATUS_PENDING will not break.
     */
    public static final String STATUS_PENDING = STATUS_PENDING_PAYMENT;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "slot_id", nullable = false)
    private ParkingSlot slot;

    @Column(name = "booking_time", nullable = false)
    private LocalDateTime bookingTime;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(length = 30, nullable = false)
    private String status;

    @Column(name = "payment_expired_at")
    private LocalDateTime paymentExpiredAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    @Column(name = "checked_out_at")
    private LocalDateTime checkedOutAt;

    @Column(name = "refunded_at")
    private LocalDateTime refundedAt;

    @PrePersist
    public void prePersist() {
        if (bookingTime == null) {
            bookingTime = LocalDateTime.now();
        }

        if (status == null || status.trim().isEmpty()) {
            status = STATUS_PENDING_PAYMENT;
        }

        status = normalizeStatus(status);

        if (STATUS_PENDING_PAYMENT.equals(status) && paymentExpiredAt == null) {
            paymentExpiredAt = bookingTime.plusMinutes(10);
        }
    }

    @PreUpdate
    public void preUpdate() {
        if (status != null) {
            status = normalizeStatus(status);
        }
    }

    private String normalizeStatus(String inputStatus) {
        String normalizedStatus = inputStatus.trim().toUpperCase();

        if ("PENDING".equals(normalizedStatus)) {
            return STATUS_PENDING_PAYMENT;
        }

        if ("CANCELED".equals(normalizedStatus)) {
            return STATUS_CANCELLED;
        }

        return normalizedStatus;
    }

    public boolean isActiveForOverlapCheck() {
        return STATUS_PENDING_PAYMENT.equals(status)
                || STATUS_CONFIRMED.equals(status)
                || STATUS_CHECKED_IN.equals(status);
    }

    public boolean isFinalStatus() {
        return STATUS_COMPLETED.equals(status)
                || STATUS_CANCELLED.equals(status)
                || STATUS_EXPIRED.equals(status)
                || STATUS_NO_SHOW.equals(status)
                || STATUS_REFUNDED.equals(status);
    }
}