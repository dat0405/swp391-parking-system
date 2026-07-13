package com.tatdat.parking.backend.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PricingPolicyResponse {

    private Integer id;

    private Integer vehicleTypeId;

    private String vehicleTypeName;

    private BigDecimal basePrice;

    private BigDecimal pricePerHour;

    private BigDecimal overtimeFee;

    private BigDecimal overstayFee;

    private String status;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}