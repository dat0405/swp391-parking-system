import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../dashboard/Sidebar";
import Header from "../dashboard/Header";
import {
  Calendar,
  Car,
  CheckCircle2,
  XCircle,
  Search,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";

import { bookingApi } from "../api/bookingApi";

const ReservationAdmin = () => {
  const [reservations, setReservations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [reservationToCancel, setReservationToCancel] = useState(null);
  const [selectedReservationDetail, setSelectedReservationDetail] = useState(null);

  const itemsPerPage = 5;

  const normalizeStatus = (status) => {
    return String(status || "").trim().toUpperCase();
  };

  const mapBookingToReservation = (booking) => {
    const status = normalizeStatus(booking.status);

    return {
      id: booking.id,
      displayId: `#RES-${String(booking.id).padStart(4, "0")}`,
      customer: {
        name: booking.customerName || "Unknown user",
        email: booking.customerEmail || `User ID: ${booking.userId || "-"}`,
      },
      plate: booking.licensePlate || "-",
      vehicleTypeName: booking.vehicleTypeName || "-",
      slot: booking.slotCode || `Slot ID: ${booking.slotId || "-"}`,
      floorName: booking.floorName || "",
      startTime: booking.startTime,
      endTime: booking.endTime,
      status,
      raw: booking,
    };
  };

  const loadReservations = async () => {
    try {
      setIsLoading(true);

      const response = await bookingApi.getAllBookings();
      const data = Array.isArray(response.data) ? response.data : [];

      setReservations(data.map(mapBookingToReservation));
    } catch (error) {
      console.error("Load reservations failed:", error);
      alert(
        error.response?.data?.message ||
          error.response?.data ||
          "Không tải được danh sách reservations."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const filteredData = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return reservations.filter((item) => {
      const searchableText = [
        item.displayId,
        item.customer.name,
        item.customer.email,
        item.plate,
        item.slot,
        item.floorName,
        item.vehicleTypeName,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || searchableText.includes(keyword);
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [reservations, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const totalReservations = reservations.length;
  const activeReservations = reservations.filter(
    (item) => item.status === "PENDING" || item.status === "CONFIRMED"
  ).length;
  const completedReservations = reservations.filter(
    (item) => item.status === "COMPLETED"
  ).length;
  const cancelledReservations = reservations.filter(
    (item) => item.status === "CANCELLED"
  ).length;

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    });
  };

  const formatTime = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTime = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name) => {
    return String(name || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0])
      .join("")
      .toUpperCase();
  };

  const getStatusLabel = (status) => {
    if (status === "PENDING") return "Pending";
    if (status === "CONFIRMED") return "Confirmed";
    if (status === "COMPLETED") return "Completed";
    if (status === "CANCELLED") return "Cancelled";
    return status || "Unknown";
  };

  const getStatusStyle = (status) => {
    if (status === "PENDING") {
      return {
        background: "rgba(147, 51, 234, 0.1)",
        color: "#a855f7",
      };
    }

    if (status === "CONFIRMED") {
      return {
        background: "rgba(16, 185, 129, 0.1)",
        color: "#10b981",
      };
    }

    if (status === "COMPLETED") {
      return {
        background: "rgba(100, 116, 139, 0.1)",
        color: "#94a3b8",
      };
    }

    if (status === "CANCELLED") {
      return {
        background: "rgba(239, 68, 68, 0.1)",
        color: "#ef4444",
      };
    }

    return {
      background: "rgba(100, 116, 139, 0.1)",
      color: "#94a3b8",
    };
  };

  const handleExportCSV = () => {
    const headers = [
      "Reservation ID",
      "Customer Name",
      "Customer Email",
      "Vehicle Plate",
      "Vehicle Type",
      "Slot",
      "Floor",
      "Start Time",
      "End Time",
      "Status",
    ];

    const rows = filteredData.map((item) => [
      item.displayId,
      item.customer.name,
      item.customer.email,
      item.plate,
      item.vehicleTypeName,
      item.slot,
      item.floorName,
      item.startTime || "",
      item.endTime || "",
      getStatusLabel(item.status),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([`\ufeff${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Reservations_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmReservation = async (reservation) => {
    try {
      await bookingApi.confirmBooking(reservation.id);
      await loadReservations();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          error.response?.data ||
          "Confirm reservation thất bại."
      );
    }
  };

  const confirmCancelReservation = async () => {
    if (!reservationToCancel) return;

    try {
      await bookingApi.cancelBooking(reservationToCancel.id);
      setReservationToCancel(null);
      await loadReservations();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          error.response?.data ||
          "Cancel reservation thất bại."
      );
    }
  };


  return (
    <div
      className="dashboard-layout"
      style={{ display: "flex", background: "#060b13", minHeight: "100vh" }}
    >
      <Sidebar />

      <main
        className="main-content"
        style={{ flex: 1, padding: "2rem", overflowY: "auto" }}
      >
        <Header />

        <div style={{ marginBottom: "2rem" }}>
          <p style={{ color: "#64748b", margin: "0" }}>
            View and manage parking reservations across the facility.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1.25rem",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              background: "#0c1322",
              padding: "1.25rem",
              borderRadius: "0.75rem",
              border: "1px solid #1e293b",
              position: "relative",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>
              TOTAL RESERVATIONS
            </span>
            <p
              style={{
                fontSize: "1.75rem",
                fontWeight: "bold",
                margin: "0.5rem 0",
                color: "#fff",
              }}
            >
              {totalReservations.toLocaleString()}
            </p>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              All reservations in the system
            </span>
            <div
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "#1e293b",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                color: "#64748b",
              }}
            >
              <Calendar size={20} />
            </div>
          </div>

          <div
            style={{
              background: "#0c1322",
              padding: "1.25rem",
              borderRadius: "0.75rem",
              border: "1px solid #1e293b",
              position: "relative",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>
              ACTIVE NOW
            </span>
            <p
              style={{
                fontSize: "1.75rem",
                fontWeight: "bold",
                margin: "0.5rem 0",
                color: "#fff",
              }}
            >
              {activeReservations.toLocaleString()}
            </p>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Reservations currently in progress
            </span>
            <div
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "rgba(16, 185, 129, 0.1)",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                color: "#10b981",
              }}
            >
              <Car size={20} />
            </div>
          </div>

          <div
            style={{
              background: "#0c1322",
              padding: "1.25rem",
              borderRadius: "0.75rem",
              border: "1px solid #1e293b",
              position: "relative",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>
              COMPLETED
            </span>
            <p
              style={{
                fontSize: "1.75rem",
                fontWeight: "bold",
                margin: "0.5rem 0",
                color: "#fff",
              }}
            >
              {completedReservations.toLocaleString()}
            </p>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Reservations that have been completed
            </span>
            <div
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "rgba(59, 130, 246, 0.1)",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                color: "#3b82f6",
              }}
            >
              <CheckCircle2 size={20} />
            </div>
          </div>

          <div
            style={{
              background: "#0c1322",
              padding: "1.25rem",
              borderRadius: "0.75rem",
              border: "1px solid #1e293b",
              position: "relative",
            }}
          >
            <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "bold" }}>
              CANCELLED
            </span>
            <p
              style={{
                fontSize: "1.75rem",
                fontWeight: "bold",
                margin: "0.5rem 0",
                color: "#fff",
              }}
            >
              {cancelledReservations.toLocaleString()}
            </p>
            <span style={{ fontSize: "0.75rem", color: "#ef4444" }}>
              Reservations that were cancelled
            </span>
            <div
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "rgba(239, 68, 68, 0.1)",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                color: "#ef4444",
              }}
            >
              <XCircle size={20} />
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flex: 1 }}>
            <div style={{ position: "relative", width: "300px" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                }}
              />
              <input
                type="text"
                placeholder="Filter by name, email, plate, slot..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.6rem 0.6rem 2.25rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #1e293b",
                  background: "#0c1322",
                  color: "#fff",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{
                padding: "0.6rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid #1e293b",
                background: "#0c1322",
                color: "#fff",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              <option value="All">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <button
              title="Reload reservations"
              onClick={loadReservations}
              style={{
                padding: "0.6rem",
                borderRadius: "0.5rem",
                border: "1px solid #1e293b",
                background: "#0c1322",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <RefreshCcw size={18} />
            </button>
          </div>

          <button
            title="Export report to CSV"
            onClick={handleExportCSV}
            style={{
              padding: "0.6rem",
              borderRadius: "0.5rem",
              border: "1px solid #1e293b",
              background: "#0c1322",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Download size={18} />
          </button>
        </div>

        <div
          style={{
            background: "#0c1322",
            borderRadius: "0.75rem",
            border: "1px solid #1e293b",
            overflow: "hidden",
            marginBottom: "1.5rem",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid #1e293b",
                  color: "#64748b",
                  fontSize: "0.85rem",
                }}
              >
                <th style={{ padding: "1rem" }}>ID</th>
                <th style={{ padding: "1rem" }}>Customer</th>
                <th style={{ padding: "1rem" }}>Vehicle Plate</th>
                <th style={{ padding: "1rem" }}>Slot</th>
                <th style={{ padding: "1rem" }}>Schedule</th>
                <th style={{ padding: "1rem" }}>Status</th>
                <th style={{ padding: "1rem", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    Loading reservations...
                  </td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{
                      padding: "2rem",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    No reservations found.
                  </td>
                </tr>
              ) : (
                currentItems.map((row) => {
                  const badgeStyle = getStatusStyle(row.status);
                  const isFinalStatus =
                    row.status === "COMPLETED" || row.status === "CANCELLED";

                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: "1px solid #1e293b",
                        color: "#fff",
                        fontSize: "0.9rem",
                      }}
                    >
                      <td style={{ padding: "1rem", color: "#64748b", fontWeight: "600" }}>
                        {row.displayId}
                      </td>

                      <td style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "50%",
                              background: "#1e293b",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.8rem",
                              fontWeight: "bold",
                              color: "#3b82f6",
                            }}
                          >
                            {getInitials(row.customer.name)}
                          </div>

                          <div>
                            <p style={{ margin: 0, fontWeight: "600" }}>{row.customer.name}</p>
                            <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                              {row.customer.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "1rem" }}>
                        <span
                          style={{
                            background: "#1e293b",
                            padding: "0.3rem 0.6rem",
                            borderRadius: "0.375rem",
                            fontSize: "0.8rem",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {row.plate}
                        </span>
                      </td>

                      <td style={{ padding: "1rem", color: "#e2e8f0" }}>
                        <div>{row.slot}</div>
                        {row.floorName && (
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            {row.floorName}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "1rem" }}>
                        <p style={{ margin: 0, fontWeight: "600" }}>
                          {formatDate(row.startTime)},{" "}
                          <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                            {formatTime(row.startTime)}
                          </span>
                        </p>
                        <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b" }}>
                          Ends {formatTime(row.endTime)}
                        </p>
                      </td>

                      <td style={{ padding: "1rem" }}>
                        <span
                          style={{
                            padding: "0.25rem 0.6rem",
                            borderRadius: "0.375rem",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            ...badgeStyle,
                          }}
                        >
                          {getStatusLabel(row.status)}
                        </span>
                      </td>

                      <td style={{ padding: "1rem", textAlign: "right" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            justifyContent: "flex-end",
                            color: "#64748b",
                          }}
                        >
                          <button
                            title="View reservation details"
                            onClick={() => setSelectedReservationDetail(row)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#64748b",
                              cursor: "pointer",
                              padding: "4px",
                            }}
                          >
                            <Eye size={16} />
                          </button>

                          {!isFinalStatus && (
                            <>
                              {row.status === "PENDING" && (
                                <button
                                  title="Confirm reservation"
                                  onClick={() => handleConfirmReservation(row)}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "#10b981",
                                    cursor: "pointer",
                                    padding: "4px",
                                  }}
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                              )}

                              <button
                                title="Cancel reservation"
                                onClick={() => setReservationToCancel(row)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#f59e0b",
                                  cursor: "pointer",
                                  padding: "4px",
                                }}
                              >
                                <XCircle size={16} />
                              </button>

                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredData.length > itemsPerPage && (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                style={{
                  background: "#0c1322",
                  border: "1px solid #1e293b",
                  color: "#fff",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.375rem",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    background: currentPage === page ? "#3b82f6" : "#0c1322",
                    border: "1px solid #1e293b",
                    color: "#fff",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                style={{
                  background: "#0c1322",
                  border: "1px solid #1e293b",
                  color: "#fff",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.375rem",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}


        {selectedReservationDetail && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(3, 7, 18, 0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
              backdropFilter: "blur(4px)",
              padding: "1rem",
            }}
          >
            <div
              style={{
                background: "#0c1322",
                border: "1px solid #1e293b",
                borderRadius: "0.85rem",
                width: "min(520px, 100%)",
                color: "#ffffff",
                boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "1rem",
                  padding: "1.25rem 1.5rem",
                  borderBottom: "1px solid #1e293b",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.25rem" }}>
                    Reservation Details
                  </h3>
                  <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.85rem" }}>
                    {selectedReservationDetail.displayId}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReservationDetail(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "0.25rem",
                  }}
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div style={{ padding: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, color: "#64748b", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>
                      Current Status
                    </p>
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: "0.4rem",
                        padding: "0.3rem 0.65rem",
                        borderRadius: "0.45rem",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        ...getStatusStyle(selectedReservationDetail.status),
                      }}
                    >
                      {getStatusLabel(selectedReservationDetail.status)}
                    </span>
                  </div>

                  {(selectedReservationDetail.status === "CANCELLED" ||
                    selectedReservationDetail.status === "COMPLETED") && (
                    <div
                      style={{
                        maxWidth: "260px",
                        padding: "0.75rem",
                        borderRadius: "0.65rem",
                        background: "rgba(100, 116, 139, 0.12)",
                        border: "1px solid rgba(100, 116, 139, 0.25)",
                        color: "#cbd5e1",
                        fontSize: "0.78rem",
                        lineHeight: 1.45,
                      }}
                    >
                      This reservation is closed and can no longer be modified.
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.85rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  {[
                    ["Customer", selectedReservationDetail.customer.name],
                    ["Email", selectedReservationDetail.customer.email],
                    ["Vehicle Plate", selectedReservationDetail.plate],
                    ["Vehicle Type", selectedReservationDetail.vehicleTypeName],
                    ["Slot", selectedReservationDetail.slot],
                    ["Floor", selectedReservationDetail.floorName || "-"],
                    ["Start Time", formatDateTime(selectedReservationDetail.startTime)],
                    ["End Time", formatDateTime(selectedReservationDetail.endTime)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        background: "#060b13",
                        border: "1px solid #1e293b",
                        borderRadius: "0.65rem",
                        padding: "0.8rem",
                        minWidth: 0,
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 0.35rem",
                          color: "#64748b",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        {label}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          color: "#ffffff",
                          fontSize: "0.88rem",
                          fontWeight: 600,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {value || "-"}
                      </p>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedReservationDetail(null)}
                    style={{
                      height: "42px",
                      padding: "0 1rem",
                      borderRadius: "0.65rem",
                      border: "1px solid #1e293b",
                      background: "#131c2e",
                      color: "#cbd5e1",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Close
                  </button>

                  {selectedReservationDetail.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={() => {
                        const reservation = selectedReservationDetail;
                        setSelectedReservationDetail(null);
                        handleConfirmReservation(reservation);
                      }}
                      style={{
                        height: "42px",
                        padding: "0 1rem",
                        borderRadius: "0.65rem",
                        border: "none",
                        background: "#10b981",
                        color: "#ffffff",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      Confirm
                    </button>
                  )}

                  {(selectedReservationDetail.status === "PENDING" ||
                    selectedReservationDetail.status === "CONFIRMED") && (
                    <button
                      type="button"
                      onClick={() => {
                        setReservationToCancel(selectedReservationDetail);
                        setSelectedReservationDetail(null);
                      }}
                      style={{
                        height: "42px",
                        padding: "0 1rem",
                        borderRadius: "0.65rem",
                        border: "none",
                        background: "#f59e0b",
                        color: "#ffffff",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {reservationToCancel && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(3, 7, 18, 0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              style={{
                background: "#0c1322",
                border: "1px solid #1e293b",
                padding: "2rem",
                borderRadius: "0.75rem",
                width: "420px",
                textAlign: "center",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.1)",
                  color: "#f59e0b",
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.25rem auto",
                }}
              >
                <AlertTriangle size={28} />
              </div>

              <h3
                style={{
                  color: "#fff",
                  margin: "0 0 0.5rem 0",
                  fontSize: "1.25rem",
                  fontWeight: "600",
                }}
              >
                Cancel Reservation
              </h3>

              <p
                style={{
                  color: "#64748b",
                  fontSize: "0.9rem",
                  margin: "0 0 2rem 0",
                  lineHeight: "1.5",
                }}
              >
                Are you sure you want to cancel reservation{" "}
                <span style={{ color: "#fff", fontWeight: "bold" }}>
                  {reservationToCancel.displayId}
                </span>{" "}
                for{" "}
                <span style={{ color: "#fff", fontWeight: "bold" }}>
                  {reservationToCancel.customer.name}
                </span>
                ?
              </p>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => setReservationToCancel(null)}
                  style={{
                    flex: 1,
                    padding: "0.65rem",
                    background: "transparent",
                    color: "#94a3b8",
                    border: "1px solid #1e293b",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                  }}
                >
                  No, Keep It
                </button>

                <button
                  onClick={confirmCancelReservation}
                  style={{
                    flex: 1,
                    padding: "0.65rem",
                    background: "#f59e0b",
                    color: "#fff",
                    border: "none",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                  }}
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default ReservationAdmin;