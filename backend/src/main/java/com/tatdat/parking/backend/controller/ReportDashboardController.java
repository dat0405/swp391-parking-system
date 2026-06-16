package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.service.ReportDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/report-dashboard")
@RequiredArgsConstructor
public class ReportDashboardController {

    private final ReportDashboardService reportDashboardService;

    @GetMapping
    public Map<String, Object> getReportDashboard(
            @RequestParam(defaultValue = "WEEK") String range
    ) {
        return reportDashboardService.getReportDashboard(range);
    }
}