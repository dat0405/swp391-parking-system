package com.tatdat.parking.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private static final String PAYMENTS_TABLE = "payments";

    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    public List<Map<String, Object>> getAllPayments() {
        if (paymentsTableNotExists()) {
            return List.of();
        }

        String sql = "SELECT * FROM payments ORDER BY id DESC";

        return jdbcTemplate.queryForList(sql);
    }

    @GetMapping("/summary")
    public Map<String, Object> getPaymentSummary(
            @RequestParam(defaultValue = "WEEK") String range
    ) {
        if (paymentsTableNotExists()) {
            return emptySummary(range);
        }

        Set<String> columns = getPaymentColumns();

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
            return emptySummary(range);
        }

        LocalDateTime startDate = getStartDateByRange(range);
        LocalDateTime endDate = LocalDateTime.now();

        StringBuilder sql = new StringBuilder();
        List<Object> params = new ArrayList<>();

        sql.append("SELECT COALESCE(SUM(")
                .append(amountColumn)
                .append("), 0) AS totalRevenue, COUNT(*) AS totalPayments ")
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

        Map<String, Object> result = jdbcTemplate.queryForMap(sql.toString(), params.toArray());

        BigDecimal totalRevenue = toBigDecimal(result.get("totalRevenue"));
        int totalPayments = toInt(result.get("totalPayments"));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("range", normalizeRange(range));
        response.put("totalRevenue", totalRevenue);
        response.put("totalPayments", totalPayments);
        response.put("amountColumn", amountColumn);
        response.put("statusColumn", statusColumn);
        response.put("dateColumn", dateColumn);
        response.put("startDate", startDate);
        response.put("endDate", endDate);

        return response;
    }

    @GetMapping("/chart")
    public List<Map<String, Object>> getRevenueChart(
            @RequestParam(defaultValue = "WEEK") String range
    ) {
        if (paymentsTableNotExists()) {
            return List.of();
        }

        Set<String> columns = getPaymentColumns();

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

        String normalizedRange = normalizeRange(range);
        LocalDateTime startDate = getStartDateByRange(normalizedRange);
        LocalDateTime endDate = LocalDateTime.now();

        String groupExpression = getChartGroupExpression(normalizedRange, dateColumn);
        String orderExpression = getChartOrderExpression(normalizedRange, dateColumn);

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

    @GetMapping("/columns")
    public Map<String, Object> getPaymentColumnsResponse() {
        Map<String, Object> response = new LinkedHashMap<>();

        if (paymentsTableNotExists()) {
            response.put("exists", false);
            response.put("columns", List.of());
            return response;
        }

        response.put("exists", true);
        response.put("columns", new ArrayList<>(getPaymentColumns()));

        return response;
    }

    private boolean paymentsTableNotExists() {
        String sql = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = ?";

        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, PAYMENTS_TABLE);

        return count == null || count == 0;
    }

    private Set<String> getPaymentColumns() {
        String sql = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ?";

        List<String> columns = jdbcTemplate.queryForList(sql, String.class, PAYMENTS_TABLE);

        Set<String> result = new LinkedHashSet<>();

        for (String column : columns) {
            result.add(column.toLowerCase());
        }

        return result;
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

    private String findFirstExistingColumn(Set<String> columns, String... candidates) {
        for (String candidate : candidates) {
            if (columns.contains(candidate.toLowerCase())) {
                return candidate;
            }
        }

        return null;
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

    private Map<String, Object> emptySummary(String range) {
        Map<String, Object> response = new LinkedHashMap<>();

        response.put("range", normalizeRange(range));
        response.put("totalRevenue", BigDecimal.ZERO);
        response.put("totalPayments", 0);
        response.put("amountColumn", null);
        response.put("statusColumn", null);
        response.put("dateColumn", null);
        response.put("startDate", getStartDateByRange(range));
        response.put("endDate", LocalDateTime.now());

        return response;
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

    private int toInt(Object value) {
        if (value == null) {
            return 0;
        }

        if (value instanceof Number number) {
            return number.intValue();
        }

        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception exception) {
            return 0;
        }
    }
}