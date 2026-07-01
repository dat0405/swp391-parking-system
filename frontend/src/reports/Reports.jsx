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
  Clock
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
      color: "#10b981",
      icon: CheckCircle2
    };
  }

  if (value === "PENDING" || value === "RESERVED" || value === "ACTIVE") {
    return {
      label: value,
      color: "#f59e0b",
      icon: Clock
    };
  }

  if (value === "CANCELLED" || value === "CANCELED") {
    return {
      label: value,
      color: "#ef4444",
      icon: XCircle
    };
  }

  return {
    label: value || "UNKNOWN",
    color: "#3b82f6",
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
      color: isMotorbike ? "#10b981" : "#3b82f6"
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

const styles = {
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    color: "var(--text-main)",
    boxShadow: "var(--shadow-card)"
  },
  mutedText: {
    color: "var(--text-muted)"
  },
  mainText: {
    color: "var(--text-main)"
  },
  softBorder: {
    borderColor: "var(--border-color)"
  },
  inputLike: {
    background: "var(--bg-input)",
    border: "1px solid var(--border-color)",
    color: "var(--text-main)"
  }
};

const Reports = () => {
  const [timeRange, setTimeRange] = useState("Week");
  const [report, setReport] = useState(emptyReport);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const apiRange = rangeToApiValue[timeRange] || "WEEK";

  const isInitialLoading = loading && !hasLoadedOnce;
  const isRefreshing = loading && hasLoadedOnce;

  useEffect(() => {
    let isMounted = true;

    const loadReport = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const response = await reportDashboardApi.getReportDashboard(apiRange);

        if (!isMounted) return;

        setReport({
          ...emptyReport,
          ...(response.data || {}),
          summary: {
            ...emptyReport.summary,
            ...(response.data?.summary || {})
          },
          revenueChart: response.data?.revenueChart || [],
          vehicleDistribution: response.data?.vehicleDistribution || [],
          reservationStatusBreakdown:
            response.data?.reservationStatusBreakdown || [],
          slotStatusBreakdown: response.data?.slotStatusBreakdown || [],
          operationalLog: response.data?.operationalLog || []
        });
      } catch (error) {
        if (!isMounted) return;

        console.error("Failed to load report dashboard:", error);
        setErrorMessage("Failed to load report data from server.");

        if (!hasLoadedOnce) {
          setReport(emptyReport);
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
  }, [apiRange]);

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
              disabled={isInitialLoading}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.65rem 1rem",
                background: "#111827",
                border: "1px solid #1e293b",
                borderRadius: "0.5rem",
                color: "#ffffff",
                cursor: isInitialLoading ? "not-allowed" : "pointer",
                fontSize: "0.85rem",
                fontWeight: "700",
                opacity: isInitialLoading ? 0.6 : 1
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

            {["Today", "Week", "Month"].map((tab) => {
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
            {isInitialLoading ? "Loading..." : `Range: ${apiRange}`}
          </span>
        </div>

        {errorMessage && (
          <div
            style={{
              background: "var(--danger-red-soft)",
              border: "1px solid var(--danger-red)",
              color: "var(--danger-red)",
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
                    background: "var(--bg-card-soft)",
                    borderRadius: "0.75rem",
                    color: "var(--text-muted)",
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
                    color: "var(--primary-blue)",
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
                style={{
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: `repeat(${Math.max(
                    chartData.length,
                    1
                  )}, minmax(0, 1fr))`,
                  alignItems: "end",
                  gap: "1rem",
                  borderBottom: "1px solid var(--border-color)",
                  background:
                    "linear-gradient(to top, transparent 24%, var(--border-soft) 25%, transparent 26%, transparent 49%, var(--border-soft) 50%, transparent 51%, transparent 74%, var(--border-soft) 75%, transparent 76%)",
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
                          title={`${item.label}: ${formatCurrency(
                            item.revenue
                          )} (${item.paymentCount} payments)`}
                          style={{
                            width: "22px",
                            height: `${currentHeight}%`,
                            background: "var(--primary-blue)",
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
                        background: "var(--bg-table-header)"
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

                      <div
                        style={{
                          width: "100%",
                          height: "9px",
                          background: "var(--bg-card-soft)",
                          borderRadius: "999px",
                          overflow: "hidden"
                        }}
                      >
                        <div
                          style={{
                            width: `${vehicle.percent}%`,
                            height: "100%",
                            background: vehicle.color,
                            borderRadius: "999px"
                          }}
                        />
                      </div>
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

                        <div
                          style={{
                            width: "100%",
                            height: "6px",
                            background: "var(--bg-card-soft)",
                            borderRadius: "999px",
                            overflow: "hidden"
                          }}
                        >
                          <div
                            style={{
                              width: `${item.percent}%`,
                              height: "100%",
                              background: item.color,
                              borderRadius: "999px"
                            }}
                          />
                        </div>
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
                    background: "var(--bg-table-header)"
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
                  background: "var(--bg-card-soft)",
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
                  background: "var(--bg-card-soft)",
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
      </main>
    </div>
  );
};

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
                background: "var(--bg-table-header)"
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