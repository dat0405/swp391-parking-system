package com.tatdat.parking.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateBookingRequest {

    @NotNull(message = "User ID is required")
    private Integer userId;

    @NotNull(message = "Slot ID is required")
    private Integer slotId;

    @NotNull(message = "Vehicle type ID is required")
    private Integer vehicleTypeId;

    @NotBlank(message = "License plate is required")
    private String licensePlate;

    private String color;

    @NotNull(message = "Start time is required")
    private LocalDateTime startTime;

    @NotNull(message = "End time is required")
    private LocalDateTime endTime;
}