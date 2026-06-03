package com.tatdat.parking.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardResponse {

    // System admin statistics
    private long totalUsers;
    private long activeUsers;
    private long bannedUsers;
    private long inactiveUsers;

    private long totalParkingFacilities;
    private long totalParkingSlots;

    // Frontend dashboard statistics
    private long totalSlots;
    private long activeOccupancy;
    private long availableSlots;
    private long occupiedSlots;
    private long reservedSlots;
    private long maintenanceSlots;

    private double todayRevenue;
    private long pendingRes;
}