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

    public static final String STATUS_PENDING_PAYMENT = "PENDING_PAYMENT";
    public static final String STATUS_CONFIRMED = "CONFIRMED";
    public static final String STATUS_CHECKED_IN = "CHECKED_IN";
    public static final String STATUS_COMPLETED = "COMPLETED";
    public static final String STATUS_CANCELLED = "CANCELLED";
    public static final String STATUS_EXPIRED = "EXPIRED";
    public static final String STATUS_NO_SHOW = "NO_SHOW";
    public static final String STATUS_REFUNDED = "REFUNDED";

    public static final String STATUS_PENDING = STATUS_PENDING_PAYMENT;

    public static final String PAYMENT_STATUS_PENDING = "PENDING";
    public static final String PAYMENT_STATUS_PAID = "PAID";
    public static final String PAYMENT_STATUS_CANCELLED = "CANCELLED";
    public static final String PAYMENT_STATUS_EXPIRED = "EXPIRED";
    public static final String PAYMENT_STATUS_FAILED = "FAILED";

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

    @Column(name = "payment_order_code", unique = true)
    private Long paymentOrderCode;

    @Column(name = "payment_link_id", length = 100)
    private String paymentLinkId;

    @Column(name = "checkout_url", length = 1000)
    private String checkoutUrl;

    @Column(name = "qr_code", columnDefinition = "NVARCHAR(MAX)")
    private String qrCode;

    @Column(name = "payment_amount")
    private Integer paymentAmount;

    @Column(name = "payment_currency", length = 10)
    private String paymentCurrency;

    @Column(name = "payment_status", length = 30)
    private String paymentStatus;

    @Column(name = "payment_description", length = 255)
    private String paymentDescription;

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

        if (paymentCurrency == null || paymentCurrency.trim().isEmpty()) {
            paymentCurrency = "VND";
        }

        if (paymentStatus == null || paymentStatus.trim().isEmpty()) {
            paymentStatus = PAYMENT_STATUS_PENDING;
        }

        paymentStatus = normalizePaymentStatus(paymentStatus);
    }

    @PreUpdate
    public void preUpdate() {
        if (status != null) {
            status = normalizeStatus(status);
        }

        if (paymentStatus != null) {
            paymentStatus = normalizePaymentStatus(paymentStatus);
        }

        if (paymentCurrency != null) {
            paymentCurrency = paymentCurrency.trim().toUpperCase();
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

    private String normalizePaymentStatus(String inputPaymentStatus) {
        String normalizedPaymentStatus = inputPaymentStatus.trim().toUpperCase();

        if ("CANCELED".equals(normalizedPaymentStatus)) {
            return PAYMENT_STATUS_CANCELLED;
        }

        return normalizedPaymentStatus;
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

    public boolean isPaymentPending() {
        return PAYMENT_STATUS_PENDING.equals(paymentStatus);
    }

    public boolean isPaymentPaid() {
        return PAYMENT_STATUS_PAID.equals(paymentStatus);
    }
}
