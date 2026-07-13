package com.tatdat.parking.backend.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckOutResponse {
    private Integer sessionId;
    private String ticketId;
    private String licensePlate;
    private String slotCode;
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
    private Long durationHours;
    private BigDecimal pricePerHour;
    private BigDecimal parkingFee;
    private BigDecimal overtimeFee;
    private BigDecimal overstayFee;
    private String holidayName;
    private BigDecimal holidaySurcharge;

    private Boolean lostTicket;
    private BigDecimal lostTicketFee;

    private BigDecimal totalAmount;
    private Boolean prepaidBooking;
    private BigDecimal amountDue;
    private String paymentStatus;
}
