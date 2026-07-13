package com.tatdat.parking.backend.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateParkingFloorRequest {

    private Integer facilityId;

    private String floorName;
}