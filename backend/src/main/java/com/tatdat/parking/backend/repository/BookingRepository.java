package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Integer> {
    Optional<Booking> findByVehicleIdAndSlotId(Integer vehicleId, Integer slotId);
}