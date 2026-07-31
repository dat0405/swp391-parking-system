import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../dashboard/Sidebar";
import Header from "../dashboard/Header";
import { reportDashboardApi } from "../api/reportDashboardApi";
import {
  DollarSign,
  Activity,
  Percent,
  Calendar,
  Download,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Circle,
  Car,
  Bike,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

const emptyReport = {
  range: "WEEK",
  startDate: null,
  endDate: null,
  summary: {
    totalRevenue: 0,
    totalSessions: 0,
    avgOccupancy: 0,
    totalReservations: 0
  },
  revenueChart: [],
  vehicleDistribution: [],
  reservationStatusBreakdown: [],
  slotStatusBreakdown: [],
  operationalLog: []
};

const rangeToApiValue = {
  Today: "TODAY",
  Week: "WEEK",
  Month: "MONTH"
};

const reportColors = {
  blue: "#3b82f6",
  green: "#10b981",
  red: "#ef4444",
  yellow: "#f59e0b"
};

const formatCurrency = (value) => {
  return `${Number(value || 0).toLocaleString("vi-VN")} VND`;
};

const formatNumber = (value) => {
  return Number(value || 0).toLocaleString("vi-VN");
};

const formatPercent = (value) => {
  return `${Number(value || 0).toFixed(1)}%`;
};

const formatDateTime = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
};

const getMetricValueFontSize = (value) => {
  const text = String(value || "");

  if (text.length >= 18) return "1.35rem";
  if (text.length >= 15) return "1.5rem";
  if (text.length >= 12) return "1.7rem";

  return "2rem";
};

const getStatusMeta = (status) => {
  const value = String(status || "").toUpperCase();

  if (value === "CONFIRMED" || value === "COMPLETED" || value === "PAID") {
    return {
      label: value,
      color: reportColors.green,
      colorClass: "report-progress-fill-green",
      icon: CheckCircle2
    };
  }

  if (value === "PENDING" || value === "RESERVED" || value === "ACTIVE") {
    return {
      label: value,
      color: reportColors.yellow,
      colorClass: "report-progress-fill-yellow",
      icon: Clock
    };
  }

  if (value === "CANCELLED" || value === "CANCELED") {
    return {
      label: value,
      color: reportColors.red,
      colorClass: "report-progress-fill-red",
      icon: XCircle
    };
  }

  return {
    label: value || "UNKNOWN",
    color: reportColors.blue,
    colorClass: "report-progress-fill-blue",
    icon: CheckCircle2
  };
};

const normalizeVehicleDistribution = (rows = []) => {
  return rows.map((item) => {
    const vehicleType = String(item.vehicleType || item.vehicletype || "Unknown");
    const total = Number(item.total || 0);
    const percent = Number(item.percent || 0);
    const isMotorbike =
      vehicleType.toLowerCase().includes("bike") ||
      vehicleType.toLowerCase().includes("motor");

    return {
      label: vehicleType,
      count: total,
      percent,
      icon: isMotorbike ? Bike : Car,
      color: isMotorbike ? reportColors.green : reportColors.blue,
      colorClass: isMotorbike
        ? "report-progress-fill-green"
        : "report-progress-fill-blue"
    };
  });
};

const normalizeReservationBreakdown = (rows = []) => {
  const total = rows.reduce((sum, item) => sum + Number(item.total || 0), 0);

  return rows.map((item) => {
    const status = item.status || "UNKNOWN";
    const value = Number(item.total || 0);
    const percent = total === 0 ? 0 : Math.round((value * 1000) / total) / 10;
    const meta = getStatusMeta(status);

    return {
      label: meta.label,
      value,
      percent,
      color: meta.color,
      colorClass: meta.colorClass,
      icon: meta.icon
    };
  });
};

const normalizeChartData = (rows = []) => {
  return rows.map((item) => ({
    label: String(item.label || "N/A"),
    revenue: Number(item.revenue || 0),
    paymentCount: Number(item.paymentCount || item.paymentcount || 0)
  }));
};

const normalizeMonthlyComparison = (rows = []) => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((item) => ({
    year: Number(item.year || 0),
    month: Number(item.month || 0),
    monthLabel: String(item.monthLabel || "N/A"),
    totalRevenue: Number(item.totalRevenue || 0),
    totalSessions: Number(item.totalSessions || 0),
    totalReservations: Number(item.totalReservations || 0),
    completedReservations: Number(item.completedReservations || 0),
    cancelledReservations: Number(item.cancelledReservations || 0),
    averageOccupancy: Number(item.averageOccupancy || 0),
    paymentCount: Number(item.paymentCount || 0),
    revenueGrowthPercent: Number(item.revenueGrowthPercent || 0),
    sessionGrowthPercent: Number(item.sessionGrowthPercent || 0),
    reservationGrowthPercent: Number(
      item.reservationGrowthPercent || 0
    )
  }));
};

const calculateGrowthPercent = (previousValue, currentValue) => {
  const previous = Number(previousValue || 0);
  const current = Number(currentValue || 0);

  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
};

const formatGrowthPercent = (value) => {
  const number = Number(value || 0);
  const sign = number > 0 ? "+" : "";

  return `${sign}${number.toFixed(1)}%`;
};

const styles = {
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    color: "var(--text-main)",
    boxShadow: "var(--shadow-card)"
  }
};

const clampPercent = (value) => {
  const number = Number(value || 0);

  if (number < 0) return 0;
  if (number > 100) return 100;

  return number;
};

function ProgressBar({ percent, colorClass, height = 9 }) {
  const safePercent = clampPercent(percent);

  return (
    <div
      className="report-progress-track"
      style={{
        height: `${height}px`
      }}
    >
      <div
        className={`report-progress-fill ${colorClass}`}
        style={{
          width: `${safePercent}%`
        }}
      />
    </div>
  );
}

const Reports = () => {
  const [timeRange, setTimeRange] = useState("Week");
  const [comparisonMonths, setComparisonMonths] = useState(6);
  const [monthlyComparison, setMonthlyComparison] = useState([]);
  const [report, setReport] = useState(emptyReport);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isMonthlyComparison =
    timeRange === "Monthly Comparison";

  const apiRange = rangeToApiValue[timeRange] || "WEEK";

  const isInitialLoading = loading && !hasLoadedOnce;
  const isRefreshing = loading && hasLoadedOnce;

  useEffect(() => {
    let isMounted = true;

    const loadReport = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        if (isMonthlyComparison) {
          const response =
            await reportDashboardApi.getMonthlyComparison(
              comparisonMonths
            );

          if (!isMounted) return;

          setMonthlyComparison(
            normalizeMonthlyComparison(response.data)
          );
        } else {
          const response =
            await reportDashboardApi.getReportDashboard(
              apiRange
            );

          if (!isMounted) return;

          setReport({
            ...emptyReport,
            ...(response.data || {}),
            summary: {
              ...emptyReport.summary,
              ...(response.data?.summary || {})
            },
            revenueChart:
              response.data?.revenueChart || [],
            vehicleDistribution:
              response.data?.vehicleDistribution || [],
            reservationStatusBreakdown:
              response.data?.reservationStatusBreakdown || [],
            slotStatusBreakdown:
              response.data?.slotStatusBreakdown || [],
            operationalLog:
              response.data?.operationalLog || []
          });
        }
      } catch (error) {
        if (!isMounted) return;

        console.error("Failed to load report data:", error);

        setErrorMessage(
          isMonthlyComparison
            ? "Failed to load monthly comparison data from server."
            : "Failed to load report data from server."
        );

        if (!hasLoadedOnce) {
          if (isMonthlyComparison) {
            setMonthlyComparison([]);
          } else {
            setReport(emptyReport);
          }
        }
      } finally {
        if (isMounted) {
          setHasLoadedOnce(true);
          setLoading(false);
        }
      }
    };

    loadReport();

    return () => {
      isMounted = false;
    };
  }, [apiRange, comparisonMonths, isMonthlyComparison]);

  const chartData = useMemo(() => {
    return normalizeChartData(report.revenueChart);
  }, [report.revenueChart]);

  const vehicleDistribution = useMemo(() => {
    return normalizeVehicleDistribution(report.vehicleDistribution);
  }, [report.vehicleDistribution]);

  const reservationStatusBreakdown = useMemo(() => {
    return normalizeReservationBreakdown(report.reservationStatusBreakdown);
  }, [report.reservationStatusBreakdown]);

  const maxChartValue = useMemo(() => {
    return Math.max(...chartData.map((item) => item.revenue), 1);
  }, [chartData]);

  const operationalLogs = report.operationalLog || [];
  const summary = report.summary || emptyReport.summary;

  const handleExportCSV = () => {
    if (isMonthlyComparison) {
      const headers = [
        "Month",
        "Revenue",
        "Payments",
        "Sessions",
        "Reservations",
        "Completed",
        "Cancelled",
        "Average occupancy",
        "Revenue growth",
        "Session growth",
        "Reservation growth"
      ];

      const rows = monthlyComparison.map((item) => [
        item.monthLabel,
        item.totalRevenue,
        item.paymentCount,
        item.totalSessions,
        item.totalReservations,
        item.completedReservations,
        item.cancelledReservations,
        item.averageOccupancy,
        item.revenueGrowthPercent,
        item.sessionGrowthPercent,
        item.reservationGrowthPercent
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((value) =>
              `"${String(value).replace(/"/g, '""')}"`
            )
            .join(",")
        )
      ].join("\n");

      const blob = new Blob(
        [`\ufeff${csvContent}`],
        {
          type: "text/csv;charset=utf-8;"
        }
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Monthly_Comparison_${comparisonMonths}_Months.csv`
      );

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    const headers = [
      "Session ID",
      "Ticket ID",
      "License plate",
      "Slot",
      "Status",
      "Check-in time",
      "Check-out time"
    ];

    const rows = operationalLogs.map((log) => [
      log.sessionId || "",
      log.ticketId || "",
      log.licensePlate || "",
      log.slotCode || "",
      log.status || "",
      formatDateTime(log.checkInTime),
      formatDateTime(log.checkOutTime)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
    ].join("\n");

    const blob = new Blob([`\ufeff${csvContent}`], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.setAttribute("href", url);
    link.setAttribute("download", `System_Performance_Report_${timeRange}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const metricCards = [
    {
      label: "TOTAL REVENUE",
      value: formatCurrency(summary.totalRevenue),
      hint: `${timeRange} revenue from payments`,
      icon: DollarSign
    },
    {
      label: "TOTAL SESSIONS",
      value: formatNumber(summary.totalSessions),
      hint: "Parking sessions in selected range",
      icon: Activity
    },
    {
      label: "AVG OCCUPANCY",
      value: formatPercent(summary.avgOccupancy),
      hint: "Occupied and reserved slots",
      icon: Percent
    },
    {
      label: "RESERVATIONS",
      value: formatNumber(summary.totalReservations),
      hint: "Booking records in selected range",
      icon: Calendar
    }
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main
        className="main-content"
        style={{
          flex: 1,
          padding: "2rem",
          overflowY: "auto",
          minWidth: 0,
          background: "var(--bg-dashboard)",
          color: "var(--text-main)"
        }}
      >
        <Header />

        <style>
          {`
            .report-progress-track {
              width: 100% !important;
              background-color: #cbd5e1 !important;
              border: 1px solid #94a3b8 !important;
              border-radius: 999px !important;
              overflow: hidden !important;
              position: relative !important;
              box-sizing: border-box !important;
              pointer-events: none !important;
              user-select: none !important;
            }

            .report-progress-fill {
              height: 100% !important;
              display: block !important;
              border-radius: 999px !important;
              opacity: 1 !important;
              visibility: visible !important;
              min-width: 4px !important;
              pointer-events: none !important;
              transform: translateZ(0) !important;
              backface-visibility: hidden !important;
            }

            .report-progress-fill-blue {
              background-color: #3b82f6 !important;
            }

            .report-progress-fill-green {
              background-color: #10b981 !important;
            }

            .report-progress-fill-red {
              background-color: #ef4444 !important;
            }

            .report-progress-fill-yellow {
              background-color: #f59e0b !important;
            }

            .report-revenue-bar {
              background-color: #3b82f6 !important;
              opacity: 1 !important;
              visibility: visible !important;
              transform: translateZ(0) !important;
              backface-visibility: hidden !important;
            }

            /*
             * Dedicated colors for the Monthly Comparison chart.
             *
             * These use !important because the global light-theme CSS
             * can otherwise override inline backgrounds and make the
             * bars appear white or transparent.
             */
            .report-session-bar {
              background-color: #10b981 !important;
              border: 1px solid #059669 !important;
              opacity: 1 !important;
              visibility: visible !important;
              transform: translateZ(0) !important;
              backface-visibility: hidden !important;
              box-shadow: 0 0 14px rgba(16, 185, 129, 0.28) !important;
            }

            .report-reservation-bar {
              background-color: #f59e0b !important;
              border: 1px solid #d97706 !important;
              opacity: 1 !important;
              visibility: visible !important;
              transform: translateZ(0) !important;
              backface-visibility: hidden !important;
              box-shadow: 0 0 14px rgba(245, 158, 11, 0.28) !important;
            }

            /*
             * Keep the legend colors stable in both light and dark mode.
             */
            .report-session-legend {
              color: #059669 !important;
            }

            .report-reservation-legend {
              color: #d97706 !important;
            }

            .report-chart-grid {
              background-color: transparent !important;
              background-image:
                linear-gradient(
                  to top,
                  transparent 0%,
                  transparent 24%,
                  rgba(100, 116, 139, 0.38) 24.7%,
                  rgba(100, 116, 139, 0.38) 25.3%,
                  transparent 25.8%,
                  transparent 49%,
                  rgba(100, 116, 139, 0.38) 49.7%,
                  rgba(100, 116, 139, 0.38) 50.3%,
                  transparent 50.8%,
                  transparent 74%,
                  rgba(100, 116, 139, 0.38) 74.7%,
                  rgba(100, 116, 139, 0.38) 75.3%,
                  transparent 75.8%,
                  transparent 100%
                ) !important;
              border-top: 1px solid rgba(100, 116, 139, 0.45) !important;
              border-bottom: 1px solid rgba(100, 116, 139, 0.45) !important;
            }

            [data-theme="dark"] .report-chart-grid,
            .dark .report-chart-grid,
            body.dark .report-chart-grid {
              background-image:
                linear-gradient(
                  to top,
                  transparent 0%,
                  transparent 24%,
                  rgba(148, 163, 184, 0.22) 24.7%,
                  rgba(148, 163, 184, 0.22) 25.3%,
                  transparent 25.8%,
                  transparent 49%,
                  rgba(148, 163, 184, 0.22) 49.7%,
                  rgba(148, 163, 184, 0.22) 50.3%,
                  transparent 50.8%,
                  transparent 74%,
                  rgba(148, 163, 184, 0.22) 74.7%,
                  rgba(148, 163, 184, 0.22) 75.3%,
                  transparent 75.8%,
                  transparent 100%
                ) !important;
              border-top: 1px solid rgba(148, 163, 184, 0.35) !important;
              border-bottom: 1px solid rgba(148, 163, 184, 0.35) !important;
            }

            [data-theme="dark"] .report-progress-track,
            .dark .report-progress-track,
            body.dark .report-progress-track {
              background-color: #1e293b !important;
              border-color: rgba(148, 163, 184, 0.35) !important;
            }
          `}
        </style>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            marginBottom: "1.75rem",
            flexWrap: "wrap"
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                color: "var(--text-main)",
                fontSize: "1.9rem",
                margin: "0",
                letterSpacing: "-0.04em"
              }}
            >
              System performance reports
            </h1>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={handleExportCSV}
              disabled={loading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 1rem",
                background: "#111827",
                border: "1px solid #1e293b",
                borderRadius: "0.5rem",
                color: "#ffffff",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "0.85rem",
                fontWeight: "700",
                opacity: loading ? 0.6 : 1
              }}
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        <div
          style={{
            ...styles.card,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 1rem",
            borderRadius: "0.75rem",
            marginBottom: "2rem",
            gap: "1rem",
            flexWrap: "wrap"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap"
            }}
          >
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "0.75rem",
                fontWeight: "bold",
                marginRight: "0.5rem"
              }}
            >
              TIME RANGE
            </span>

            {["Today", "Week", "Month", "Monthly Comparison"].map((tab) => {
              const isSelected = timeRange === tab;

              return (
                <button
                  key={tab}
                  onClick={() => setTimeRange(tab)}
                  disabled={isRefreshing && isSelected}
                  style={{
                    padding: "0.45rem 1.15rem",
                    borderRadius: "0.45rem",
                    border: isSelected
                      ? "1px solid var(--primary-blue)"
                      : "1px solid transparent",
                    background: isSelected
                      ? "var(--primary-blue)"
                      : "transparent",
                    color: isSelected ? "#ffffff" : "var(--text-muted)",
                    cursor: isRefreshing && isSelected ? "default" : "pointer",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    opacity: isRefreshing && !isSelected ? 0.85 : 1
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "0.75rem",
              flexWrap: "wrap"
            }}
          >
            {isMonthlyComparison && (
              <select
                value={comparisonMonths}
                onChange={(event) =>
                  setComparisonMonths(
                    Number(event.target.value)
                  )
                }
                disabled={loading}
                style={{
                  background: "var(--bg-input)",
                  border:
                    "1px solid var(--border-color)",
                  color: "var(--text-main)",
                  borderRadius: "0.45rem",
                  padding: "0.45rem 0.7rem",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  cursor: loading
                    ? "not-allowed"
                    : "pointer"
                }}
              >
                <option value={6}>
                  Last 6 months
                </option>
                <option value={12}>
                  Last 12 months
                </option>
              </select>
            )}

            <span
              style={{
                color: "var(--text-main)",
                fontSize: "0.78rem",
                fontWeight: "800",
                display: "inline-flex",
                alignItems: "center",
                minWidth: "120px",
                justifyContent: "flex-end"
              }}
            >
              {isInitialLoading
                ? "Loading..."
                : isMonthlyComparison
                  ? `Range: ${comparisonMonths} months`
                  : `Range: ${apiRange}`}
            </span>
          </div>
        </div>

        {errorMessage && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid #ef4444",
              color: "#ef4444",
              padding: "0.85rem 1rem",
              borderRadius: "0.75rem",
              marginBottom: "1.5rem",
              fontSize: "0.9rem",
              fontWeight: "700"
            }}
          >
            {errorMessage}
          </div>
        )}

        {isMonthlyComparison ? (
          <MonthlyComparisonSection
            data={monthlyComparison}
            loading={loading && monthlyComparison.length === 0}
            months={comparisonMonths}
          />
        ) : (
          <>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1.25rem",
            marginBottom: "2rem"
          }}
        >
          {metricCards.map((card) => {
            const Icon = card.icon;
            const displayValue = isInitialLoading ? "..." : card.value;

            return (
              <div
                key={card.label}
                className="report-summary-card"
                style={{
                  ...styles.card,
                  padding: "1.25rem",
                  borderRadius: "0.75rem",
                  minHeight: "126px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "1rem",
                  boxSizing: "border-box",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column"
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      fontWeight: "800",
                      letterSpacing: "0.02em",
                      lineHeight: 1.2
                    }}
                  >
                    {card.label}
                  </span>

                  <p
                    style={{
                      fontSize: getMetricValueFontSize(displayValue),
                      fontWeight: "800",
                      margin: "0.65rem 0 0 0",
                      color: "var(--text-main)",
                      lineHeight: 1.08,
                      maxWidth: "100%",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word"
                    }}
                  >
                    {displayValue}
                  </p>

                  <span
                    style={{
                      display: "block",
                      color: "var(--text-muted)",
                      fontSize: "0.75rem",
                      marginTop: "0.45rem",
                      lineHeight: 1.35
                    }}
                  >
                    {card.hint}
                  </span>
                </div>

                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    flexShrink: 0,
                    background: "rgba(59, 130, 246, 0.12)",
                    border: "1px solid rgba(59, 130, 246, 0.18)",
                    borderRadius: "0.75rem",
                    color: "var(--primary-blue)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Icon size={22} />
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(300px, 1fr)",
            gap: "1.5rem",
            marginBottom: "1.5rem"
          }}
        >
          <div
            className="report-chart-card"
            style={{
              ...styles.card,
              borderRadius: "0.75rem",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              minHeight: "360px",
              minWidth: 0
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                gap: "1rem",
                flexWrap: "wrap"
              }}
            >
              <div>
                <h3
                  style={{
                    color: "var(--text-main)",
                    margin: 0,
                    fontSize: "1.15rem"
                  }}
                >
                  Revenue performance
                </h3>

                <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  Revenue grouped by selected time range
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  fontSize: "0.8rem",
                  fontWeight: "700"
                }}
              >
                <span
                  style={{
                    color: reportColors.blue,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem"
                  }}
                >
                  <Circle size={7} fill="currentColor" />
                  Revenue
                </span>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                display: "grid",
                gridTemplateRows: "1fr auto",
                gap: "1rem"
              }}
            >
              <div
                className="report-chart-grid"
                style={{
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: `repeat(${Math.max(
                    chartData.length,
                    1
                  )}, minmax(0, 1fr))`,
                  alignItems: "end",
                  gap: "1rem",
                  padding: "1rem 0.5rem 0 0.5rem",
                  minHeight: "230px"
                }}
              >
                {chartData.length === 0 ? (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      color: "var(--text-muted)",
                      textAlign: "center",
                      alignSelf: "center",
                      fontWeight: "700"
                    }}
                  >
                    {isInitialLoading
                      ? "Loading revenue chart..."
                      : "No revenue chart data"}
                  </div>
                ) : (
                  chartData.map((item, index) => {
                    const currentHeight = Math.max(
                      (item.revenue / maxChartValue) * 100,
                      item.revenue > 0 ? 6 : 0
                    );

                    return (
                      <div
                        key={`${item.label}-${index}`}
                        style={{
                          display: "flex",
                          alignItems: "end",
                          justifyContent: "center",
                          height: "100%"
                        }}
                      >
                        <div
                          className="report-revenue-bar"
                          title={`${item.label}: ${formatCurrency(
                            item.revenue
                          )} (${item.paymentCount} payments)`}
                          style={{
                            width: "22px",
                            height: `${currentHeight}%`,
                            borderRadius: "999px 999px 0 0",
                            boxShadow: "0 0 16px rgba(59, 130, 246, 0.35)"
                          }}
                        />
                      </div>
                    );
                  })
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${Math.max(
                    chartData.length,
                    1
                  )}, minmax(0, 1fr))`,
                  gap: "1rem",
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  textAlign: "center"
                }}
              >
                {chartData.length === 0 ? (
                  <span>No data</span>
                ) : (
                  chartData.map((item, index) => (
                    <span key={`${item.label}-${index}`}>{item.label}</span>
                  ))
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: "1.5rem",
                paddingTop: "1.25rem",
                borderTop: "1px solid var(--border-color)"
              }}
            >
              <h4
                style={{
                  color: "var(--text-main)",
                  margin: "0 0 1rem 0",
                  fontSize: "1rem",
                  fontWeight: "800"
                }}
              >
                Revenue Breakdown
              </h4>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    color: "var(--text-main)",
                    fontSize: "0.9rem"
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        color: "var(--text-muted)",
                        textAlign: "left",
                        background: "rgba(148, 163, 184, 0.14)"
                      }}
                    >
                      <th style={{ padding: "0.5rem 0.75rem 0.5rem 0" }}>
                        Period
                      </th>
                      <th style={{ padding: "0.5rem 0.75rem" }}>Revenue</th>
                      <th style={{ padding: "0.5rem 0.75rem" }}>Payments</th>
                    </tr>
                  </thead>

                  <tbody>
                    {chartData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          style={{
                            padding: "0.75rem 0",
                            color: "var(--text-muted)",
                            fontWeight: "700"
                          }}
                        >
                          No revenue breakdown data
                        </td>
                      </tr>
                    ) : (
                      chartData.map((item, index) => (
                        <tr key={`${item.label}-breakdown-${index}`}>
                          <td
                            style={{
                              padding: "0.35rem 0.75rem 0.35rem 0",
                              fontWeight: "700",
                              color: "var(--text-main)"
                            }}
                          >
                            {item.label}
                          </td>
                          <td
                            style={{
                              padding: "0.35rem 0.75rem",
                              color: "var(--text-main)"
                            }}
                          >
                            {formatCurrency(item.revenue)}
                          </td>
                          <td
                            style={{
                              padding: "0.35rem 0.75rem",
                              color: "var(--text-main)"
                            }}
                          >
                            {formatNumber(item.paymentCount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div
            className="report-side-card"
            style={{
              ...styles.card,
              borderRadius: "0.75rem",
              padding: "1.5rem",
              minWidth: 0
            }}
          >
            <h3
              style={{
                color: "var(--text-main)",
                margin: "0 0 1.5rem 0",
                fontSize: "1.15rem"
              }}
            >
              Vehicle distribution
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {vehicleDistribution.length === 0 ? (
                <p
                  style={{
                    color: "var(--text-muted)",
                    margin: 0,
                    fontWeight: "700"
                  }}
                >
                  {isInitialLoading
                    ? "Loading vehicle distribution..."
                    : "No vehicle distribution data"}
                </p>
              ) : (
                vehicleDistribution.map((vehicle, index) => {
                  const Icon = vehicle.icon;

                  return (
                    <div key={`${vehicle.label}-${index}`}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          color: "var(--text-main)",
                          fontSize: "0.85rem",
                          fontWeight: "700",
                          marginBottom: "0.5rem",
                          gap: "1rem"
                        }}
                      >
                        <span
                          style={{
                            color: "var(--text-main)",
                            display: "flex",
                            gap: "0.5rem",
                            minWidth: 0
                          }}
                        >
                          <Icon size={16} />
                          {vehicle.label}
                        </span>
                        <span>{formatPercent(vehicle.percent)}</span>
                      </div>

                      <div
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.75rem",
                          marginBottom: "0.5rem"
                        }}
                      >
                        {formatNumber(vehicle.count)} slots
                      </div>

                      <ProgressBar
                        percent={vehicle.percent}
                        colorClass={vehicle.colorClass}
                        height={9}
                      />
                    </div>
                  );
                })
              )}
            </div>

            <div
              style={{
                marginTop: "2rem",
                paddingTop: "1.25rem",
                borderTop: "1px solid var(--border-color)"
              }}
            >
              <h4
                style={{
                  margin: "0 0 1rem 0",
                  color: "var(--text-main)",
                  fontSize: "0.95rem"
                }}
              >
                Reservation status
              </h4>

              <div style={{ display: "grid", gap: "0.85rem" }}>
                {reservationStatusBreakdown.length === 0 ? (
                  <p
                    style={{
                      color: "var(--text-muted)",
                      margin: 0,
                      fontWeight: "700"
                    }}
                  >
                    {isInitialLoading
                      ? "Loading reservation data..."
                      : "No reservation data"}
                  </p>
                ) : (
                  reservationStatusBreakdown.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.label}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.35rem",
                            gap: "1rem"
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.45rem",
                              color: "var(--text-main)",
                              fontSize: "0.78rem",
                              fontWeight: "700"
                            }}
                          >
                            <Icon size={14} color={item.color} />
                            {item.label}
                          </span>

                          <span
                            style={{
                              color: "var(--text-main)",
                              fontSize: "0.78rem",
                              fontWeight: "700"
                            }}
                          >
                            {formatNumber(item.value)}
                          </span>
                        </div>

                        <ProgressBar
                          percent={item.percent}
                          colorClass={item.colorClass}
                          height={6}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <SimpleBreakdownTable
              title="Vehicle Distribution"
              headers={["Vehicle Type", "Count", "Percent"]}
              emptyText="No vehicle distribution data"
              rows={vehicleDistribution.map((vehicle) => [
                vehicle.label,
                formatNumber(vehicle.count),
                formatPercent(vehicle.percent)
              ])}
            />

            <SimpleBreakdownTable
              title="Reservation Status"
              headers={["Status", "Count", "Percent"]}
              emptyText="No reservation data"
              rows={reservationStatusBreakdown.map((item) => [
                item.label,
                formatNumber(item.value),
                formatPercent(item.percent)
              ])}
            />
          </div>
        </div>

        <div
          className="report-operational-log"
          style={{
            ...styles.card,
            borderRadius: "0.75rem",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border-color)",
              gap: "1rem",
              flexWrap: "wrap"
            }}
          >
            <div>
              <h3
                style={{
                  color: "var(--text-main)",
                  margin: 0,
                  fontSize: "1.1rem"
                }}
              >
                Operational log
              </h3>
              <p
                style={{
                  color: "var(--text-muted)",
                  margin: "0.35rem 0 0",
                  fontSize: "0.8rem"
                }}
              >
                Recent parking sessions in the selected time range.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                color: "var(--text-muted)"
              }}
            >
              <button
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer"
                }}
              >
                <Filter size={18} />
              </button>

              <button
                style={{
                  background: "transparent",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer"
                }}
              >
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          <div style={{ width: "100%", overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: "900px",
                borderCollapse: "collapse",
                textAlign: "left"
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border-color)",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                    background: "rgba(148, 163, 184, 0.14)"
                  }}
                >
                  <th style={{ padding: "1rem 1.5rem" }}>TICKET</th>
                  <th style={{ padding: "1rem" }}>LICENSE PLATE</th>
                  <th style={{ padding: "1rem" }}>SLOT</th>
                  <th style={{ padding: "1rem" }}>STATUS</th>
                  <th style={{ padding: "1rem" }}>CHECK-IN</th>
                  <th style={{ padding: "1rem" }}>CHECK-OUT</th>
                  <th style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>

              <tbody>
                {operationalLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "var(--text-muted)",
                        fontWeight: "700"
                      }}
                    >
                      {isInitialLoading
                        ? "Loading operational logs..."
                        : "No operational logs"}
                    </td>
                  </tr>
                ) : (
                  operationalLogs.map((log, index) => {
                    const statusMeta = getStatusMeta(log.status);

                    return (
                      <tr
                        key={`${log.sessionId || index}`}
                        style={{
                          borderBottom: "1px solid var(--border-color)",
                          color: "var(--text-main)",
                          fontSize: "0.9rem",
                          background: "var(--bg-table-row)"
                        }}
                      >
                        <td style={{ padding: "1rem 1.5rem", fontWeight: "700" }}>
                          {log.ticketId || `#${log.sessionId}`}
                        </td>

                        <td
                          style={{
                            padding: "1rem",
                            color: "var(--success-green)",
                            fontWeight: "700"
                          }}
                        >
                          {log.licensePlate || "N/A"}
                        </td>

                        <td style={{ padding: "1rem", fontWeight: "700" }}>
                          {log.slotCode || "N/A"}
                        </td>

                        <td style={{ padding: "1rem" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              color: statusMeta.color,
                              background: `${statusMeta.color}20`,
                              border: `1px solid ${statusMeta.color}55`,
                              borderRadius: "999px",
                              padding: "0.25rem 0.65rem",
                              fontSize: "0.75rem",
                              fontWeight: "800"
                            }}
                          >
                            {statusMeta.label}
                          </span>
                        </td>

                        <td style={{ padding: "1rem", color: "var(--text-muted)" }}>
                          {formatDateTime(log.checkInTime)}
                        </td>

                        <td style={{ padding: "1rem", color: "var(--text-muted)" }}>
                          {formatDateTime(log.checkOutTime)}
                        </td>

                        <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
                          <button
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--primary-blue)",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                              fontWeight: "bold"
                            }}
                          >
                            DETAILS
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 1.5rem",
              borderTop: "1px solid var(--border-color)",
              gap: "1rem",
              flexWrap: "wrap"
            }}
          >
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Showing {operationalLogs.length} records for{" "}
              {timeRange.toLowerCase()} report
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <button
                style={{
                  background: "rgba(148, 163, 184, 0.14)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-muted)",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "0.375rem",
                  cursor: "not-allowed"
                }}
                disabled
              >
                <ChevronLeft size={16} />
              </button>

              <button
                style={{
                  background: "var(--primary-blue)",
                  border: "1px solid var(--primary-blue)",
                  color: "#ffffff",
                  padding: "0.4rem 0.75rem",
                  borderRadius: "0.375rem",
                  fontSize: "0.85rem",
                  fontWeight: "bold"
                }}
              >
                1
              </button>

              <button
                style={{
                  background: "rgba(148, 163, 184, 0.14)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-muted)",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "0.375rem",
                  cursor: "not-allowed"
                }}
                disabled
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
          </>
        )}

      </main>
    </div>
  );
};

function MonthlyComparisonSection({
  data,
  loading,
  months
}) {
  const latestMonth =
    data.length > 0
      ? data[data.length - 1]
      : null;

  const previousMonth =
    data.length > 1
      ? data[data.length - 2]
      : null;

  const maxRevenue = Math.max(
    ...data.map((item) => item.totalRevenue),
    1
  );

  const maxActivity = Math.max(
    ...data.flatMap((item) => [
      item.totalSessions,
      item.totalReservations
    ]),
    1
  );

  const occupancyGrowth = latestMonth
    ? calculateGrowthPercent(
        previousMonth?.averageOccupancy || 0,
        latestMonth.averageOccupancy
      )
    : 0;

  const cards = [
    {
      label: "CURRENT MONTH REVENUE",
      value: formatCurrency(
        latestMonth?.totalRevenue || 0
      ),
      growth:
        latestMonth?.revenueGrowthPercent || 0,
      hint: latestMonth?.monthLabel || "No data",
      icon: DollarSign
    },
    {
      label: "PARKING SESSIONS",
      value: formatNumber(
        latestMonth?.totalSessions || 0
      ),
      growth:
        latestMonth?.sessionGrowthPercent || 0,
      hint: "Compared with previous month",
      icon: Activity
    },
    {
      label: "RESERVATIONS",
      value: formatNumber(
        latestMonth?.totalReservations || 0
      ),
      growth:
        latestMonth?.reservationGrowthPercent || 0,
      hint: "Compared with previous month",
      icon: Calendar
    },
    {
      label: "AVERAGE OCCUPANCY",
      value: formatPercent(
        latestMonth?.averageOccupancy || 0
      ),
      growth: occupancyGrowth,
      hint: "Monthly average occupancy",
      icon: Percent
    }
  ];

  if (loading) {
    return (
      <div
        style={{
          ...styles.card,
          borderRadius: "0.75rem",
          minHeight: "340px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontWeight: "700"
        }}
      >
        Loading monthly comparison...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        style={{
          ...styles.card,
          borderRadius: "0.75rem",
          minHeight: "260px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontWeight: "700"
        }}
      >
        No monthly comparison data.
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem"
        }}
      >
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              style={{
                ...styles.card,
                padding: "1.25rem",
                borderRadius: "0.75rem",
                minHeight: "142px",
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem"
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.72rem",
                    fontWeight: "800"
                  }}
                >
                  {card.label}
                </span>

                <p
                  style={{
                    margin: "0.65rem 0 0",
                    color: "var(--text-main)",
                    fontSize: getMetricValueFontSize(
                      card.value
                    ),
                    lineHeight: 1.08,
                    fontWeight: "800",
                    overflowWrap: "anywhere"
                  }}
                >
                  {card.value}
                </p>

                <div
                  style={{
                    marginTop: "0.55rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.45rem",
                    flexWrap: "wrap"
                  }}
                >
                  <GrowthBadge value={card.growth} />

                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.72rem"
                    }}
                  >
                    {card.hint}
                  </span>
                </div>
              </div>

              <div
                style={{
                  width: "46px",
                  height: "46px",
                  flexShrink: 0,
                  borderRadius: "0.75rem",
                  background:
                    "rgba(59, 130, 246, 0.12)",
                  border:
                    "1px solid rgba(59, 130, 246, 0.18)",
                  color: "var(--primary-blue)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Icon size={21} />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(420px, 1fr))",
          gap: "1.5rem",
          marginBottom: "1.5rem"
        }}
      >
        <div
          style={{
            ...styles.card,
            borderRadius: "0.75rem",
            padding: "1.5rem",
            minWidth: 0
          }}
        >
          <div style={{ marginBottom: "1.25rem" }}>
            <h3
              style={{
                margin: 0,
                color: "var(--text-main)",
                fontSize: "1.15rem"
              }}
            >
              Monthly revenue trend
            </h3>

            <p
              style={{
                margin: "0.35rem 0 0",
                color: "var(--text-muted)",
                fontSize: "0.78rem"
              }}
            >
              Revenue comparison across the last {months} months.
            </p>
          </div>

          <div
            className="report-chart-grid"
            style={{
              minHeight: "270px",
              display: "grid",
              gridTemplateColumns: `repeat(${data.length}, minmax(44px, 1fr))`,
              alignItems: "end",
              gap: "0.75rem",
              padding: "1rem 0.5rem 0",
              overflowX: "auto"
            }}
          >
            {data.map((item) => {
              const height = Math.max(
                (item.totalRevenue / maxRevenue) * 100,
                item.totalRevenue > 0 ? 5 : 0
              );

              return (
                <div
                  key={`${item.year}-${item.month}-revenue`}
                  style={{
                    height: "100%",
                    minWidth: "44px",
                    display: "grid",
                    gridTemplateRows: "1fr auto",
                    gap: "0.55rem"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "end",
                      justifyContent: "center"
                    }}
                  >
                    <div
                      className="report-revenue-bar"
                      title={`${item.monthLabel}: ${formatCurrency(item.totalRevenue)}`}
                      style={{
                        width: "30px",
                        height: `${height}%`,
                        minHeight:
                          item.totalRevenue > 0
                            ? "6px"
                            : "0",
                        borderRadius:
                          "8px 8px 0 0",
                        boxShadow:
                          "0 0 14px rgba(59, 130, 246, 0.28)"
                      }}
                    />
                  </div>

                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.68rem",
                      fontWeight: "700",
                      textAlign: "center",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {item.monthLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            ...styles.card,
            borderRadius: "0.75rem",
            padding: "1.5rem",
            minWidth: 0
          }}
        >
          <div style={{ marginBottom: "1.25rem" }}>
            <h3
              style={{
                margin: 0,
                color: "var(--text-main)",
                fontSize: "1.15rem"
              }}
            >
              Sessions and reservations
            </h3>

            <p
              style={{
                margin: "0.35rem 0 0",
                color: "var(--text-muted)",
                fontSize: "0.78rem"
              }}
            >
              Monthly activity volume comparison.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginBottom: "0.75rem",
              color: "var(--text-muted)",
              fontSize: "0.75rem",
              fontWeight: "700"
            }}
          >
            <span className="report-session-legend">
              ● Sessions
            </span>
            <span className="report-reservation-legend">
              ● Reservations
            </span>
          </div>

          <div
            className="report-chart-grid"
            style={{
              minHeight: "245px",
              display: "grid",
              gridTemplateColumns: `repeat(${data.length}, minmax(54px, 1fr))`,
              alignItems: "end",
              gap: "0.75rem",
              padding: "1rem 0.5rem 0",
              overflowX: "auto"
            }}
          >
            {data.map((item) => {
              const sessionHeight = Math.max(
                (item.totalSessions / maxActivity) * 100,
                item.totalSessions > 0 ? 5 : 0
              );

              const reservationHeight = Math.max(
                (item.totalReservations / maxActivity) * 100,
                item.totalReservations > 0 ? 5 : 0
              );

              return (
                <div
                  key={`${item.year}-${item.month}-activity`}
                  style={{
                    height: "100%",
                    minWidth: "54px",
                    display: "grid",
                    gridTemplateRows: "1fr auto",
                    gap: "0.55rem"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "end",
                      justifyContent: "center",
                      gap: "5px"
                    }}
                  >
                    <div
                      className="report-session-bar"
                      title={`${item.monthLabel}: ${formatNumber(item.totalSessions)} sessions`}
                      style={{
                        width: "18px",
                        height: `${sessionHeight}%`,
                        minHeight:
                          item.totalSessions > 0
                            ? "6px"
                            : "0",
                        borderRadius: "6px 6px 0 0",
                        boxSizing: "border-box"
                      }}
                    />

                    <div
                      className="report-reservation-bar"
                      title={`${item.monthLabel}: ${formatNumber(item.totalReservations)} reservations`}
                      style={{
                        width: "18px",
                        height: `${reservationHeight}%`,
                        minHeight:
                          item.totalReservations > 0
                            ? "6px"
                            : "0",
                        borderRadius: "6px 6px 0 0",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.68rem",
                      fontWeight: "700",
                      textAlign: "center",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {item.monthLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div
        style={{
          ...styles.card,
          borderRadius: "0.75rem",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom:
              "1px solid var(--border-color)"
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "var(--text-main)",
              fontSize: "1.1rem"
            }}
          >
            Monthly comparison details
          </h3>

          <p
            style={{
              margin: "0.35rem 0 0",
              color: "var(--text-muted)",
              fontSize: "0.78rem"
            }}
          >
            The current month may contain partial data.
          </p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: "1100px",
              borderCollapse: "collapse",
              color: "var(--text-main)",
              fontSize: "0.82rem"
            }}
          >
            <thead>
              <tr
                style={{
                  color: "var(--text-muted)",
                  textAlign: "left",
                  background:
                    "rgba(148, 163, 184, 0.14)"
                }}
              >
                <th style={{ padding: "0.9rem 1rem" }}>
                  MONTH
                </th>
                <th style={{ padding: "0.9rem 1rem" }}>
                  REVENUE
                </th>
                <th style={{ padding: "0.9rem 1rem" }}>
                  PAYMENTS
                </th>
                <th style={{ padding: "0.9rem 1rem" }}>
                  SESSIONS
                </th>
                <th style={{ padding: "0.9rem 1rem" }}>
                  RESERVATIONS
                </th>
                <th style={{ padding: "0.9rem 1rem" }}>
                  COMPLETED
                </th>
                <th style={{ padding: "0.9rem 1rem" }}>
                  CANCELLED
                </th>
                <th style={{ padding: "0.9rem 1rem" }}>
                  OCCUPANCY
                </th>
                <th style={{ padding: "0.9rem 1rem" }}>
                  REVENUE CHANGE
                </th>
              </tr>
            </thead>

            <tbody>
              {data.map((item) => (
                <tr
                  key={`${item.year}-${item.month}-row`}
                  style={{
                    borderTop:
                      "1px solid var(--border-color)",
                    background:
                      "var(--bg-table-row)"
                  }}
                >
                  <td
                    style={{
                      padding: "0.9rem 1rem",
                      fontWeight: "800"
                    }}
                  >
                    {item.monthLabel}
                  </td>

                  <td style={{ padding: "0.9rem 1rem" }}>
                    {formatCurrency(item.totalRevenue)}
                  </td>

                  <td style={{ padding: "0.9rem 1rem" }}>
                    {formatNumber(item.paymentCount)}
                  </td>

                  <td style={{ padding: "0.9rem 1rem" }}>
                    {formatNumber(item.totalSessions)}
                  </td>

                  <td style={{ padding: "0.9rem 1rem" }}>
                    {formatNumber(item.totalReservations)}
                  </td>

                  <td
                    style={{
                      padding: "0.9rem 1rem",
                      color: reportColors.green,
                      fontWeight: "700"
                    }}
                  >
                    {formatNumber(
                      item.completedReservations
                    )}
                  </td>

                  <td
                    style={{
                      padding: "0.9rem 1rem",
                      color: reportColors.red,
                      fontWeight: "700"
                    }}
                  >
                    {formatNumber(
                      item.cancelledReservations
                    )}
                  </td>

                  <td style={{ padding: "0.9rem 1rem" }}>
                    {formatPercent(
                      item.averageOccupancy
                    )}
                  </td>

                  <td style={{ padding: "0.9rem 1rem" }}>
                    <GrowthBadge
                      value={
                        item.revenueGrowthPercent
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function GrowthBadge({ value }) {
  const number = Number(value || 0);

  const isPositive = number > 0;
  const isNegative = number < 0;

  const color = isPositive
    ? reportColors.green
    : isNegative
      ? reportColors.red
      : "var(--text-muted)";

  const Icon = isPositive
    ? TrendingUp
    : isNegative
      ? TrendingDown
      : Minus;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        color,
        background: isPositive
          ? "rgba(16, 185, 129, 0.12)"
          : isNegative
            ? "rgba(239, 68, 68, 0.12)"
            : "rgba(148, 163, 184, 0.14)",
        border: `1px solid ${color}`,
        borderRadius: "999px",
        padding: "0.18rem 0.48rem",
        fontSize: "0.7rem",
        fontWeight: "800",
        whiteSpace: "nowrap"
      }}
    >
      <Icon size={12} />
      {formatGrowthPercent(number)}
    </span>
  );
}

function SimpleBreakdownTable({ title, headers, rows, emptyText }) {
  return (
    <div
      style={{
        marginTop: "2rem",
        paddingTop: "1.25rem",
        borderTop: "1px solid var(--border-color)"
      }}
    >
      <h4
        style={{
          color: "var(--text-main)",
          margin: "0 0 1rem 0",
          fontSize: "1rem",
          fontWeight: "800"
        }}
      >
        {title}
      </h4>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            color: "var(--text-main)",
            fontSize: "0.9rem"
          }}
        >
          <thead>
            <tr
              style={{
                color: "var(--text-muted)",
                textAlign: "left",
                background: "rgba(148, 163, 184, 0.14)"
              }}
            >
              {headers.map((header) => (
                <th key={header} style={{ padding: "0.5rem" }}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  style={{
                    padding: "0.75rem 0.5rem",
                    color: "var(--text-muted)",
                    fontWeight: "700"
                  }}
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${title}-${rowIndex}-${cellIndex}`}
                      style={{
                        padding: "0.35rem 0.5rem",
                        color: "var(--text-main)",
                        fontWeight: cellIndex === 0 ? "700" : "500"
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Reports;