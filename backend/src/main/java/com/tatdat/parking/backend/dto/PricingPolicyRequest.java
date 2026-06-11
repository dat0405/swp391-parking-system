package com.tatdat.parking.backend.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PricingPolicyRequest {

    private Integer vehicleTypeId;

    private BigDecimal basePrice;

    private BigDecimal pricePerHour;

    private BigDecimal overtimeFee;

    private String status;
}