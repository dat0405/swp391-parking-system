package com.tatdat.parking.backend.service.impl;

import com.tatdat.parking.backend.dto.DashboardDTO;
import com.tatdat.parking.backend.dto.MonthlyComparisonResponse;
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
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private static final int MIN_COMPARISON_MONTHS = 1;
    private static final int MAX_COMPARISON_MONTHS = 12;

    private static final String STATUS_PAID = "PAID";
    private static final String STATUS_COMPLETED = "COMPLETED";
    private static final String STATUS_CANCELLED = "CANCELLED";

    private static final DateTimeFormatter MONTH_LABEL_FORMATTER =
            DateTimeFormatter.ofPattern(
                    "MMM yyyy",
                    Locale.ENGLISH
            );

    private final PaymentRepository paymentRepository;
    private final ParkingSlotRepository parkingSlotRepository;
    private final ParkingSessionRepository parkingSessionRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public RevenueReportDTO getRevenueReport() {
        BigDecimal checkoutRevenue =
                getCheckoutRevenue();

        BigDecimal bookingRevenue =
                getBookingRevenue();

        BigDecimal revenue =
                checkoutRevenue.add(
                        bookingRevenue
                );

        long checkoutTransactions =
                paymentRepository
                        .countByPaymentStatus(
                                STATUS_PAID
                        );

        long bookingTransactions =
                getPaidBookingTransactionCount();

        return new RevenueReportDTO(
                revenue,
                checkoutTransactions
                        + bookingTransactions
        );
    }

    @Override
    public OccupancyReportDTO getOccupancyReport() {
        long totalSlots =
                parkingSlotRepository.count();

        long occupiedSlots =
                parkingSlotRepository
                        .countByStatusIgnoreCase(
                                "OCCUPIED"
                        );

        long availableSlots =
                parkingSlotRepository
                        .countByStatusIgnoreCase(
                                "AVAILABLE"
                        );

        long reservedSlots =
                parkingSlotRepository
                        .countByStatusIgnoreCase(
                                "RESERVED"
                        );

        double occupancyRate =
                totalSlots == 0
                        ? 0
                        : (
                        (double) occupiedSlots
                        / totalSlots
                ) * 100;

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
        LocalDate today =
                LocalDate.now();

        LocalDateTime start =
                today.atStartOfDay();

        LocalDateTime end =
                today
                        .plusDays(1)
                        .atStartOfDay();

        long checkIns =
                parkingSessionRepository
                        .countByCheckInTimeBetween(
                                start,
                                end
                        );

        long checkOuts =
                parkingSessionRepository
                        .countByCheckOutTimeBetween(
                                start,
                                end
                        );

        return new VehicleTrafficDTO(
                checkIns,
                checkOuts
        );
    }

    @Override
    public DashboardDTO getDashboard() {
        RevenueReportDTO revenue =
                getRevenueReport();

        OccupancyReportDTO occupancy =
                getOccupancyReport();

        VehicleTrafficDTO traffic =
                getVehicleTraffic();

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

    /**
     * Lấy dữ liệu so sánh theo tháng.
     *
     * Hệ thống tải thêm một tháng ẩn ở phía trước để tính
     * phần trăm tăng/giảm cho tháng đầu tiên được trả về.
     *
     * Ví dụ months = 6:
     * - truy vấn 7 tháng;
     * - dùng tháng đầu làm mốc;
     * - trả về 6 tháng gần nhất.
     */
    @Override
    @Transactional(readOnly = true)
    public List<MonthlyComparisonResponse>
    getMonthlyComparison(
            int months
    ) {
        validateComparisonMonths(months);

        YearMonth currentMonth =
                YearMonth.now();

        YearMonth firstQueryMonth =
                currentMonth.minusMonths(
                        months
                );

        List<MonthlyComparisonResponse> allMonths =
                new ArrayList<>();

        /*
         * months + 1 vì cần thêm một tháng trước đó
         * để tính growth cho tháng đầu tiên trả về.
         */
        for (int index = 0; index <= months; index++) {
            YearMonth reportMonth =
                    firstQueryMonth.plusMonths(
                            index
                    );

            allMonths.add(
                    buildMonthlyReport(
                            reportMonth
                    )
            );
        }

        for (
                int index = 1;
                index < allMonths.size();
                index++
        ) {
            MonthlyComparisonResponse previous =
                    allMonths.get(
                            index - 1
                    );

            MonthlyComparisonResponse current =
                    allMonths.get(index);

            current.setRevenueGrowthPercent(
                    calculateGrowthPercent(
                            previous.getTotalRevenue(),
                            current.getTotalRevenue()
                    )
            );

            current.setSessionGrowthPercent(
                    calculateGrowthPercent(
                            previous.getTotalSessions(),
                            current.getTotalSessions()
                    )
            );

            current.setReservationGrowthPercent(
                    calculateGrowthPercent(
                            previous.getTotalReservations(),
                            current.getTotalReservations()
                    )
            );
        }

        /*
         * Bỏ tháng mốc ẩn, chỉ trả về đúng số tháng yêu cầu.
         */
        return new ArrayList<>(
                allMonths.subList(
                        1,
                        allMonths.size()
                )
        );
    }

    /**
     * Tạo báo cáo cho một tháng cụ thể.
     */
    private MonthlyComparisonResponse buildMonthlyReport(
            YearMonth reportMonth
    ) {
        LocalDateTime start =
                reportMonth
                        .atDay(1)
                        .atStartOfDay();

        LocalDateTime end =
                reportMonth
                        .plusMonths(1)
                        .atDay(1)
                        .atStartOfDay();

        BigDecimal checkoutRevenue =
                getCheckoutRevenueBetween(
                        start,
                        end
                );

        BigDecimal bookingRevenue =
                getBookingRevenueBetween(
                        start,
                        end
                );

        long checkoutPayments =
                getPaidCheckoutTransactionCountBetween(
                        start,
                        end
                );

        long bookingPayments =
                getPaidBookingTransactionCountBetween(
                        start,
                        end
                );

        long totalSessions =
                getParkingSessionCountBetween(
                        start,
                        end
                );

        long totalReservations =
                getBookingCountBetween(
                        start,
                        end
                );

        long completedReservations =
                getBookingCountByStatusBetween(
                        STATUS_COMPLETED,
                        start,
                        end
                );

        long cancelledReservations =
                getBookingCountByStatusBetween(
                        STATUS_CANCELLED,
                        start,
                        end
                );

        BigDecimal averageOccupancy =
                calculateAverageOccupancyBetween(
                        start,
                        end
                );

        return MonthlyComparisonResponse
                .builder()
                .year(
                        reportMonth.getYear()
                )
                .month(
                        reportMonth.getMonthValue()
                )
                .monthLabel(
                        reportMonth.format(
                                MONTH_LABEL_FORMATTER
                        )
                )
                .totalRevenue(
                        checkoutRevenue
                                .add(
                                        bookingRevenue
                                )
                                .setScale(
                                        2,
                                        RoundingMode.HALF_UP
                                )
                )
                .totalSessions(
                        totalSessions
                )
                .totalReservations(
                        totalReservations
                )
                .completedReservations(
                        completedReservations
                )
                .cancelledReservations(
                        cancelledReservations
                )
                .averageOccupancy(
                        averageOccupancy
                )
                .paymentCount(
                        checkoutPayments
                                + bookingPayments
                )
                .revenueGrowthPercent(
                        BigDecimal.ZERO
                )
                .sessionGrowthPercent(
                        BigDecimal.ZERO
                )
                .reservationGrowthPercent(
                        BigDecimal.ZERO
                )
                .build();
    }

    /**
     * Tổng doanh thu checkout trong khoảng thời gian.
     */
    private BigDecimal getCheckoutRevenueBetween(
            LocalDateTime start,
            LocalDateTime end
    ) {
        if (!tableExists("payments")) {
            return BigDecimal.ZERO;
        }

        String amountColumn =
                firstExistingColumn(
                        "payments",
                        List.of(
                                "amount",
                                "payment_amount",
                                "total_amount"
                        )
                );

        String statusColumn =
                firstExistingColumn(
                        "payments",
                        List.of(
                                "payment_status",
                                "status"
                        )
                );

        String paidTimeColumn =
                firstExistingColumn(
                        "payments",
                        List.of(
                                "paid_at",
                                "payment_time",
                                "created_at"
                        )
                );

        if (
                amountColumn == null
                        || statusColumn == null
                        || paidTimeColumn == null
        ) {
            return BigDecimal.ZERO;
        }

        String sql =
                "SELECT COALESCE(SUM("
                        + quoteIdentifier(
                        amountColumn
                )
                        + "), 0) "
                        + "FROM "
                        + quoteIdentifier(
                        "payments"
                )
                        + " WHERE UPPER("
                        + quoteIdentifier(
                        statusColumn
                )
                        + ") = ? "
                        + "AND "
                        + quoteIdentifier(
                        paidTimeColumn
                )
                        + " >= ? "
                        + "AND "
                        + quoteIdentifier(
                        paidTimeColumn
                )
                        + " < ?";

        Object result =
                jdbcTemplate.queryForObject(
                        sql,
                        Object.class,
                        STATUS_PAID,
                        start,
                        end
                );

        return toBigDecimal(result);
    }

    /**
     * Tổng doanh thu booking đã thanh toán trong tháng.
     */
    private BigDecimal getBookingRevenueBetween(
            LocalDateTime start,
            LocalDateTime end
    ) {
        if (
                !tableExists("bookings")
                        || !columnExists(
                        "bookings",
                        "payment_amount"
                )
                        || !columnExists(
                        "bookings",
                        "payment_status"
                )
                        || !columnExists(
                        "bookings",
                        "paid_at"
                )
        ) {
            return BigDecimal.ZERO;
        }

        String sql = """
                SELECT COALESCE(SUM(payment_amount), 0)
                FROM bookings
                WHERE UPPER(payment_status) = ?
                  AND paid_at IS NOT NULL
                  AND paid_at >= ?
                  AND paid_at < ?
                """;

        Object result =
                jdbcTemplate.queryForObject(
                        sql,
                        Object.class,
                        STATUS_PAID,
                        start,
                        end
                );

        return toBigDecimal(result);
    }

    /**
     * Đếm giao dịch checkout đã thanh toán trong tháng.
     */
    private long getPaidCheckoutTransactionCountBetween(
            LocalDateTime start,
            LocalDateTime end
    ) {
        if (!tableExists("payments")) {
            return 0L;
        }

        String statusColumn =
                firstExistingColumn(
                        "payments",
                        List.of(
                                "payment_status",
                                "status"
                        )
                );

        String paidTimeColumn =
                firstExistingColumn(
                        "payments",
                        List.of(
                                "paid_at",
                                "payment_time",
                                "created_at"
                        )
                );

        if (
                statusColumn == null
                        || paidTimeColumn == null
        ) {
            return 0L;
        }

        String sql =
                "SELECT COUNT(*) "
                        + "FROM "
                        + quoteIdentifier(
                        "payments"
                )
                        + " WHERE UPPER("
                        + quoteIdentifier(
                        statusColumn
                )
                        + ") = ? "
                        + "AND "
                        + quoteIdentifier(
                        paidTimeColumn
                )
                        + " >= ? "
                        + "AND "
                        + quoteIdentifier(
                        paidTimeColumn
                )
                        + " < ?";

        Object result =
                jdbcTemplate.queryForObject(
                        sql,
                        Object.class,
                        STATUS_PAID,
                        start,
                        end
                );

        return toLong(result);
    }

    /**
     * Đếm giao dịch booking đã thanh toán trong tháng.
     */
    private long getPaidBookingTransactionCountBetween(
            LocalDateTime start,
            LocalDateTime end
    ) {
        if (
                !tableExists("bookings")
                        || !columnExists(
                        "bookings",
                        "payment_status"
                )
                        || !columnExists(
                        "bookings",
                        "paid_at"
                )
        ) {
            return 0L;
        }

        String sql = """
                SELECT COUNT(*)
                FROM bookings
                WHERE UPPER(payment_status) = ?
                  AND paid_at IS NOT NULL
                  AND paid_at >= ?
                  AND paid_at < ?
                """;

        Object result =
                jdbcTemplate.queryForObject(
                        sql,
                        Object.class,
                        STATUS_PAID,
                        start,
                        end
                );

        return toLong(result);
    }

    /**
     * Đếm phiên gửi xe theo thời gian check-in.
     */
    private long getParkingSessionCountBetween(
            LocalDateTime start,
            LocalDateTime end
    ) {
        if (
                !tableExists(
                        "parking_sessions"
                )
                        || !columnExists(
                        "parking_sessions",
                        "check_in_time"
                )
        ) {
            return 0L;
        }

        String sql = """
                SELECT COUNT(*)
                FROM parking_sessions
                WHERE check_in_time >= ?
                  AND check_in_time < ?
                """;

        Object result =
                jdbcTemplate.queryForObject(
                        sql,
                        Object.class,
                        start,
                        end
                );

        return toLong(result);
    }

    /**
     * Đếm booking được tạo trong tháng.
     */
    private long getBookingCountBetween(
            LocalDateTime start,
            LocalDateTime end
    ) {
        if (!tableExists("bookings")) {
            return 0L;
        }

        String bookingTimeColumn =
                getBookingTimeColumn();

        if (bookingTimeColumn == null) {
            return 0L;
        }

        String sql =
                "SELECT COUNT(*) "
                        + "FROM "
                        + quoteIdentifier(
                        "bookings"
                )
                        + " WHERE "
                        + quoteIdentifier(
                        bookingTimeColumn
                )
                        + " >= ? "
                        + "AND "
                        + quoteIdentifier(
                        bookingTimeColumn
                )
                        + " < ?";

        Object result =
                jdbcTemplate.queryForObject(
                        sql,
                        Object.class,
                        start,
                        end
                );

        return toLong(result);
    }

    /**
     * Đếm booking theo trạng thái, nhóm theo tháng tạo booking.
     *
     * Không có bảng lịch sử trạng thái riêng nên trạng thái hiện tại
     * của booking được quy về tháng mà booking được tạo.
     */
    private long getBookingCountByStatusBetween(
            String status,
            LocalDateTime start,
            LocalDateTime end
    ) {
        if (
                !tableExists("bookings")
                        || !columnExists(
                        "bookings",
                        "status"
                )
        ) {
            return 0L;
        }

        String bookingTimeColumn =
                getBookingTimeColumn();

        if (bookingTimeColumn == null) {
            return 0L;
        }

        String sql =
                "SELECT COUNT(*) "
                        + "FROM "
                        + quoteIdentifier(
                        "bookings"
                )
                        + " WHERE UPPER("
                        + quoteIdentifier(
                        "status"
                )
                        + ") = ? "
                        + "AND "
                        + quoteIdentifier(
                        bookingTimeColumn
                )
                        + " >= ? "
                        + "AND "
                        + quoteIdentifier(
                        bookingTimeColumn
                )
                        + " < ?";

        Object result =
                jdbcTemplate.queryForObject(
                        sql,
                        Object.class,
                        status,
                        start,
                        end
                );

        return toLong(result);
    }

    /**
     * Tính tỷ lệ sử dụng trung bình theo thời lượng chiếm chỗ:
     *
     * total parked seconds
     * ---------------------------------- x 100
     * total slots x seconds in period
     *
     * Với tháng hiện tại, mẫu số chỉ tính đến thời điểm hiện tại,
     * không tính toàn bộ thời gian còn lại của tháng.
     */
    private BigDecimal calculateAverageOccupancyBetween(
            LocalDateTime start,
            LocalDateTime end
    ) {
        long totalSlots =
                parkingSlotRepository.count();

        if (totalSlots <= 0) {
            return BigDecimal.ZERO;
        }

        if (
                !tableExists(
                        "parking_sessions"
                )
                        || !columnExists(
                        "parking_sessions",
                        "check_in_time"
                )
                        || !columnExists(
                        "parking_sessions",
                        "check_out_time"
                )
        ) {
            return BigDecimal.ZERO;
        }

        LocalDateTime now =
                LocalDateTime.now();

        LocalDateTime effectiveEnd =
                end.isAfter(now)
                        ? now
                        : end;

        if (!effectiveEnd.isAfter(start)) {
            return BigDecimal.ZERO;
        }

        String sql = """
                SELECT COALESCE(
                    SUM(
                        DATEDIFF_BIG(
                            SECOND,
                            CASE
                                WHEN check_in_time < ? THEN ?
                                ELSE check_in_time
                            END,
                            CASE
                                WHEN COALESCE(check_out_time, ?) > ? THEN ?
                                ELSE COALESCE(check_out_time, ?)
                            END
                        )
                    ),
                    0
                )
                FROM parking_sessions
                WHERE check_in_time < ?
                  AND COALESCE(check_out_time, ?) > ?
                """;

        Object result =
                jdbcTemplate.queryForObject(
                        sql,
                        Object.class,
                        start,
                        start,
                        effectiveEnd,
                        effectiveEnd,
                        effectiveEnd,
                        effectiveEnd,
                        effectiveEnd,
                        effectiveEnd,
                        start
                );

        BigDecimal totalParkedSeconds =
                toBigDecimal(result);

        long periodSeconds =
                Duration.between(
                                start,
                                effectiveEnd
                        )
                        .getSeconds();

        if (periodSeconds <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal totalCapacitySeconds =
                BigDecimal
                        .valueOf(totalSlots)
                        .multiply(
                                BigDecimal.valueOf(
                                        periodSeconds
                                )
                        );

        if (
                totalCapacitySeconds.compareTo(
                        BigDecimal.ZERO
                ) <= 0
        ) {
            return BigDecimal.ZERO;
        }

        BigDecimal occupancyPercent =
                totalParkedSeconds
                        .multiply(
                                BigDecimal.valueOf(
                                        100
                                )
                        )
                        .divide(
                                totalCapacitySeconds,
                                2,
                                RoundingMode.HALF_UP
                        );

        /*
         * Chặn tối đa 100% để dữ liệu lỗi hoặc phiên trùng nhau
         * không làm giao diện hiển thị tỷ lệ vượt quá 100%.
         */
        if (
                occupancyPercent.compareTo(
                        BigDecimal.valueOf(100)
                ) > 0
        ) {
            return BigDecimal
                    .valueOf(100)
                    .setScale(
                            2,
                            RoundingMode.HALF_UP
                    );
        }

        if (
                occupancyPercent.compareTo(
                        BigDecimal.ZERO
                ) < 0
        ) {
            return BigDecimal.ZERO;
        }

        return occupancyPercent;
    }

    /**
     * Tính phần trăm tăng/giảm cho BigDecimal.
     */
    private BigDecimal calculateGrowthPercent(
            BigDecimal previousValue,
            BigDecimal currentValue
    ) {
        BigDecimal previous =
                safeDecimal(
                        previousValue
                );

        BigDecimal current =
                safeDecimal(
                        currentValue
                );

        if (
                previous.compareTo(
                        BigDecimal.ZERO
                ) == 0
        ) {
            return current.compareTo(
                    BigDecimal.ZERO
            ) == 0
                    ? BigDecimal.ZERO
                    : BigDecimal
                    .valueOf(100)
                    .setScale(
                            2,
                            RoundingMode.HALF_UP
                    );
        }

        return current
                .subtract(previous)
                .multiply(
                        BigDecimal.valueOf(
                                100
                        )
                )
                .divide(
                        previous,
                        2,
                        RoundingMode.HALF_UP
                );
    }

    /**
     * Tính phần trăm tăng/giảm cho số nguyên.
     */
    private BigDecimal calculateGrowthPercent(
            Long previousValue,
            Long currentValue
    ) {
        long previous =
                previousValue == null
                        ? 0L
                        : previousValue;

        long current =
                currentValue == null
                        ? 0L
                        : currentValue;

        return calculateGrowthPercent(
                BigDecimal.valueOf(previous),
                BigDecimal.valueOf(current)
        );
    }

    private void validateComparisonMonths(
            int months
    ) {
        if (
                months < MIN_COMPARISON_MONTHS
                        || months
                        > MAX_COMPARISON_MONTHS
        ) {
            throw new IllegalArgumentException(
                    "Months must be between "
                            + MIN_COMPARISON_MONTHS
                            + " and "
                            + MAX_COMPARISON_MONTHS
            );
        }
    }

    private String getBookingTimeColumn() {
        return firstExistingColumn(
                "bookings",
                List.of(
                        "created_at",
                        "booking_time",
                        "start_time",
                        "booking_date"
                )
        );
    }

    private String firstExistingColumn(
            String tableName,
            List<String> candidateColumns
    ) {
        if (
                candidateColumns == null
                        || candidateColumns.isEmpty()
        ) {
            return null;
        }

        for (String columnName : candidateColumns) {
            if (
                    columnName != null
                            && columnExists(
                            tableName,
                            columnName
                    )
            ) {
                return columnName;
            }
        }

        return null;
    }

    /**
     * Chỉ quote identifier đã lấy từ danh sách hard-coded.
     */
    private String quoteIdentifier(
            String identifier
    ) {
        if (
                identifier == null
                        || !identifier.matches(
                        "^[A-Za-z0-9_]+$"
                )
        ) {
            throw new IllegalArgumentException(
                    "Invalid SQL identifier"
            );
        }

        return "[" + identifier + "]";
    }

    private BigDecimal getCheckoutRevenue() {
        BigDecimal revenue =
                paymentRepository
                        .getTotalRevenue();

        return revenue == null
                ? BigDecimal.ZERO
                : revenue;
    }

    private BigDecimal getBookingRevenue() {
        if (
                !tableExists("bookings")
                        || !columnExists(
                        "bookings",
                        "payment_amount"
                )
        ) {
            return BigDecimal.ZERO;
        }

        /*
         * Booking revenue phụ thuộc payment_status,
         * không phụ thuộc booking status.
         *
         * Booking PAID có thể chuyển thành COMPLETED sau checkout,
         * nhưng doanh thu vẫn phải được giữ.
         */
        String sql = """
                SELECT COALESCE(SUM(payment_amount), 0)
                FROM bookings
                WHERE UPPER(payment_status) = 'PAID'
                  AND paid_at IS NOT NULL
                """;

        Object result =
                jdbcTemplate.queryForObject(
                        sql,
                        Object.class
                );

        return toBigDecimal(result);
    }

    private long getPaidBookingTransactionCount() {
        if (!tableExists("bookings")) {
            return 0L;
        }

        String sql = """
                SELECT COUNT(*)
                FROM bookings
                WHERE UPPER(payment_status) = 'PAID'
                  AND paid_at IS NOT NULL
                """;

        Long count =
                jdbcTemplate.queryForObject(
                        sql,
                        Long.class
                );

        return count == null
                ? 0L
                : count;
    }

    private boolean tableExists(
            String tableName
    ) {
        String sql = """
                SELECT COUNT(*)
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_NAME = ?
                """;

        Integer count =
                jdbcTemplate.queryForObject(
                        sql,
                        Integer.class,
                        tableName
                );

        return count != null
                && count > 0;
    }

    private boolean columnExists(
            String tableName,
            String columnName
    ) {
        String sql = """
                SELECT COUNT(*)
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = ?
                  AND COLUMN_NAME = ?
                """;

        Integer count =
                jdbcTemplate.queryForObject(
                        sql,
                        Integer.class,
                        tableName,
                        columnName
                );

        return count != null
                && count > 0;
    }

    private BigDecimal safeDecimal(
            BigDecimal value
    ) {
        return value == null
                ? BigDecimal.ZERO
                : value;
    }

    private BigDecimal toBigDecimal(
            Object value
    ) {
        if (value == null) {
            return BigDecimal.ZERO;
        }

        if (
                value
                        instanceof BigDecimal bigDecimal
        ) {
            return bigDecimal;
        }

        if (value instanceof Number number) {
            try {
                return new BigDecimal(
                        number.toString()
                );
            } catch (Exception ignored) {
                return BigDecimal.ZERO;
            }
        }

        try {
            return new BigDecimal(
                    String.valueOf(value)
            );
        } catch (Exception exception) {
            return BigDecimal.ZERO;
        }
    }

    private long toLong(
            Object value
    ) {
        if (value == null) {
            return 0L;
        }

        if (value instanceof Number number) {
            return number.longValue();
        }

        try {
            return Long.parseLong(
                    String.valueOf(value)
            );
        } catch (Exception exception) {
            return 0L;
        }
    }
}
