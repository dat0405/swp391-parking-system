package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.service.ReportDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/report-dashboard")
@RequiredArgsConstructor
public class ReportDashboardController {

    private final ReportDashboardService reportDashboardService;

    /**
     * Lấy báo cáo dashboard theo khoảng thời gian:
     *
     * - TODAY
     * - WEEK
     * - MONTH
     *
     * Endpoint:
     * GET /api/report-dashboard?range=MONTH
     */
    @GetMapping
    public Map<String, Object> getReportDashboard(
            @RequestParam(
                    name = "range",
                    defaultValue = "WEEK"
            )
            String range
    ) {
        return reportDashboardService
                .getReportDashboard(range);
    }
}