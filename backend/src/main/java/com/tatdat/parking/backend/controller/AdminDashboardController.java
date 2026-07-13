package com.tatdat.parking.backend.controller;

import com.tatdat.parking.backend.dto.AdminDashboardResponse;
import com.tatdat.parking.backend.dto.DashboardTrendResponse;
import com.tatdat.parking.backend.repository.ParkingFacilityRepository;
import com.tatdat.parking.backend.repository.ParkingSessionRepository;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import com.tatdat.parking.backend.repository.PaymentRepository;
import com.tatdat.parking.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final UserRepository userRepository;
    private final ParkingFacilityRepository parkingFacilityRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingSessionRepository parkingSessionRepository;
    private final PaymentRepository paymentRepository;
    private final JdbcTemplate jdbcTemplate;

    @GetMapping("/dashboard")
    public AdminDashboardResponse getDashboard() {
        long totalSlots = parkingSlotRepository.count();

        long availableSlots = parkingSlotRepository.countByStatusIgnoreCase("AVAILABLE");
        long occupiedSlots = parkingSlotRepository.countByStatusIgnoreCase("OCCUPIED");
        long reservedSlots = parkingSlotRepository.countByStatusIgnoreCase("RESERVED");
        long maintenanceSlots = parkingSlotRepository.countByStatusIgnoreCase("MAINTENANCE");

        long activeOccupancy = parkingSessionRepository.countByStatus("ACTIVE");

        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.plusDays(1).atStartOfDay();

        BigDecimal checkoutRevenue = getTodayCheckoutRevenue(startOfDay, endOfDay);
        BigDecimal bookingRevenue = getTodayBookingRevenue(startOfDay, endOfDay);

        BigDecimal todayRevenue = checkoutRevenue.add(bookingRevenue);

        return AdminDashboardResponse.builder()
                .totalUsers(userRepository.count())
                .activeUsers(userRepository.countByStatus("ACTIVE"))
                .bannedUsers(userRepository.countByStatus("BANNED"))
                .inactiveUsers(userRepository.countByStatus("INACTIVE"))

                .totalParkingFacilities(parkingFacilityRepository.count())
                .totalParkingSlots(totalSlots)

                .totalSlots(totalSlots)
                .activeOccupancy(activeOccupancy)
                .availableSlots(availableSlots)
                .occupiedSlots(occupiedSlots)
                .reservedSlots(reservedSlots)
                .maintenanceSlots(maintenanceSlots)

                .todayRevenue(todayRevenue.doubleValue())
                .pendingRes(0)
                .build();
    }

    @GetMapping("/dashboard/trends")
    public List<DashboardTrendResponse> getDashboardTrends(
            @RequestParam(defaultValue = "DAILY") String mode
    ) {
        String normalizedMode = mode == null ? "DAILY" : mode.trim().toUpperCase();

        if ("WEEKLY".equals(normalizedMode)) {
            return getWeeklyTrend();
        }

        return getDailyTrend();
    }

    private BigDecimal getTodayCheckoutRevenue(LocalDateTime startOfDay, LocalDateTime endOfDay) {
        BigDecimal checkoutRevenue = paymentRepository.sumTodayRevenue(startOfDay, endOfDay);

        return checkoutRevenue == null ? BigDecimal.ZERO : checkoutRevenue;
    }

    private BigDecimal getTodayBookingRevenue(LocalDateTime startOfDay, LocalDateTime endOfDay) {
        /*
         * Booking revenue must depend on payment_status, not booking status.
         * A paid booking can move CONFIRMED -> CHECKED_IN -> COMPLETED.
         * Revenue must still remain counted after checkout.
         */
        if (!tableExists("bookings")
                || !columnExists("bookings", "payment_amount")
                || !columnExists("bookings", "payment_status")
                || !columnExists("bookings", "paid_at")) {
            return BigDecimal.ZERO;
        }

        String sql = """
                SELECT COALESCE(SUM(payment_amount), 0)
                FROM bookings
                WHERE UPPER(payment_status) = 'PAID'
                  AND paid_at IS NOT NULL
                  AND paid_at >= ?
                  AND paid_at < ?
                """;

        Object result = jdbcTemplate.queryForObject(
                sql,
                Object.class,
                Timestamp.valueOf(startOfDay),
                Timestamp.valueOf(endOfDay)
        );

        return toBigDecimal(result);
    }

    private boolean tableExists(String tableName) {
        String sql = """
                SELECT COUNT(*)
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_NAME = ?
                """;

        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, tableName);

        return count != null && count > 0;
    }

    private boolean columnExists(String tableName, String columnName) {
        String sql = """
                SELECT COUNT(*)
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = ?
                  AND COLUMN_NAME = ?
                """;

        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, tableName, columnName);

        return count != null && count > 0;
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }

        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }

        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }

        try {
            return new BigDecimal(String.valueOf(value));
        } catch (Exception exception) {
            return BigDecimal.ZERO;
        }
    }

    private List<DashboardTrendResponse> getDailyTrend() {
        LocalDate today = LocalDate.now();

        List<DashboardTrendResponse> trends = new ArrayList<>();

        trends.add(buildTrendItem(
                "00-04",
                today.atTime(0, 0),
                today.atTime(4, 0)
        ));

        trends.add(buildTrendItem(
                "04-08",
                today.atTime(4, 0),
                today.atTime(8, 0)
        ));

        trends.add(buildTrendItem(
                "08-12",
                today.atTime(8, 0),
                today.atTime(12, 0)
        ));

        trends.add(buildTrendItem(
                "12-16",
                today.atTime(12, 0),
                today.atTime(16, 0)
        ));

        trends.add(buildTrendItem(
                "16-20",
                today.atTime(16, 0),
                today.atTime(20, 0)
        ));

        trends.add(buildTrendItem(
                "20-24",
                today.atTime(20, 0),
                today.plusDays(1).atStartOfDay()
        ));

        return trends;
    }

    private List<DashboardTrendResponse> getWeeklyTrend() {
        LocalDate today = LocalDate.now();
        LocalDate monday = today.with(DayOfWeek.MONDAY);

        List<DashboardTrendResponse> trends = new ArrayList<>();

        trends.add(buildTrendItem(
                "Mon",
                monday.atStartOfDay(),
                monday.plusDays(1).atStartOfDay()
        ));

        trends.add(buildTrendItem(
                "Tue",
                monday.plusDays(1).atStartOfDay(),
                monday.plusDays(2).atStartOfDay()
        ));

        trends.add(buildTrendItem(
                "Wed",
                monday.plusDays(2).atStartOfDay(),
                monday.plusDays(3).atStartOfDay()
        ));

        trends.add(buildTrendItem(
                "Thu",
                monday.plusDays(3).atStartOfDay(),
                monday.plusDays(4).atStartOfDay()
        ));

        trends.add(buildTrendItem(
                "Fri",
                monday.plusDays(4).atStartOfDay(),
                monday.plusDays(5).atStartOfDay()
        ));

        trends.add(buildTrendItem(
                "Sat",
                monday.plusDays(5).atStartOfDay(),
                monday.plusDays(6).atStartOfDay()
        ));

        trends.add(buildTrendItem(
                "Sun",
                monday.plusDays(6).atStartOfDay(),
                monday.plusDays(7).atStartOfDay()
        ));

        return trends;
    }

    private DashboardTrendResponse buildTrendItem(
            String label,
            LocalDateTime start,
            LocalDateTime end
    ) {
        long count = parkingSessionRepository.countByCheckInTimeBetween(start, end);

        return DashboardTrendResponse.builder()
                .label(label)
                .value(count)
                .build();
    }
}
