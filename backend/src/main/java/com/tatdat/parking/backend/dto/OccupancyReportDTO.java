package com.tatdat.parking.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class OccupancyReportDTO {

    private Long totalSlots;

    private Long occupiedSlots;

    private Long availableSlots;

    private Long reservedSlots;

    private Double occupancyRate;
}