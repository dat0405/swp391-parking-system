package com.tatdat.parking.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyComparisonResponse {

    /**
     * Năm của kỳ báo cáo.
     *
     * Ví dụ: 2026
     */
    private Integer year;

    /**
     * Tháng của kỳ báo cáo, từ 1 đến 12.
     *
     * Ví dụ: 7
     */
    private Integer month;

    /**
     * Nhãn hiển thị trên frontend.
     *
     * Ví dụ:
     * - Jul 2026
     * - Aug 2026
     */
    private String monthLabel;

    /**
     * Tổng doanh thu đã thanh toán thành công
     * trong tháng.
     */
    @Builder.Default
    private BigDecimal totalRevenue =
            BigDecimal.ZERO;

    /**
     * Tổng số phiên gửi xe trong tháng.
     */
    @Builder.Default
    private Long totalSessions = 0L;

    /**
     * Tổng số booking được tạo trong tháng.
     */
    @Builder.Default
    private Long totalReservations = 0L;

    /**
     * Tổng số booking đã hoàn thành.
     */
    @Builder.Default
    private Long completedReservations = 0L;

    /**
     * Tổng số booking đã bị hủy.
     */
    @Builder.Default
    private Long cancelledReservations = 0L;

    /**
     * Tỷ lệ sử dụng bãi xe trung bình của tháng.
     *
     * Ví dụ:
     * 35.50 nghĩa là 35.5%.
     */
    @Builder.Default
    private BigDecimal averageOccupancy =
            BigDecimal.ZERO;

    /**
     * Số giao dịch thanh toán thành công.
     */
    @Builder.Default
    private Long paymentCount = 0L;

    /**
     * Phần trăm tăng hoặc giảm doanh thu
     * so với tháng trước.
     *
     * Ví dụ:
     * 15.25  = tăng 15.25%
     * -8.50  = giảm 8.5%
     * 0      = không thay đổi
     */
    @Builder.Default
    private BigDecimal revenueGrowthPercent =
            BigDecimal.ZERO;

    /**
     * Phần trăm tăng hoặc giảm số phiên gửi xe
     * so với tháng trước.
     */
    @Builder.Default
    private BigDecimal sessionGrowthPercent =
            BigDecimal.ZERO;

    /**
     * Phần trăm tăng hoặc giảm số booking
     * so với tháng trước.
     */
    @Builder.Default
    private BigDecimal reservationGrowthPercent =
            BigDecimal.ZERO;
}