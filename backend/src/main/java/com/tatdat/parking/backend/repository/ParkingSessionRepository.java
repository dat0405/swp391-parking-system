package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.ParkingSession;
import org.springframework.data.jpa.repository.JpaRepository;

 feature/be-auth
import java.time.LocalDateTime;

 main
import java.util.List;
import java.util.Optional;

public interface ParkingSessionRepository extends JpaRepository<ParkingSession, Integer> {

    long countByStatus(String status);

    boolean existsByTicketId(String ticketId);

    List<ParkingSession> findByStatusOrderByCheckInTimeDesc(String status);

    Optional<ParkingSession> findFirstByVehicle_LicensePlateAndStatus(
            String licensePlate,
            String status
    );

    Optional<ParkingSession> findFirstByTicketIdAndStatus(
            String ticketId,
            String status
    );
feature/be-auth

    long countByCheckInTimeBetween(
            LocalDateTime start,
            LocalDateTime end
    );

    long countByCheckOutTimeBetween(
            LocalDateTime start,
            LocalDateTime end
    );
 main
}