package com.tatdat.parking.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class DashboardDTO {

    private BigDecimal totalRevenue;

    private Long totalSlots;

    private Long occupiedSlots;

    private Long availableSlots;

    private Long reservedSlots;

    private Long todayCheckIns;

    private Long todayCheckOuts;
}
