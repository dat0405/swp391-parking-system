package com.tatdat.parking.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class CheckOutResponse {

    private Integer sessionId;

    private String licensePlate;

    private String slotCode;

    private LocalDateTime checkInTime;

    private LocalDateTime checkOutTime;

    private long durationHours;

    private BigDecimal pricePerHour;

    private BigDecimal totalAmount;

    private String paymentStatus;

    private String ticketId;
}