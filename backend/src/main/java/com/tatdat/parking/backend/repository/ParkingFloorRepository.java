package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.ParkingFloor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParkingFloorRepository extends JpaRepository<ParkingFloor, Integer> {

    List<ParkingFloor> findByFacilityId(Integer facilityId);

    boolean existsByFacilityIdAndFloorNameIgnoreCase(
            Integer facilityId,
            String floorName
    );
}