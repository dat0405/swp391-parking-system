package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VehicleRepository extends JpaRepository<Vehicle, Integer> {

    Optional<Vehicle> findByLicensePlate(String licensePlate);

    Optional<Vehicle> findByLicensePlateIgnoreCase(String licensePlate);

    boolean existsByLicensePlateIgnoreCase(String licensePlate);
}