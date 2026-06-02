package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.ParkingSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface ParkingSessionRepository
        extends JpaRepository<ParkingSession, Integer> {

    long countByCheckInTimeBetween(
            LocalDateTime start,
            LocalDateTime end
    );

    long countByCheckOutTimeBetween(
            LocalDateTime start,
            LocalDateTime end
    );
}