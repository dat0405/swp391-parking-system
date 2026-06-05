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
public class RevenueReportDTO {

    private BigDecimal totalRevenue;

    private Long totalTransactions;
}
