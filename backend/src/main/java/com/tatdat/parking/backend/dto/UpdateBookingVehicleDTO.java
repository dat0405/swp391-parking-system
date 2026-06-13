package com.tatdat.parking.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateBookingVehicleDTO {

    private String licensePlate;

    private String color;

    private String reason;

    @NotNull(message = "Handled by user ID is required")
    private Integer handledByUserId;
}