package com.tatdat.parking.backend.service.impl;

import com.tatdat.parking.backend.dto.DashboardDTO;
import com.tatdat.parking.backend.dto.OccupancyReportDTO;
import com.tatdat.parking.backend.dto.RevenueReportDTO;
import com.tatdat.parking.backend.dto.VehicleTrafficDTO;
import com.tatdat.parking.backend.repository.ParkingSessionRepository;
import com.tatdat.parking.backend.repository.ParkingSlotRepository;
import com.tatdat.parking.backend.repository.PaymentRepository;
import com.tatdat.parking.backend.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private final PaymentRepository paymentRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingSessionRepository parkingSessionRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public RevenueReportDTO getRevenueReport() {
        BigDecimal checkoutRevenue = getCheckoutRevenue();
        BigDecimal bookingRevenue = getBookingRevenue();

        BigDecimal revenue = checkoutRevenue.add(bookingRevenue);

        long checkoutTransactions = paymentRepository.countByPaymentStatus("PAID");
        long bookingTransactions = getPaidBookingTransactionCount();

        return new RevenueReportDTO(
                revenue,
                checkoutTransactions + bookingTransactions
        );
    }

    @Override
    public OccupancyReportDTO getOccupancyReport() {
        long totalSlots = parkingSlotRepository.count();

        long occupiedSlots =
                parkingSlotRepository.countByStatusIgnoreCase("OCCUPIED");

        long availableSlots =
                parkingSlotRepository.countByStatusIgnoreCase("AVAILABLE");

        long reservedSlots =
                parkingSlotRepository.countByStatusIgnoreCase("RESERVED");

        double occupancyRate =
                totalSlots == 0
                        ? 0
                        : ((double) occupiedSlots / totalSlots) * 100;

        return new OccupancyReportDTO(
                totalSlots,
                occupiedSlots,
                availableSlots,
                reservedSlots,
                occupancyRate
        );
    }

    @Override
    public VehicleTrafficDTO getVehicleTraffic() {
        LocalDate today = LocalDate.now();

        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay();

        long checkIns =
                parkingSessionRepository.countByCheckInTimeBetween(start, end);

        long checkOuts =
                parkingSessionRepository.countByCheckOutTimeBetween(start, end);

        return new VehicleTrafficDTO(
                checkIns,
                checkOuts
        );
    }

    @Override
    public DashboardDTO getDashboard() {
        RevenueReportDTO revenue = getRevenueReport();
        OccupancyReportDTO occupancy = getOccupancyReport();
        VehicleTrafficDTO traffic = getVehicleTraffic();

        return new DashboardDTO(
                revenue.getTotalRevenue(),
                occupancy.getTotalSlots(),
                occupancy.getOccupiedSlots(),
                occupancy.getAvailableSlots(),
                occupancy.getReservedSlots(),
                traffic.getTodayCheckIns(),
                traffic.getTodayCheckOuts()
        );
    }

    private BigDecimal getCheckoutRevenue() {
        BigDecimal revenue = paymentRepository.getTotalRevenue();

        return revenue == null ? BigDecimal.ZERO : revenue;
    }

    private BigDecimal getBookingRevenue() {
        if (!tableExists("bookings") || !columnExists("bookings", "payment_amount")) {
            return BigDecimal.ZERO;
        }

        /*
         * Booking revenue must depend on payment_status, not booking status.
         * A paid booking can later become COMPLETED after checkout, but revenue
         * must remain counted.
         */
        String sql = """
                SELECT COALESCE(SUM(payment_amount), 0)
                FROM bookings
                WHERE UPPER(payment_status) = 'PAID'
                  AND paid_at IS NOT NULL
                """;

        Object result = jdbcTemplate.queryForObject(sql, Object.class);

        return toBigDecimal(result);
    }

    private long getPaidBookingTransactionCount() {
        if (!tableExists("bookings")) {
            return 0;
        }

        String sql = """
                SELECT COUNT(*)
                FROM bookings
                WHERE UPPER(payment_status) = 'PAID'
                  AND paid_at IS NOT NULL
                """;

        Long count = jdbcTemplate.queryForObject(sql, Long.class);

        return count == null ? 0 : count;
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
}
