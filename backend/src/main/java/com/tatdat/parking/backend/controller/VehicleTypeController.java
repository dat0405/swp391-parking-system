package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.entity.VehicleType;
import com.tatdat.parking.backend.repository.VehicleTypeRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicle-types")
public class VehicleTypeController {

    private final VehicleTypeRepository vehicleTypeRepository;

    public VehicleTypeController(VehicleTypeRepository vehicleTypeRepository) {
        this.vehicleTypeRepository = vehicleTypeRepository;
    }

    @GetMapping
    public List<VehicleType> getAllVehicleTypes() {
        return vehicleTypeRepository.findAll();
    }
}