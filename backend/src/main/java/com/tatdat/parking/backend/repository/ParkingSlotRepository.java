package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.dto.ParkingFloorStatsResponse;
import com.tatdat.parking.backend.entity.ParkingSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Integer> {

    List<ParkingSlot> findByZoneId(Integer zoneId);

    List<ParkingSlot> findByStatus(String status);

    List<ParkingSlot> findByVehicleType_IdAndStatus(Integer vehicleTypeId, String status);

    List<ParkingSlot> findByVehicleType_IdAndZone_Floor_IdAndStatus(
            Integer vehicleTypeId,
            Integer floorId,
            String status
    );

    long countByStatus(String status);

    @Query("""
            SELECT new com.tatdat.parking.backend.dto.ParkingFloorStatsResponse(
                f.id,
                f.floorName,
                vt.id,
                vt.typeName,
                SUM(CASE WHEN s.status = 'AVAILABLE' THEN 1L ELSE 0L END),
                COUNT(s.id)
            )
            FROM ParkingSlot s
            JOIN s.zone z
            JOIN z.floor f
            JOIN s.vehicleType vt
            GROUP BY f.id, f.floorName, vt.id, vt.typeName
            ORDER BY f.id, vt.id
            """)
    List<ParkingFloorStatsResponse> getParkingFloorStats();
}