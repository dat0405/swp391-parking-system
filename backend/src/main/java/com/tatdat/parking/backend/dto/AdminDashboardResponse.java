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

    private long totalUsers;
    private long activeUsers;
    private long bannedUsers;
    private long inactiveUsers;

    private long totalParkingFacilities;
    private long totalParkingSlots;
}