package com.tatdat.parking.backend.repository;

import com.tatdat.parking.backend.entity.Booking;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Integer> {

    Optional<Booking> findByVehicleIdAndSlotId(Integer vehicleId, Integer slotId);

    Optional<Booking> findByPaymentOrderCode(Long paymentOrderCode);

    List<Booking> findAllByOrderByBookingTimeDesc();

    List<Booking> findByUserIdOrderByBookingTimeDesc(Integer userId);

    List<Booking> findByStatusOrderByBookingTimeDesc(String status);

    @Query("""
            SELECT b
            FROM Booking b
            JOIN b.vehicle v
            WHERE UPPER(v.licensePlate) = UPPER(:licensePlate)
              AND b.status = 'CONFIRMED'
              AND b.startTime <= :now
              AND b.endTime >= :now
            ORDER BY b.startTime ASC
            """)
    List<Booking> findValidConfirmedBookingsForCheckIn(
            @Param("licensePlate") String licensePlate,
            @Param("now") LocalDateTime now
    );

    @Query("""
            SELECT b
            FROM Booking b
            JOIN b.vehicle v
            WHERE UPPER(v.licensePlate) = UPPER(:licensePlate)
              AND b.status = 'CHECKED_IN'
            ORDER BY b.checkedInAt DESC
            """)
    List<Booking> findCheckedInBookingsByLicensePlate(
            @Param("licensePlate") String licensePlate
    );

    @Query("""
            SELECT b
            FROM Booking b
            WHERE b.slot.id = :slotId
              AND b.status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN')
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
            WHERE b.status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN')
              AND b.startTime < :endTime
              AND b.endTime > :startTime
            """)
    List<Integer> findBookedSlotIdsBetween(
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime
    );

    @Query("""
            SELECT b
            FROM Booking b
            WHERE b.status = 'PENDING_PAYMENT'
              AND b.paymentStatus = 'PENDING'
              AND b.paymentExpiredAt IS NOT NULL
              AND b.paymentExpiredAt <= :now
            ORDER BY b.paymentExpiredAt ASC
            """)
    List<Booking> findExpiredPendingPaymentBookings(
            @Param("now") LocalDateTime now
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT b
            FROM Booking b
            WHERE b.status = 'PENDING_PAYMENT'
              AND b.paymentStatus = 'PENDING'
              AND b.paymentExpiredAt IS NOT NULL
              AND b.paymentExpiredAt <= :now
            ORDER BY b.paymentExpiredAt ASC
            """)
    List<Booking> findExpiredPendingPaymentBookingsForUpdate(
            @Param("now") LocalDateTime now
    );

    @Query("""
            SELECT b
            FROM Booking b
            WHERE b.user.id = :userId
              AND b.status = 'PENDING_PAYMENT'
              AND b.paymentStatus = 'PENDING'
              AND b.paymentExpiredAt IS NOT NULL
              AND b.paymentExpiredAt > :now
            ORDER BY b.bookingTime DESC
            """)
    List<Booking> findActivePendingPaymentsByUser(
            @Param("userId") Integer userId,
            @Param("now") LocalDateTime now
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT b
            FROM Booking b
            WHERE b.paymentOrderCode = :orderCode
            """)
    Optional<Booking> findByPaymentOrderCodeForUpdate(
            @Param("orderCode") Long orderCode
    );

    @Query("""
            SELECT b
            FROM Booking b
            WHERE b.status = 'CONFIRMED'
              AND b.startTime < :now
            """)
    List<Booking> findConfirmedBookingsPastStartTime(
            @Param("now") LocalDateTime now
    );

    /*
     * Backward-compatible bulk method for old code.
     * New scheduler logic uses row locking and saveAll instead.
     */
    @Modifying(
            clearAutomatically = true,
            flushAutomatically = true
    )
    @Query("""
            UPDATE Booking b
            SET b.status = 'CANCELLED',
                b.paymentStatus = 'EXPIRED',
                b.cancelledAt = :now
            WHERE b.status = 'PENDING_PAYMENT'
              AND b.paymentStatus = 'PENDING'
              AND b.paymentExpiredAt IS NOT NULL
              AND b.paymentExpiredAt <= :now
            """)
    int expirePendingPaymentBookings(
            @Param("now") LocalDateTime now
    );

}
