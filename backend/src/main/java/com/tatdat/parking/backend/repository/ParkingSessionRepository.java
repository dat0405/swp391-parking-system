package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.ParkingSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ParkingSessionRepository extends JpaRepository<ParkingSession, Integer> {

    long countByStatus(String status);

    Optional<ParkingSession> findFirstByVehicle_LicensePlateAndStatus(
            String licensePlate,
            String status
    );
}