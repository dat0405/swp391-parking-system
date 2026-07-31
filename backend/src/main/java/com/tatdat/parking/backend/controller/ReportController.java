package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.DashboardDTO;
import com.tatdat.parking.backend.dto.MonthlyComparisonResponse;
import com.tatdat.parking.backend.dto.OccupancyReportDTO;
import com.tatdat.parking.backend.dto.RevenueReportDTO;
import com.tatdat.parking.backend.dto.VehicleTrafficDTO;
import com.tatdat.parking.backend.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private static final int DEFAULT_COMPARISON_MONTHS = 6;
    private static final int MIN_COMPARISON_MONTHS = 1;
    private static final int MAX_COMPARISON_MONTHS = 12;

    private final ReportService reportService;

    /**
     * Báo cáo tổng doanh thu toàn hệ thống.
     *
     * Endpoint:
     * GET /api/reports/revenue
     */
    @GetMapping("/revenue")
    public RevenueReportDTO revenue() {
        return reportService
                .getRevenueReport();
    }

    /**
     * Báo cáo tình trạng sử dụng chỗ đỗ xe.
     *
     * Endpoint:
     * GET /api/reports/occupancy
     */
    @GetMapping("/occupancy")
    public OccupancyReportDTO occupancy() {
        return reportService
                .getOccupancyReport();
    }

    /**
     * Báo cáo lưu lượng phương tiện trong ngày.
     *
     * Endpoint:
     * GET /api/reports/traffic
     */
    @GetMapping("/traffic")
    public VehicleTrafficDTO traffic() {
        return reportService
                .getVehicleTraffic();
    }

    /**
     * Dữ liệu tổng hợp cho dashboard báo cáo.
     *
     * Endpoint:
     * GET /api/reports/dashboard
     */
    @GetMapping("/dashboard")
    public DashboardDTO dashboard() {
        return reportService
                .getDashboard();
    }

    /**
     * Báo cáo so sánh các tháng gần nhất.
     *
     * Ví dụ:
     *
     * GET /api/reports/monthly-comparison
     * → mặc định lấy 6 tháng gần nhất.
     *
     * GET /api/reports/monthly-comparison?months=12
     * → lấy 12 tháng gần nhất.
     *
     * Danh sách trả về được sắp xếp từ tháng cũ nhất
     * đến tháng mới nhất.
     */
    @GetMapping("/monthly-comparison")
    public List<MonthlyComparisonResponse>
    getMonthlyComparison(
            @RequestParam(
                    name = "months",
                    defaultValue = "6"
            )
            int months
    ) {
        validateComparisonMonths(months);

        return reportService
                .getMonthlyComparison(months);
    }

    /**
     * Chỉ cho phép lấy từ 1 đến 12 tháng.
     */
    private void validateComparisonMonths(
            int months
    ) {
        if (
                months < MIN_COMPARISON_MONTHS
                        || months > MAX_COMPARISON_MONTHS
        ) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Months must be between "
                            + MIN_COMPARISON_MONTHS
                            + " and "
                            + MAX_COMPARISON_MONTHS
            );
        }
    }
}