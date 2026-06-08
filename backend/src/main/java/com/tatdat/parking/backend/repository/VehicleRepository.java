package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Integer> {

    Optional<Vehicle> findByLicensePlate(String licensePlate);

    List<Vehicle> findByUserId(Integer userId);
}