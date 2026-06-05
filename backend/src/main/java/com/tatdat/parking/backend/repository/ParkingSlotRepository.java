package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.ParkingSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Integer> {

    List<ParkingSlot> findByZoneId(Integer zoneId);

    List<ParkingSlot> findByStatus(String status);

    List<ParkingSlot> findByVehicleType_IdAndStatus(Integer vehicleTypeId, String status);

    long countByStatus(String status);
}