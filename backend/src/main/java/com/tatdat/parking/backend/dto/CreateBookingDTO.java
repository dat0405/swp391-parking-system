package com.tatdat.parking.backend.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateBookingDTO {

    private Integer userId;

    private Integer vehicleId;

    private Integer slotId;

    private LocalDateTime startTime;

    private LocalDateTime endTime;
}