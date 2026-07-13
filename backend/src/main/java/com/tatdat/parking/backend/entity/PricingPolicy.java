package com.tatdat.parking.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pricing_policies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PricingPolicy {

    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_INACTIVE = "INACTIVE";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_type_id", nullable = false)
    private VehicleType vehicleType;

    @Column(name = "base_price", nullable = false, precision = 18, scale = 2)
    private BigDecimal basePrice;

    @Column(name = "price_per_hour", nullable = false, precision = 18, scale = 2)
    private BigDecimal pricePerHour;

    /**
     * Phí qua đêm.
     * Ví dụ: khách gửi xe từ hôm trước sang hôm sau thì cộng phí này.
     */
    @Column(name = "overtime_fee", precision = 18, scale = 2)
    private BigDecimal overtimeFee;

    /**
     * Phí phạt quá giờ booking.
     * Ví dụ: khách booking đến 10:00 nhưng 11:00 mới lấy xe
     * thì số giờ quá hạn sẽ nhân với overstayFee.
     */
    @Column(name = "overstay_fee", nullable = false, precision = 18, scale = 2)
    private BigDecimal overstayFee;

    @Column(name = "status", length = 20, nullable = false)
    private String status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        if (createdAt == null) {
            createdAt = now;
        }

        if (updatedAt == null) {
            updatedAt = now;
        }

        applyDefaultValues();
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
        applyDefaultValues();
    }

    private void applyDefaultValues() {
        if (basePrice == null) {
            basePrice = BigDecimal.ZERO;
        }

        if (pricePerHour == null) {
            pricePerHour = BigDecimal.ZERO;
        }

        if (overtimeFee == null) {
            overtimeFee = BigDecimal.ZERO;
        }

        if (overstayFee == null) {
            overstayFee = BigDecimal.ZERO;
        }

        if (status == null || status.isBlank()) {
            status = STATUS_ACTIVE;
        }

        status = status.trim().toUpperCase();
    }

    public boolean isActive() {
        return STATUS_ACTIVE.equalsIgnoreCase(status);
    }
}