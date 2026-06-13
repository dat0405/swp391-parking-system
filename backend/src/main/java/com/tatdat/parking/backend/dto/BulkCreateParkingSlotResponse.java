package com.tatdat.parking.backend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkCreateParkingSlotResponse {

    private Integer createdCount;

    private Integer floorId;

    private String floorName;

    private Integer vehicleTypeId;

    private String vehicleTypeName;

    private String message;
}