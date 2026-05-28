package com.tatdat.parking.backend.dto;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ParkingSlotRequest {

    private int zoneId;

    private int vehicleTypeId;

    private String slotCode;

    private String status;


}