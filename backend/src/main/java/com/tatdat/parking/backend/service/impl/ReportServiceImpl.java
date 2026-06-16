package com.tatdat.parking.backend.service.impl;

import com.tatdat.parking.backend.dto.DashboardDTO;
import com.tatdat.parking.backend.dto.OccupancyReportDTO;
import com.tatdat.parking.backend.dto.RevenueReportDTO;
import com.tatdat.parking.backend.dto.VehicleTrafficDTO;
import com.tatdat.parking.backend.repository.ParkingSessionRepository;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import com.tatdat.parking.backend.repository.PaymentRepository;
import com.tatdat.parking.backend.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private final PaymentRepository paymentRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingSessionRepository parkingSessionRepository;

    @Override
    public RevenueReportDTO getRevenueReport() {
        BigDecimal revenue = paymentRepository.getTotalRevenue();

        if (revenue == null) {
            revenue = BigDecimal.ZERO;
        }

        long totalTransactions = paymentRepository.countByPaymentStatus("PAID");

        return new RevenueReportDTO(
                revenue,
                totalTransactions
        );
    }

    @Override
    public OccupancyReportDTO getOccupancyReport() {
        long totalSlots = parkingSlotRepository.count();

        long occupiedSlots =
                parkingSlotRepository.countByStatusIgnoreCase("OCCUPIED");

        long availableSlots =
                parkingSlotRepository.countByStatusIgnoreCase("AVAILABLE");

        long reservedSlots =
                parkingSlotRepository.countByStatusIgnoreCase("RESERVED");

        double occupancyRate =
                totalSlots == 0
                        ? 0
                        : ((double) occupiedSlots / totalSlots) * 100;

        return new OccupancyReportDTO(
                totalSlots,
                occupiedSlots,
                availableSlots,
                reservedSlots,
                occupancyRate
        );
    }

    @Override
    public VehicleTrafficDTO getVehicleTraffic() {
        LocalDate today = LocalDate.now();

        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay();

        long checkIns =
                parkingSessionRepository.countByCheckInTimeBetween(start, end);

        long checkOuts =
                parkingSessionRepository.countByCheckOutTimeBetween(start, end);

        return new VehicleTrafficDTO(
                checkIns,
                checkOuts
        );
    }

    @Override
    public DashboardDTO getDashboard() {
        RevenueReportDTO revenue = getRevenueReport();
        OccupancyReportDTO occupancy = getOccupancyReport();
        VehicleTrafficDTO traffic = getVehicleTraffic();

        return new DashboardDTO(
                revenue.getTotalRevenue(),
                occupancy.getTotalSlots(),
                occupancy.getOccupiedSlots(),
                occupancy.getAvailableSlots(),
                occupancy.getReservedSlots(),
                traffic.getTodayCheckIns(),
                traffic.getTodayCheckOuts()
        );
    }
}