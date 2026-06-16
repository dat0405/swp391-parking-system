package com.tatdat.parking.backend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkDeleteParkingSlotRequest {

    private Integer floorId;

    private Integer vehicleTypeId;

    private Integer quantity;
}