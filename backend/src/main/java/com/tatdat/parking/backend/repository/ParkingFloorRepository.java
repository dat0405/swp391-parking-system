package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.ParkingFloor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ParkingFloorRepository extends JpaRepository<ParkingFloor, Integer> {
    List<ParkingFloor> findByFacilityId(Integer facilityId);
}