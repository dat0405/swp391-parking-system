package com.tatdat.parking.backend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkCreateParkingSlotRequest {

    private Integer floorId;

    private Integer vehicleTypeId;

    private Integer quantity;
}