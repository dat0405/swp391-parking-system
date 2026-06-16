package com.tatdat.parking.backend.dto;

import lombok.Data;

@Data
public class UpdateBookingVehicleDTO {

    private String licensePlate;

    private String color;

    private String reason;

    private Integer handledByUserId;
}