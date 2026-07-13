package com.tatdat.parking.backend.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PricingPolicyRequest {

    private Integer vehicleTypeId;

    private BigDecimal basePrice;

    private BigDecimal pricePerHour;

    private BigDecimal overtimeFee;

    private BigDecimal overstayFee;

    private String status;
}