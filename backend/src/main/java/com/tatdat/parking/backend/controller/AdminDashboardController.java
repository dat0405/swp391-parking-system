package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.AdminDashboardResponse;
import com.tatdat.parking.backend.repository.ParkingFacilityRepository;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import com.tatdat.parking.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final UserRepository userRepository;
    private final ParkingFacilityRepository parkingFacilityRepository;
    private final ParkingSlotRepository parkingSlotRepository;

    @GetMapping("/dashboard")
    public AdminDashboardResponse getDashboard() {
        return AdminDashboardResponse.builder()
                .totalUsers(userRepository.count())
                .activeUsers(userRepository.countByStatus("ACTIVE"))
                .bannedUsers(userRepository.countByStatus("BANNED"))
                .inactiveUsers(userRepository.countByStatus("INACTIVE"))
                .totalParkingFacilities(parkingFacilityRepository.count())
                .totalParkingSlots(parkingSlotRepository.count())
                .build();
    }
}