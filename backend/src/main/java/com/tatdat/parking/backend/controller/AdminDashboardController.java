package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.AdminDashboardResponse;
import com.tatdat.parking.backend.repository.ParkingFacilityRepository;
import com.tatdat.parking.backend.repository.ParkingSessionRepository;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import com.tatdat.parking.backend.repository.PaymentRepository;
import com.tatdat.parking.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

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
}