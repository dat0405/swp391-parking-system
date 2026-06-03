package com.tatdat.parking.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CheckInResponse {

    private Integer sessionId;

    private String licensePlate;

    private String slotCode;

    private LocalDateTime checkInTime;

    private String status;
}