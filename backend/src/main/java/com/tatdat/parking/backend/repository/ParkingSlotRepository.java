package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.dto.ParkingFloorStatsResponse;
import com.tatdat.parking.backend.entity.ParkingSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ParkingSlotRepository extends JpaRepository<ParkingSlot, Integer> {

    List<ParkingSlot> findByZoneId(Integer zoneId);

    List<ParkingSlot> findByZone_Floor_Id(Integer floorId);

    List<ParkingSlot> findByStatusIgnoreCase(String status);

    Optional<ParkingSlot> findByIdAndStatusIgnoreCase(Integer id, String status);

    Optional<ParkingSlot> findBySlotCodeIgnoreCase(String slotCode);

    List<ParkingSlot> findByVehicleType_IdAndStatusIgnoreCase(
            Integer vehicleTypeId,
            String status
    );

    List<ParkingSlot> findByVehicleType_IdAndZone_Floor_IdAndStatusIgnoreCase(
            Integer vehicleTypeId,
            Integer floorId,
            String status
    );

    List<ParkingSlot> findByZone_Floor_IdAndVehicleType_IdAndStatusIgnoreCase(
            Integer floorId,
            Integer vehicleTypeId,
            String status
    );

    List<ParkingSlot> findByZone_Floor_IdAndVehicleType_TypeNameIgnoreCaseAndStatusIgnoreCase(
            Integer floorId,
            String typeName,
            String status
    );

    long countByStatusIgnoreCase(String status);

    long countByZone_Floor_Id(Integer floorId);

    long countByZone_Floor_IdAndVehicleType_Id(Integer floorId, Integer vehicleTypeId);

    long countByZone_Floor_IdAndVehicleType_IdAndStatusIgnoreCase(
            Integer floorId,
            Integer vehicleTypeId,
            String status
    );

    @Query("""
            SELECT new com.tatdat.parking.backend.dto.ParkingFloorStatsResponse(
                f.id,
                f.floorName,
                vt.id,
                vt.typeName,
                SUM(CASE WHEN UPPER(s.status) = 'AVAILABLE' THEN 1L ELSE 0L END),
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

    /*
     * Dùng cho check-in khách vãng lai.
     *
     * Luồng mới:
     * - Nhân viên không chọn floor nữa.
     * - Backend tự tìm slot AVAILABLE đầu tiên theo vehicle type.
     * - Tự bỏ qua RESERVED / OCCUPIED / MAINTENANCE vì chỉ lấy status AVAILABLE.
     * - Sắp xếp từ tầng đầu tới tầng cuối.
     */
    @Query("""
            SELECT s
            FROM ParkingSlot s
            WHERE s.vehicleType.id = :vehicleTypeId
              AND UPPER(s.status) = 'AVAILABLE'
            ORDER BY s.zone.floor.id ASC, s.id ASC
            """)
    List<ParkingSlot> findAvailableSlotsForAutoCheckIn(
            @Param("vehicleTypeId") Integer vehicleTypeId
    );

    /*
     * Dùng cho Booking.
     *
     * Lấy tất cả slot có thể đặt trước theo loại xe và khoảng thời gian.
     *
     * Điều kiện:
     * - Đúng loại xe.
     * - Không lấy slot OCCUPIED.
     * - Không lấy slot MAINTENANCE.
     * - Không lấy slot đã bị booking trùng thời gian.
     *
     * Lưu ý:
     * RESERVED vẫn có thể xuất hiện ở bảng parking_slots,
     * nhưng nếu RESERVED đó đến từ booking trùng thời gian thì query con sẽ loại ra.
     */
    @Query("""
            SELECT s
            FROM ParkingSlot s
            WHERE s.vehicleType.id = :vehicleTypeId
              AND UPPER(s.status) NOT IN ('OCCUPIED', 'MAINTENANCE')
              AND s.id NOT IN (
                  SELECT b.slot.id
                  FROM Booking b
                  WHERE b.status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN')
                    AND b.startTime < :endTime
                    AND b.endTime > :startTime
              )
            ORDER BY s.zone.floor.id ASC, s.id ASC
            """)
    List<ParkingSlot> findBookableSlotsByVehicleType(
            @Param("vehicleTypeId") Integer vehicleTypeId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime
    );

    /*
     * Dùng nếu sau này vẫn muốn lọc booking theo tầng cụ thể.
     * Hiện tại user flow mới không cần chọn floor,
     * nhưng giữ lại để không làm vỡ code cũ.
     */
    @Query("""
            SELECT s
            FROM ParkingSlot s
            WHERE s.vehicleType.id = :vehicleTypeId
              AND s.zone.floor.id = :floorId
              AND UPPER(s.status) NOT IN ('OCCUPIED', 'MAINTENANCE')
              AND s.id NOT IN (
                  SELECT b.slot.id
                  FROM Booking b
                  WHERE b.status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN')
                    AND b.startTime < :endTime
                    AND b.endTime > :startTime
              )
            ORDER BY s.zone.floor.id ASC, s.id ASC
            """)
    List<ParkingSlot> findBookableSlotsByVehicleTypeAndFloor(
            @Param("vehicleTypeId") Integer vehicleTypeId,
            @Param("floorId") Integer floorId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime
    );
}