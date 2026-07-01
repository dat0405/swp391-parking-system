package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Integer> {

    Optional<Booking> findByVehicleIdAndSlotId(Integer vehicleId, Integer slotId);

    List<Booking> findAllByOrderByBookingTimeDesc();

    List<Booking> findByUserIdOrderByBookingTimeDesc(Integer userId);

    List<Booking> findByStatusOrderByBookingTimeDesc(String status);

    @Query("""
            SELECT b
            FROM Booking b
            WHERE b.slot.id = :slotId
              AND b.status IN ('PENDING', 'CONFIRMED')
              AND b.startTime < :endTime
              AND b.endTime > :startTime
            """)
    List<Booking> findOverlappingBookings(
            @Param("slotId") Integer slotId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime
    );

    @Query("""
            SELECT DISTINCT b.slot.id
            FROM Booking b
            WHERE b.status IN ('PENDING', 'CONFIRMED')
              AND b.startTime < :endTime
              AND b.endTime > :startTime
            """)
    List<Integer> findBookedSlotIdsBetween(
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime
    );
}