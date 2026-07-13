package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.ParkingZone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParkingZoneRepository extends JpaRepository<ParkingZone, Integer> {

    List<ParkingZone> findByFloorId(Integer floorId);

    Optional<ParkingZone> findFirstByFloorIdOrderByIdAsc(Integer floorId);
}