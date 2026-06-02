package com.tatdat.parking.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class VehicleTrafficDTO {

    private Long todayCheckIns;

    private Long todayCheckOuts;
}
