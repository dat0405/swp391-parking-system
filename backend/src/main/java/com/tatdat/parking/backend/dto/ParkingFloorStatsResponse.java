package com.tatdat.parking.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class ParkingFloorStatsResponse {

    private Integer floorId;
    private String floorName;
    private Integer vehicleTypeId;
    private String vehicleType;
    private Long availableSlots;
    private Long totalSlots;
}