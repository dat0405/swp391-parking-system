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

    @GetMapping("/{id}")
    public VehicleType getVehicleTypeById(@PathVariable Integer id) {
        return vehicleTypeRepository.findById(id).orElse(null);
    }

    @PostMapping
    public VehicleType createVehicleType(@RequestBody VehicleType vehicleType) {
        return vehicleTypeRepository.save(vehicleType);
    }

    @PutMapping("/{id}")
    public VehicleType updateVehicleType(@PathVariable Integer id, @RequestBody VehicleType updatedType) {
        VehicleType existingType = vehicleTypeRepository.findById(id).orElse(null);
        if (existingType != null) {
            existingType.setTypeName(updatedType.getTypeName());
            existingType.setDescription(updatedType.getDescription());
            return vehicleTypeRepository.save(existingType);
        }
        return null;
    }

    @DeleteMapping("/{id}")
    public String deleteVehicleType(@PathVariable Integer id) {
        vehicleTypeRepository.deleteById(id);
        return "Deleted Successfully";
    }
}