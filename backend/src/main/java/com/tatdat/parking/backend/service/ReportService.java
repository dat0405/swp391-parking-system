package com.tatdat.parking.backend.service;

import com.tatdat.parking.backend.dto.*;

public interface ReportService {

    RevenueReportDTO getRevenueReport();

    OccupancyReportDTO getOccupancyReport();

    VehicleTrafficDTO getVehicleTraffic();

    DashboardDTO getDashboard();
}