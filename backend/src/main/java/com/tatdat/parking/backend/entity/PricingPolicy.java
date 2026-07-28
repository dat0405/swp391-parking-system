package com.tatdat.parking.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Locale;

@Entity
@Table(name = "pricing_policies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PricingPolicy {

    public static final String STATUS_ACTIVE =
            "ACTIVE";

    public static final String STATUS_INACTIVE =
            "INACTIVE";

    private static final int MONEY_SCALE = 2;

    @Id
    @GeneratedValue(
            strategy = GenerationType.IDENTITY
    )
    private Integer id;

    /**
     * Loại phương tiện áp dụng chính sách giá.
     */
    @ManyToOne(
            fetch = FetchType.LAZY,
            optional = false
    )
    @JoinColumn(
            name = "vehicle_type_id",
            nullable = false
    )
    private VehicleType vehicleType;

    /**
     * Giá cơ bản của chính sách.
     *
     * Field này được giữ lại theo cấu trúc database hiện tại.
     */
    @Column(
            name = "base_price",
            nullable = false,
            precision = 18,
            scale = 2
    )
    private BigDecimal basePrice;

    /**
     * Giá đỗ xe mặc định theo giờ.
     *
     * Khi Manager/Admin thay đổi field này,
     * toàn bộ tài khoản trong hệ thống sẽ nhận notification.
     */
    @Column(
            name = "price_per_hour",
            nullable = false,
            precision = 18,
            scale = 2
    )
    private BigDecimal pricePerHour;

    /**
     * Phí qua đêm.
     *
     * Ví dụ:
     * xe gửi từ hôm trước sang hôm sau
     * thì cộng phí này theo số ngày qua đêm.
     *
     * Đây không phải phí quá thời gian booking.
     */
    @Column(
            name = "overtime_fee",
            precision = 18,
            scale = 2
    )
    private BigDecimal overtimeFee;

    /**
     * Phí quá giờ booking.
     *
     * Ví dụ:
     * booking kết thúc lúc 10:00 nhưng 11:00 mới lấy xe,
     * số giờ quá hạn sẽ được nhân với overstayFee.
     *
     * Khi Manager/Admin thay đổi field này,
     * toàn bộ tài khoản trong hệ thống sẽ nhận notification.
     */
    @Column(
            name = "overstay_fee",
            nullable = false,
            precision = 18,
            scale = 2
    )
    private BigDecimal overstayFee;

    /**
     * Trạng thái chính sách:
     *
     * - ACTIVE
     * - INACTIVE
     */
    @Column(
            name = "status",
            nullable = false,
            length = 20
    )
    private String status;

    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @Column(
            name = "updated_at",
            nullable = false
    )
    private LocalDateTime updatedAt;

    /**
     * Chuẩn hóa dữ liệu trước khi tạo mới.
     */
    @PrePersist
    public void onCreate() {
        LocalDateTime now =
                LocalDateTime.now();

        applyDefaultValues();
        validateEntity();

        if (createdAt == null) {
            createdAt = now;
        }

        updatedAt = now;
    }

    /**
     * Chuẩn hóa dữ liệu trước khi cập nhật.
     */
    @PreUpdate
    public void onUpdate() {
        applyDefaultValues();
        validateEntity();

        updatedAt =
                LocalDateTime.now();
    }

    /**
     * Gán giá trị mặc định và chuẩn hóa dữ liệu.
     */
    private void applyDefaultValues() {
        basePrice =
                normalizeMoney(basePrice);

        pricePerHour =
                normalizeMoney(pricePerHour);

        overtimeFee =
                normalizeMoney(overtimeFee);

        overstayFee =
                normalizeMoney(overstayFee);

        status =
                normalizeStatus(status);
    }

    /**
     * Kiểm tra dữ liệu entity trước khi lưu.
     *
     * Controller vẫn phải validate request.
     * Phần này là lớp bảo vệ cuối cùng ở entity.
     */
    private void validateEntity() {
        if (vehicleType == null) {
            throw new IllegalStateException(
                    "Vehicle type is required"
            );
        }

        validateNonNegativeMoney(
                basePrice,
                "Base price"
        );

        validateNonNegativeMoney(
                pricePerHour,
                "Price per hour"
        );

        validateNonNegativeMoney(
                overtimeFee,
                "Overnight fee"
        );

        validateNonNegativeMoney(
                overstayFee,
                "Overstay fee"
        );

        if (
                !STATUS_ACTIVE.equals(status)
                        && !STATUS_INACTIVE.equals(status)
        ) {
            throw new IllegalStateException(
                    "Invalid pricing policy status"
            );
        }
    }

    /**
     * Chuẩn hóa tiền về hai chữ số thập phân.
     */
    private BigDecimal normalizeMoney(
            BigDecimal value
    ) {
        BigDecimal safeValue =
                value == null
                        ? BigDecimal.ZERO
                        : value;

        return safeValue.setScale(
                MONEY_SCALE,
                RoundingMode.HALF_UP
        );
    }

    /**
     * Không cho phép giá trị tiền âm.
     */
    private void validateNonNegativeMoney(
            BigDecimal value,
            String fieldName
    ) {
        if (
                value != null
                        && value.compareTo(
                        BigDecimal.ZERO
                ) < 0
        ) {
            throw new IllegalStateException(
                    fieldName
                            + " cannot be negative"
            );
        }
    }

    /**
     * Chuẩn hóa trạng thái.
     *
     * Nếu không truyền trạng thái,
     * mặc định policy mới là ACTIVE.
     */
    private String normalizeStatus(
            String value
    ) {
        if (
                value == null
                        || value.isBlank()
        ) {
            return STATUS_ACTIVE;
        }

        String normalizedStatus =
                value
                        .trim()
                        .toUpperCase(
                                Locale.ROOT
                        );

        if (
                !STATUS_ACTIVE.equals(
                        normalizedStatus
                )
                        && !STATUS_INACTIVE.equals(
                        normalizedStatus
                )
        ) {
            throw new IllegalStateException(
                    "Invalid pricing policy status"
            );
        }

        return normalizedStatus;
    }

    /**
     * Kiểm tra policy có đang hoạt động hay không.
     */
    public boolean isActive() {
        return STATUS_ACTIVE.equalsIgnoreCase(
                status
        );
    }
}