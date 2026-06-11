package com.tatdat.parking.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PricingPolicyResponse {

    private Integer id;

    private Integer vehicleTypeId;

    private String vehicleTypeName;

    private BigDecimal basePrice;

    private BigDecimal pricePerHour;

    private BigDecimal overtimeFee;

    private String status;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}