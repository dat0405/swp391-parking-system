package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.entity.ParkingFloor;
import com.tatdat.parking.backend.repository.ParkingFloorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/parking-floors")
@RequiredArgsConstructor
public class ParkingFloorController {

    private final ParkingFloorRepository parkingFloorRepository;

    @GetMapping
    public List<ParkingFloor> getAllParkingFloors() {
        return parkingFloorRepository.findAll();
    }

    @GetMapping("/facility/{facilityId}")
    public List<ParkingFloor> getFloorsByFacility(@PathVariable Integer facilityId) {
        return parkingFloorRepository.findByFacilityId(facilityId);
    }
}