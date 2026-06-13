package com.tatdat.parking.backend.service.impl;

import com.tatdat.parking.backend.service.ReportDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ReportDashboardServiceImpl implements ReportDashboardService {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public Map<String, Object> getReportDashboard(String range) {
        String normalizedRange = normalizeRange(range);

        LocalDateTime startDate = getStartDateByRange(normalizedRange);
        LocalDateTime endDate = LocalDateTime.now();

        Map<String, Object> response = new LinkedHashMap<>();

        response.put("range", normalizedRange);
        response.put("startDate", startDate);
        response.put("endDate", endDate);
        response.put("summary", buildSummary(startDate, endDate));
        response.put("revenueChart", buildRevenueChart(normalizedRange, startDate, endDate));
        response.put("vehicleDistribution", buildVehicleDistribution());
        response.put("reservationStatusBreakdown", buildReservationStatusBreakdown(startDate, endDate));
        response.put("slotStatusBreakdown", buildSlotStatusBreakdown());
        response.put("operationalLog", buildOperationalLog(startDate, endDate));

        return response;
    }

    private Map<String, Object> buildSummary(LocalDateTime startDate, LocalDateTime endDate) {
        Map<String, Object> summary = new LinkedHashMap<>();

        summary.put("totalRevenue", getTotalRevenue(startDate, endDate));
        summary.put("totalSessions", getTotalSessions(startDate, endDate));
        summary.put("avgOccupancy", getAverageOccupancy());
        summary.put("totalReservations", getTotalBookings(startDate, endDate));

        return summary;
    }

    private BigDecimal getTotalRevenue(LocalDateTime startDate, LocalDateTime endDate) {
        if (tableNotExists("payments")) {
            return BigDecimal.ZERO;
        }

        Set<String> columns = getTableColumns("payments");

        String amountColumn = findFirstExistingColumn(
                columns,
                "amount",
                "total_amount",
                "paid_amount",
                "payment_amount",
                "fee_amount",
                "price"
        );

        String statusColumn = findFirstExistingColumn(
                columns,
                "status",
                "payment_status"
        );

        String dateColumn = findFirstExistingColumn(
                columns,
                "paid_at",
                "payment_time",
                "payment_date",
                "created_at",
                "created_date"
        );

        if (amountColumn == null) {
            return BigDecimal.ZERO;
        }

        StringBuilder sql = new StringBuilder();
        List<Object> params = new ArrayList<>();

        sql.append("SELECT COALESCE(SUM(")
                .append(amountColumn)
                .append("), 0) ")
                .append("FROM payments WHERE 1 = 1 ");

        if (statusColumn != null) {
            sql.append("AND UPPER(")
                    .append(statusColumn)
                    .append(") IN ('PAID', 'SUCCESS', 'COMPLETED') ");
        }

        if (dateColumn != null) {
            sql.append("AND ")
                    .append(dateColumn)
                    .append(" >= ? AND ")
                    .append(dateColumn)
                    .append(" <= ? ");

            params.add(Timestamp.valueOf(startDate));
            params.add(Timestamp.valueOf(endDate));
        }

        Object result = jdbcTemplate.queryForObject(
                sql.toString(),
                Object.class,
                params.toArray()
        );

        return toBigDecimal(result);
    }

    private long getTotalSessions(LocalDateTime startDate, LocalDateTime endDate) {
        if (tableNotExists("parking_sessions")) {
            return 0;
        }

        String sql = """
                SELECT COUNT(*)
                FROM parking_sessions
                WHERE check_in_time >= ?
                AND check_in_time <= ?
                """;

        Long count = jdbcTemplate.queryForObject(
                sql,
                Long.class,
                Timestamp.valueOf(startDate),
                Timestamp.valueOf(endDate)
        );

        return count == null ? 0 : count;
    }

    private long getTotalBookings(LocalDateTime startDate, LocalDateTime endDate) {
        if (tableNotExists("bookings")) {
            return 0;
        }

        Set<String> columns = getTableColumns("bookings");

        String dateColumn = findFirstExistingColumn(
                columns,
                "created_at",
                "created_date",
                "start_time",
                "booking_time"
        );

        if (dateColumn == null) {
            String sql = "SELECT COUNT(*) FROM bookings";

            Long count = jdbcTemplate.queryForObject(sql, Long.class);

            return count == null ? 0 : count;
        }

        String sql = "SELECT COUNT(*) FROM bookings WHERE "
                + dateColumn
                + " >= ? AND "
                + dateColumn
                + " <= ?";

        Long count = jdbcTemplate.queryForObject(
                sql,
                Long.class,
                Timestamp.valueOf(startDate),
                Timestamp.valueOf(endDate)
        );

        return count == null ? 0 : count;
    }

    private double getAverageOccupancy() {
        if (tableNotExists("parking_slots")) {
            return 0;
        }

        String totalSql = "SELECT COUNT(*) FROM parking_slots";

        String usedSql = """
                SELECT COUNT(*)
                FROM parking_slots
                WHERE UPPER(status) IN ('OCCUPIED', 'RESERVED')
                """;

        Long total = jdbcTemplate.queryForObject(totalSql, Long.class);
        Long used = jdbcTemplate.queryForObject(usedSql, Long.class);

        if (total == null || total == 0 || used == null) {
            return 0;
        }

        return Math.round((used * 1000.0 / total)) / 10.0;
    }

    private List<Map<String, Object>> buildRevenueChart(
            String range,
            LocalDateTime startDate,
            LocalDateTime endDate
    ) {
        if (tableNotExists("payments")) {
            return List.of();
        }

        Set<String> columns = getTableColumns("payments");

        String amountColumn = findFirstExistingColumn(
                columns,
                "amount",
                "total_amount",
                "paid_amount",
                "payment_amount",
                "fee_amount",
                "price"
        );

        String statusColumn = findFirstExistingColumn(
                columns,
                "status",
                "payment_status"
        );

        String dateColumn = findFirstExistingColumn(
                columns,
                "paid_at",
                "payment_time",
                "payment_date",
                "created_at",
                "created_date"
        );

        if (amountColumn == null || dateColumn == null) {
            return List.of();
        }

        String groupExpression = getChartGroupExpression(range, dateColumn);
        String orderExpression = getChartOrderExpression(range, dateColumn);

        StringBuilder sql = new StringBuilder();
        List<Object> params = new ArrayList<>();

        sql.append("SELECT ")
                .append(groupExpression)
                .append(" AS label, COALESCE(SUM(")
                .append(amountColumn)
                .append("), 0) AS revenue, COUNT(*) AS paymentCount ")
                .append("FROM payments WHERE ")
                .append(dateColumn)
                .append(" >= ? AND ")
                .append(dateColumn)
                .append(" <= ? ");

        params.add(Timestamp.valueOf(startDate));
        params.add(Timestamp.valueOf(endDate));

        if (statusColumn != null) {
            sql.append("AND UPPER(")
                    .append(statusColumn)
                    .append(") IN ('PAID', 'SUCCESS', 'COMPLETED') ");
        }

        sql.append("GROUP BY ").append(groupExpression).append(" ");
        sql.append("ORDER BY ").append(orderExpression);

        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    private List<Map<String, Object>> buildVehicleDistribution() {
        if (tableNotExists("parking_slots")) {
            return List.of();
        }

        if (tableNotExists("vehicle_types")) {
            String sql = """
                    SELECT
                        'Unknown' AS vehicleType,
                        COUNT(*) AS total
                    FROM parking_slots
                    """;

            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
            addPercentToRows(rows);

            return rows;
        }

        String sql = """
                SELECT
                    COALESCE(vt.type_name, 'Unknown') AS vehicleType,
                    COUNT(*) AS total
                FROM parking_slots ps
                LEFT JOIN vehicle_types vt ON ps.vehicle_type_id = vt.id
                GROUP BY vt.type_name
                ORDER BY total DESC
                """;

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        addPercentToRows(rows);

        return rows;
    }

    private List<Map<String, Object>> buildReservationStatusBreakdown(
            LocalDateTime startDate,
            LocalDateTime endDate
    ) {
        if (tableNotExists("bookings")) {
            return List.of();
        }

        Set<String> columns = getTableColumns("bookings");

        String dateColumn = findFirstExistingColumn(
                columns,
                "created_at",
                "created_date",
                "start_time",
                "booking_time"
        );

        StringBuilder sql = new StringBuilder();
        List<Object> params = new ArrayList<>();

        sql.append("SELECT UPPER(status) AS status, COUNT(*) AS total ")
                .append("FROM bookings WHERE 1 = 1 ");

        if (dateColumn != null) {
            sql.append("AND ")
                    .append(dateColumn)
                    .append(" >= ? AND ")
                    .append(dateColumn)
                    .append(" <= ? ");

            params.add(Timestamp.valueOf(startDate));
            params.add(Timestamp.valueOf(endDate));
        }

        sql.append("GROUP BY UPPER(status) ORDER BY total DESC");

        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    private List<Map<String, Object>> buildSlotStatusBreakdown() {
        if (tableNotExists("parking_slots")) {
            return List.of();
        }

        String sql = """
                SELECT UPPER(status) AS status, COUNT(*) AS total
                FROM parking_slots
                GROUP BY UPPER(status)
                ORDER BY total DESC
                """;

        return jdbcTemplate.queryForList(sql);
    }

    private List<Map<String, Object>> buildOperationalLog(
            LocalDateTime startDate,
            LocalDateTime endDate
    ) {
        if (tableNotExists("parking_sessions")) {
            return List.of();
        }

        String sql = """
                SELECT TOP 10
                    ps.id AS sessionId,
                    ps.ticket_id AS ticketId,
                    v.license_plate AS licensePlate,
                    ps.status AS status,
                    ps.check_in_time AS checkInTime,
                    ps.check_out_time AS checkOutTime,
                    sl.slot_code AS slotCode
                FROM parking_sessions ps
                LEFT JOIN vehicles v ON ps.vehicle_id = v.id
                LEFT JOIN parking_slots sl ON ps.slot_id = sl.id
                WHERE ps.check_in_time >= ?
                AND ps.check_in_time <= ?
                ORDER BY ps.check_in_time DESC
                """;

        return jdbcTemplate.queryForList(
                sql,
                Timestamp.valueOf(startDate),
                Timestamp.valueOf(endDate)
        );
    }

    private boolean tableNotExists(String tableName) {
        String sql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ?";

        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, tableName);

        return count == null || count == 0;
    }

    private Set<String> getTableColumns(String tableName) {
        String sql = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ?";

        List<String> columns = jdbcTemplate.queryForList(sql, String.class, tableName);

        Set<String> result = new LinkedHashSet<>();

        for (String column : columns) {
            result.add(column.toLowerCase());
        }

        return result;
    }

    private String findFirstExistingColumn(Set<String> columns, String... candidates) {
        for (String candidate : candidates) {
            if (columns.contains(candidate.toLowerCase())) {
                return candidate;
            }
        }

        return null;
    }

    private String getChartGroupExpression(String range, String dateColumn) {
        if ("TODAY".equals(range)) {
            return "DATEPART(HOUR, " + dateColumn + ")";
        }

        if ("MONTH".equals(range)) {
            return "DATEPART(WEEK, " + dateColumn + ")";
        }

        return "DATENAME(WEEKDAY, " + dateColumn + ")";
    }

    private String getChartOrderExpression(String range, String dateColumn) {
        if ("TODAY".equals(range)) {
            return "DATEPART(HOUR, " + dateColumn + ")";
        }

        if ("MONTH".equals(range)) {
            return "DATEPART(WEEK, " + dateColumn + ")";
        }

        return "MIN(" + dateColumn + ")";
    }

    private String normalizeRange(String range) {
        String value = String.valueOf(range).trim().toUpperCase();

        if ("TODAY".equals(value)) {
            return "TODAY";
        }

        if ("MONTH".equals(value)) {
            return "MONTH";
        }

        return "WEEK";
    }

    private LocalDateTime getStartDateByRange(String range) {
        String normalizedRange = normalizeRange(range);
        LocalDateTime now = LocalDateTime.now();

        if ("TODAY".equals(normalizedRange)) {
            return now.toLocalDate().atStartOfDay();
        }

        if ("MONTH".equals(normalizedRange)) {
            return now.minusDays(30);
        }

        return now.minusDays(7);
    }

    private void addPercentToRows(List<Map<String, Object>> rows) {
        long total = rows.stream()
                .mapToLong(row -> toLong(row.get("total")))
                .sum();

        for (Map<String, Object> row : rows) {
            long count = toLong(row.get("total"));
            double percent = total == 0 ? 0 : Math.round((count * 1000.0 / total)) / 10.0;

            row.put("percent", percent);
        }
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

    private long toLong(Object value) {
        if (value == null) {
            return 0;
        }

        if (value instanceof Number number) {
            return number.longValue();
        }

        try {
            return Long.parseLong(String.valueOf(value));
        } catch (Exception exception) {
            return 0;
        }
    }
}