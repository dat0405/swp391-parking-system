package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.ParkingFacility;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParkingFacilityRepository extends JpaRepository<ParkingFacility, Integer> {
}