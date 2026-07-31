package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.dto.DashboardDTO;
import com.tatdat.parking.backend.dto.MonthlyComparisonResponse;
import com.tatdat.parking.backend.dto.OccupancyReportDTO;
import com.tatdat.parking.backend.dto.RevenueReportDTO;
import com.tatdat.parking.backend.dto.VehicleTrafficDTO;

import java.util.List;

public interface ReportService {

    /**
     * Báo cáo doanh thu tổng quan.
     */
    RevenueReportDTO getRevenueReport();

    /**
     * Báo cáo tỷ lệ sử dụng bãi xe.
     */
    OccupancyReportDTO getOccupancyReport();

    /**
     * Báo cáo lưu lượng phương tiện.
     */
    VehicleTrafficDTO getVehicleTraffic();

    /**
     * Dữ liệu tổng hợp cho dashboard báo cáo.
     */
    DashboardDTO getDashboard();

    /**
     * Lấy dữ liệu so sánh theo tháng.
     *
     * @param months số tháng gần nhất cần lấy.
     *               Ví dụ:
     *               - 6: lấy 6 tháng gần nhất;
     *               - 12: lấy 12 tháng gần nhất.
     *
     * @return danh sách dữ liệu theo thứ tự
     *         từ tháng cũ nhất đến tháng mới nhất.
     */
    List<MonthlyComparisonResponse>
    getMonthlyComparison(int months);
}