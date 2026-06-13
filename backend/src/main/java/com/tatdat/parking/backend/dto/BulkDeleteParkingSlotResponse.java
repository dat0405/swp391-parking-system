package com.tatdat.parking.backend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkDeleteParkingSlotResponse {

    private Integer deletedCount;

    private Integer requestedQuantity;

    private Integer floorId;

    private String floorName;

    private Integer vehicleTypeId;

    private String vehicleTypeName;

    private String message;
}