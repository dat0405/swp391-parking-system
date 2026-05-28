package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.entity.ParkingZone;
import com.tatdat.parking.backend.repository.ParkingZoneRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/parking-zones")
public class ParkingZoneController {

    private final ParkingZoneRepository parkingZoneRepository;

    public ParkingZoneController(ParkingZoneRepository parkingZoneRepository) {
        this.parkingZoneRepository = parkingZoneRepository;
    }

    @GetMapping
    public List<ParkingZone> getAllParkingZones() {
        return parkingZoneRepository.findAll();
    }

    @GetMapping("/floor/{floorId}")
    public List<ParkingZone> getZonesByFloor(@PathVariable Integer floorId) {
        return parkingZoneRepository.findByFloorId(floorId);
    }
}