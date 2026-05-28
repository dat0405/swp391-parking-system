package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.entity.ParkingFacility;
import com.tatdat.parking.backend.repository.ParkingFacilityRepository;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/parking-facilities")
public class ParkingFacilityController {

    private final ParkingFacilityRepository parkingFacilityRepository;

    public ParkingFacilityController(ParkingFacilityRepository parkingFacilityRepository) {
        this.parkingFacilityRepository = parkingFacilityRepository;
    }

    @GetMapping
    public List<ParkingFacility> getAllParkingFacilities() {
        return parkingFacilityRepository.findAll();
    }

    @PostMapping
    public ParkingFacility createParkingFacility(@RequestBody ParkingFacility parkingFacility) {
        return parkingFacilityRepository.save(parkingFacility);
    }

    @GetMapping("/{id}")
    public ParkingFacility getParkingFacilityById(@PathVariable Integer id) {
        return parkingFacilityRepository.findById(id).orElse(null);
    }
    @DeleteMapping("/{id}")
    public String deleteParkingFacility(@PathVariable Integer id) {

        parkingFacilityRepository.deleteById(id);

        return "Deleted Successfully";
    }

    @PutMapping("/{id}")
    public ParkingFacility updateParkingFacility(
            @PathVariable Integer id,
            @RequestBody ParkingFacility updatedFacility
    ) {
        ParkingFacility parkingFacility =
                parkingFacilityRepository.findById(id).orElse(null);

        if (parkingFacility != null) {
            parkingFacility.setFacilityName(updatedFacility.getFacilityName());
            parkingFacility.setAddress(updatedFacility.getAddress());
            parkingFacility.setStatus(updatedFacility.getStatus());

            return parkingFacilityRepository.save(parkingFacility);
        }

        return null;
    }


}