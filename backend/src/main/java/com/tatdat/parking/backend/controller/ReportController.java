package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.*;
import com.tatdat.parking.backend.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/revenue")
    public RevenueReportDTO revenue() {
        return reportService.getRevenueReport();
    }

    @GetMapping("/occupancy")
    public OccupancyReportDTO occupancy() {
        return reportService.getOccupancyReport();
    }

    @GetMapping("/traffic")
    public VehicleTrafficDTO traffic() {
        return reportService.getVehicleTraffic();
    }

    @GetMapping("/dashboard")
    public DashboardDTO dashboard() {
        return reportService.getDashboard();
    }
}