package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.entity.Vehicle;
import com.tatdat.parking.backend.repository.VehicleRepository;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleRepository vehicleRepository;

    public VehicleController(VehicleRepository vehicleRepository) {
        this.vehicleRepository = vehicleRepository;
    }

    @GetMapping
    public List<Vehicle> getAllVehicles() {
        return vehicleRepository.findAll();
    }

    @GetMapping("/{id}")
    public Vehicle getVehicleById(@PathVariable Integer id) {
        return vehicleRepository.findById(id).orElse(null);
    }

    @PostMapping
    public Vehicle addVehicle(@RequestBody Vehicle vehicle) {
        vehicle.setCreatedAt(LocalDateTime.now());
        return vehicleRepository.save(vehicle);
    }

    @PutMapping("/{id}")
    public Vehicle updateVehicle(
            @PathVariable Integer id,
            @RequestBody Vehicle updatedVehicle
    ) {
        Vehicle vehicle = vehicleRepository.findById(id).orElse(null);

        if (vehicle != null) {
            vehicle.setVehicleType(updatedVehicle.getVehicleType());
            vehicle.setLicensePlate(updatedVehicle.getLicensePlate());
            vehicle.setColor(updatedVehicle.getColor());

            return vehicleRepository.save(vehicle);
        }

        return null;
    }

    @DeleteMapping("/{id}")
    public String deleteVehicle(@PathVariable Integer id) {
        vehicleRepository.deleteById(id);
        return "Deleted Successfully";
    }

    @GetMapping("/user/{userId}/history")
    public List<Vehicle> getVehicleHistoryByUser(@PathVariable Integer userId) {
        return vehicleRepository.findByUserId(userId);
    }
}