package com.tatdat.parking.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ActiveParkingSessionResponse {

    private Integer sessionId;

    private String ticketId;

    private String licensePlate;

    private String vehicleType;

    private String slotCode;

    private LocalDateTime checkInTime;

    private String status;
}