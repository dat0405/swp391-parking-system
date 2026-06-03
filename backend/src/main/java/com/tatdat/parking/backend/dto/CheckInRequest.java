package com.tatdat.parking.backend.dto;

import lombok.Data;

@Data
public class CheckInRequest {

    private String licensePlate;

    private Integer vehicleTypeId;
}