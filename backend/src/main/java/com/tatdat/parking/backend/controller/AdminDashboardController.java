package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.AdminDashboardResponse;
import com.tatdat.parking.backend.dto.DashboardTrendResponse;
import com.tatdat.parking.backend.repository.ParkingFacilityRepository;
import com.tatdat.parking.backend.repository.ParkingSessionRepository;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import com.tatdat.parking.backend.repository.PaymentRepository;
import com.tatdat.parking.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final UserRepository userRepository;
    private final ParkingFacilityRepository parkingFacilityRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingSessionRepository parkingSessionRepository;
    private final PaymentRepository paymentRepository;

    @GetMapping("/dashboard")
    public AdminDashboardResponse getDashboard() {
        long totalSlots = parkingSlotRepository.count();

        long availableSlots = parkingSlotRepository.countByStatus("AVAILABLE");
        long occupiedSlots = parkingSlotRepository.countByStatus("OCCUPIED");
        long reservedSlots = parkingSlotRepository.countByStatus("RESERVED");
        long maintenanceSlots = parkingSlotRepository.countByStatus("MAINTENANCE");

        long activeOccupancy = parkingSessionRepository.countByStatus("ACTIVE");

        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();

        BigDecimal todayRevenue = paymentRepository.sumTodayRevenue(startOfDay, endOfDay);

        if (todayRevenue == null) {
            todayRevenue = BigDecimal.ZERO;
        }

        return AdminDashboardResponse.builder()
                .totalUsers(userRepository.count())
                .activeUsers(userRepository.countByStatus("ACTIVE"))
                .bannedUsers(userRepository.countByStatus("BANNED"))
                .inactiveUsers(userRepository.countByStatus("INACTIVE"))

                .totalParkingFacilities(parkingFacilityRepository.count())
                .totalParkingSlots(totalSlots)

                .totalSlots(totalSlots)
                .activeOccupancy(activeOccupancy)
                .availableSlots(availableSlots)
                .occupiedSlots(occupiedSlots)
                .reservedSlots(reservedSlots)
                .maintenanceSlots(maintenanceSlots)

                .todayRevenue(todayRevenue.doubleValue())
                .pendingRes(0)
                .build();
    }

    @GetMapping("/dashboard/trends")
    public List<DashboardTrendResponse> getDashboardTrends(
            @RequestParam(defaultValue = "DAILY") String mode
    ) {
        String normalizedMode = mode.trim().toUpperCase();

        if ("WEEKLY".equals(normalizedMode)) {
            return getWeeklyTrend();
        }

        return getDailyTrend();
    }

    private List<DashboardTrendResponse> getDailyTrend() {
        LocalDate today = LocalDate.now();

        List<DashboardTrendResponse> trends = new ArrayList<>();

        trends.add(buildTrendItem(
                "4 AM - 8 AM",
                today.atTime(4, 0),
                today.atTime(8, 0)
        ));

        trends.add(buildTrendItem(
                "8 AM - 12 PM",
                today.atTime(8, 0),
                today.atTime(12, 0)
        ));

        trends.add(buildTrendItem(
                "12 PM - 4 PM",
                today.atTime(12, 0),
                today.atTime(16, 0)
        ));

        trends.add(buildTrendItem(
                "4 PM - 8 PM",
                today.atTime(16, 0),
                today.atTime(20, 0)
        ));

        trends.add(buildTrendItem(
                "8 PM - 12 AM",
                today.atTime(20, 0),
                today.plusDays(1).atStartOfDay()
        ));

        return trends;
    }

    private List<DashboardTrendResponse> getWeeklyTrend() {
        LocalDate today = LocalDate.now();

        LocalDate monday = today.with(DayOfWeek.MONDAY);

        List<DashboardTrendResponse> trends = new ArrayList<>();

        trends.add(buildTrendItem("Mon", monday.atStartOfDay(), monday.plusDays(1).atStartOfDay()));
        trends.add(buildTrendItem("Tue", monday.plusDays(1).atStartOfDay(), monday.plusDays(2).atStartOfDay()));
        trends.add(buildTrendItem("Wed", monday.plusDays(2).atStartOfDay(), monday.plusDays(3).atStartOfDay()));
        trends.add(buildTrendItem("Thu", monday.plusDays(3).atStartOfDay(), monday.plusDays(4).atStartOfDay()));
        trends.add(buildTrendItem("Fri", monday.plusDays(4).atStartOfDay(), monday.plusDays(5).atStartOfDay()));
        trends.add(buildTrendItem("Sat", monday.plusDays(5).atStartOfDay(), monday.plusDays(6).atStartOfDay()));
        trends.add(buildTrendItem("Sun", monday.plusDays(6).atStartOfDay(), monday.plusDays(7).atStartOfDay()));

        return trends;
    }

    private DashboardTrendResponse buildTrendItem(
            String label,
            LocalDateTime start,
            LocalDateTime end
    ) {
        long count = parkingSessionRepository.countByCheckInTimeBetween(start, end);

        return DashboardTrendResponse.builder()
                .label(label)
                .value(count)
                .build();
    }
}