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
  RefreshCcw
} from "lucide-react";

import { bookingApi } from "../api/bookingApi";
import axiosClient from "../api/axiosClient";

const RESERVATION_HISTORY_KEY = "reservation_admin_history";

const theme = {
  page: "var(--bg-dashboard)",
  card: "var(--bg-card)",
  cardSoft: "var(--bg-card-soft)",
  input: "var(--bg-input)",
  border: "var(--border-color)",
  tableHeader: "var(--bg-table-header)",
  tableRow: "var(--bg-table-row)",
  text: "var(--text-main)",
  muted: "var(--text-muted)",
  blue: "var(--primary-blue)",
  blueSoft: "var(--primary-blue-soft)",
  green: "var(--success-green)",
  greenSoft: "var(--success-green-soft)",
  red: "var(--danger-red)",
  redSoft: "var(--danger-red-soft)",
  yellow: "var(--warning-yellow)",
  yellowSoft: "var(--warning-yellow-soft)",
  shadow: "var(--shadow-card)"
};

const normalizeVehicleType = (type) => {
  const value = String(type || "").trim().toLowerCase();

  if (
    value.includes("motor") ||
    value.includes("bike") ||
    value.includes("xe máy") ||
    value.includes("motorbike")
  ) {
    return "motorbike";
  }

  if (value.includes("car") || value.includes("ô tô") || value.includes("oto")) {
    return "car";
  }

  return value || "unknown";
};

const getSlotCode = (slot) => {
  const rawSlotCode =
    slot?.slotCode ||
    slot?.slot_code ||
    slot?.parkingSlotCode ||
    slot?.code ||
    slot?.slotName ||
    slot?.name;

  if (
    rawSlotCode !== undefined &&
    rawSlotCode !== null &&
    String(rawSlotCode).trim()
  ) {
    return String(rawSlotCode).trim();
  }

  if (slot?.slotNumber !== undefined && slot?.slotNumber !== null) {
    return `SLOT-${slot.slotNumber}`;
  }

  return `SLOT-${slot?.id || "UNKNOWN"}`;
};

const getVehicleTypeName = (slot) => {
  return (
    slot.vehicleType?.typeName ||
    slot.vehicleType?.vehicleTypeName ||
    slot.vehicleType?.name ||
    slot.vehicleTypeName ||
    slot.vehicleType ||
    slot.type ||
    "Unknown"
  );
};

const getVehicleType = (slot) => {
  return normalizeVehicleType(getVehicleTypeName(slot));
};

const getFloorCode = (slot) => {
  return (
    slot.zone?.floor?.floorName ||
    slot.zone?.floor?.floorCode ||
    slot.zone?.floor?.name ||
    slot.floorCode ||
    slot.floorName ||
    slot.floor?.floorCode ||
    slot.floor?.floorName ||
    slot.parkingFloor?.floorCode ||
    slot.parkingFloor?.floorName ||
    "Unknown"
  );
};

const normalizeFloorName = (floorName) => {
  return String(floorName || "Unknown").trim();
};

const isGroundFloor = (floorName) => {
  const value = normalizeFloorName(floorName).toUpperCase();

  return value === "G" || value === "GROUND" || value === "FLOOR G";
};

const getAllowedTypeByFloor = (floorName) => {
  if (isGroundFloor(floorName)) {
    return "motorbike";
  }

  return "car";
};

const getFloorSortValue = (floorName) => {
  const value = normalizeFloorName(floorName).toUpperCase();

  if (value === "G" || value === "FLOOR G" || value === "GROUND") {
    return 0;
  }

  const numberMatch = value.match(/\d+/);

  if (numberMatch) {
    return Number(numberMatch[0]);
  }

  if (value === "A" || value === "A1" || value === "F1") {
    return 1;
  }

  if (value === "C" || value === "A2" || value === "F2") {
    return 2;
  }

  return 999;
};

const getDisplayPrefixByFloor = (floorName) => {
  const value = normalizeFloorName(floorName).toUpperCase();

  if (value === "G" || value === "GROUND" || value === "FLOOR G") {
    return "G";
  }

  if (
    value === "1" ||
    value === "A" ||
    value === "A1" ||
    value === "F1" ||
    value === "FLOOR 1" ||
    value === "FLOOR A" ||
    value === "FLOOR A1"
  ) {
    return "A";
  }

  if (
    value === "2" ||
    value === "C" ||
    value === "A2" ||
    value === "F2" ||
    value === "FLOOR 2" ||
    value === "FLOOR C" ||
    value === "FLOOR A2"
  ) {
    return "C";
  }

  return "S";
};

const buildSlotDisplayMap = (slots) => {
  const mappedSlots = slots
    .map((slot) => ({
      id: slot.id,
      slotCode: getSlotCode(slot),
      floor: getFloorCode(slot),
      type: getVehicleType(slot),
      raw: slot
    }))
    .filter((slot) => {
      const allowedType = getAllowedTypeByFloor(slot.floor);

      if (slot.floor === "Unknown") {
        return true;
      }

      return slot.type === allowedType;
    })
    .sort((slotA, slotB) => {
      const floorCompare =
        getFloorSortValue(slotA.floor) - getFloorSortValue(slotB.floor);

      if (floorCompare !== 0) {
        return floorCompare;
      }

      return Number(slotA.id) - Number(slotB.id);
    });

  const floorCounters = new Map();
  const displayMap = new Map();

  mappedSlots.forEach((slot) => {
    const floorKey = slot.floor || "Unknown";
    const currentCount = floorCounters.get(floorKey) || 0;
    const nextNumber = currentCount + 1;

    floorCounters.set(floorKey, nextNumber);

    const prefix = getDisplayPrefixByFloor(slot.floor);
    const displayCode = `${prefix}-${String(nextNumber).padStart(2, "0")}`;

    displayMap.set(Number(slot.id), displayCode);
  });

  return displayMap;
};

const normalizeRawSlotCodeFallback = (slotCode) => {
  if (!slotCode) return "-";

  let code = String(slotCode).trim().toUpperCase();

  code = code
    .replace("-CAR-", "-")
    .replace("-BIKE-", "-")
    .replace("-MOTORBIKE-", "-")
    .replace("-MOTOR-", "-");

  if (code.startsWith("1-")) {
    code = code.replace("1-", "A-");
  }

  if (code.startsWith("2-")) {
    code = code.replace("2-", "C-");
  }

  return code;
};

const getSavedReservationHistory = () => {
  try {
    const saved = localStorage.getItem(RESERVATION_HISTORY_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    localStorage.removeItem(RESERVATION_HISTORY_KEY);
    return [];
  }
};

const saveReservationHistory = (items) => {
  try {
    localStorage.setItem(RESERVATION_HISTORY_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Save reservation history failed:", error);
  }
};

const getReservationUniqueKey = (item) => {
  if (item?.id !== undefined && item?.id !== null) {
    return `id-${item.id}`;
  }

  return [item?.plate, item?.slotId, item?.slot, item?.startTime, item?.endTime]
    .filter(Boolean)
    .join("-");
};

const mergeReservationHistory = (oldItems, newItems) => {
  const map = new Map();

  oldItems.forEach((item) => {
    const key = getReservationUniqueKey(item);

    if (key) {
      map.set(key, item);
    }
  });

  newItems.forEach((item) => {
    const key = getReservationUniqueKey(item);

    if (key) {
      map.set(key, {
        ...(map.get(key) || {}),
        ...item
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const dateA = new Date(a.startTime || 0).getTime();
    const dateB = new Date(b.startTime || 0).getTime();

    if (Number.isNaN(dateA) && Number.isNaN(dateB)) {
      return Number(b.id || 0) - Number(a.id || 0);
    }

    return dateB - dateA;
  });
};

const ReservationAdmin = () => {
  const [reservations, setReservations] = useState(() =>
    getSavedReservationHistory()
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [reservationToCancel, setReservationToCancel] = useState(null);
  const [selectedReservationDetail, setSelectedReservationDetail] =
    useState(null);

  const itemsPerPage = 5;

  const normalizeStatus = (status) => {
    const value = String(status || "").trim().toUpperCase();

    if (value === "CANCELED") return "CANCELLED";

    return value;
  };

  const mapBookingToReservation = (booking, slotDisplayMap = new Map()) => {
    const status = normalizeStatus(booking.status);
    const slotId = Number(booking.slotId || booking.slot?.id);
    const displaySlot =
      slotDisplayMap.get(slotId) ||
      normalizeRawSlotCodeFallback(booking.slotCode) ||
      `Slot ID: ${booking.slotId || "-"}`;

    return {
      id: booking.id,
      displayId: `#RES-${String(booking.id).padStart(4, "0")}`,
      customer: {
        name: booking.customerName || "Unknown user",
        email: booking.customerEmail || `User ID: ${booking.userId || "-"}`
      },
      plate: booking.licensePlate || "-",
      vehicleTypeName: booking.vehicleTypeName || "-",
      slot: displaySlot,
      rawSlotCode: booking.slotCode || "",
      slotId: booking.slotId || booking.slot?.id || null,
      floorName: booking.floorName || "",
      startTime: booking.startTime,
      endTime: booking.endTime,
      status,
      raw: booking
    };
  };

  const loadReservations = async () => {
    try {
      setIsLoading(true);

      const [bookingResponse, slotsResponse] = await Promise.all([
        bookingApi.getAllBookings(),
        axiosClient.get("/parking-slots")
      ]);

      const data = Array.isArray(bookingResponse.data)
        ? bookingResponse.data
        : [];

      const slotsPayload = slotsResponse.data;
      const allSlots = Array.isArray(slotsPayload)
        ? slotsPayload
        : slotsPayload.content || slotsPayload.data || slotsPayload.slots || [];

      const slotDisplayMap = buildSlotDisplayMap(allSlots);

      const latestReservations = data.map((booking) =>
        mapBookingToReservation(booking, slotDisplayMap)
      );

      setReservations((previousReservations) => {
        const baseHistory =
          previousReservations.length > 0
            ? previousReservations
            : getSavedReservationHistory();

        const mergedReservations = mergeReservationHistory(
          baseHistory,
          latestReservations
        );

        saveReservationHistory(mergedReservations);

        return mergedReservations;
      });
    } catch (error) {
      console.error("Load reservations failed:", error);

      const savedHistory = getSavedReservationHistory();

      if (savedHistory.length > 0) {
        setReservations(savedHistory);
      }

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

  useEffect(() => {
    saveReservationHistory(reservations);
  }, [reservations]);

  const filteredData = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return reservations.filter((item) => {
      const searchableText = [
        item.displayId,
        item.customer.name,
        item.customer.email,
        item.plate,
        item.slot,
        item.rawSlotCode,
        item.floorName,
        item.vehicleTypeName,
        item.status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || searchableText.includes(keyword);
      const matchesStatus =
        statusFilter === "All" || normalizeStatus(item.status) === statusFilter;

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

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit"
    });
  };

  const formatTime = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatDateTime = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
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
        background: "rgba(147, 51, 234, 0.12)",
        color: "#a855f7",
        border: "1px solid rgba(147, 51, 234, 0.22)"
      };
    }

    if (status === "CONFIRMED") {
      return {
        background: theme.greenSoft,
        color: theme.green,
        border: "1px solid rgba(16, 185, 129, 0.22)"
      };
    }

    if (status === "COMPLETED") {
      return {
        background: "rgba(100, 116, 139, 0.12)",
        color: theme.muted,
        border: "1px solid rgba(100, 116, 139, 0.22)"
      };
    }

    if (status === "CANCELLED") {
      return {
        background: theme.redSoft,
        color: theme.red,
        border: "1px solid rgba(239, 68, 68, 0.22)"
      };
    }

    return {
      background: "rgba(100, 116, 139, 0.12)",
      color: theme.muted,
      border: "1px solid rgba(100, 116, 139, 0.22)"
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
      "Raw Slot Code",
      "Floor",
      "Start Time",
      "End Time",
      "Status"
    ];

    const rows = filteredData.map((item) => [
      item.displayId,
      item.customer.name,
      item.customer.email,
      item.plate,
      item.vehicleTypeName,
      item.slot,
      item.rawSlotCode || "",
      item.floorName,
      item.startTime || "",
      item.endTime || "",
      getStatusLabel(item.status)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
    ].join("\n");

    const blob = new Blob([`\ufeff${csvContent}`], {
      type: "text/csv;charset=utf-8;"
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

      setReservations((previousReservations) => {
        const updatedReservations = previousReservations.map((item) => {
          if (item.id === reservationToCancel.id) {
            return {
              ...item,
              status: "CANCELLED"
            };
          }

          return item;
        });

        saveReservationHistory(updatedReservations);

        return updatedReservations;
      });

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

  const metricCards = [
    {
      label: "TOTAL RESERVATIONS",
      value: totalReservations,
      hint: "All reservations in the system",
      icon: Calendar,
      color: theme.blue,
      background: theme.blueSoft
    },
    {
      label: "ACTIVE NOW",
      value: activeReservations,
      hint: "Reservations currently in progress",
      icon: Car,
      color: theme.green,
      background: theme.greenSoft
    },
    {
      label: "COMPLETED",
      value: completedReservations,
      hint: "Reservations that have been completed",
      icon: CheckCircle2,
      color: theme.blue,
      background: theme.blueSoft
    },
    {
      label: "CANCELLED",
      value: cancelledReservations,
      hint: "Reservations that were cancelled",
      icon: XCircle,
      color: theme.red,
      background: theme.redSoft
    }
  ];

  return (
    <div
      className="dashboard-layout"
      style={{
        display: "flex",
        background: theme.page,
        minHeight: "100vh",
        color: theme.text
      }}
    >
      <Sidebar />

      <main
        className="main-content"
        style={{
          flex: 1,
          padding: "2rem",
          overflowY: "auto",
          background: theme.page,
          color: theme.text
        }}
      >
        <Header />

        <div style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              margin: "1.5rem 0 0.35rem 0",
              color: theme.text,
              fontSize: "1.85rem",
              fontWeight: 800,
              letterSpacing: "-0.04em"
            }}
          >
            Reservations
          </h1>

          <p style={{ color: theme.muted, margin: "0" }}>
            View and manage parking reservations across the facility.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "1.25rem",
            marginBottom: "2rem"
          }}
        >
          {metricCards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                style={{
                  background: theme.card,
                  padding: "1.25rem",
                  borderRadius: "0.85rem",
                  border: `1px solid ${theme.border}`,
                  position: "relative",
                  minHeight: "128px",
                  boxShadow: theme.shadow,
                  overflow: "hidden"
                }}
              >
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: theme.muted,
                    fontWeight: "800"
                  }}
                >
                  {card.label}
                </span>

                <p
                  style={{
                    fontSize: "1.8rem",
                    fontWeight: "800",
                    margin: "0.5rem 0",
                    color: theme.text,
                    lineHeight: 1.1
                  }}
                >
                  {card.value.toLocaleString()}
                </p>

                <span
                  style={{
                    fontSize: "0.75rem",
                    color: card.label === "CANCELLED" ? theme.red : theme.muted,
                    lineHeight: 1.35,
                    display: "block",
                    maxWidth: "75%"
                  }}
                >
                  {card.hint}
                </span>

                <div
                  style={{
                    position: "absolute",
                    top: "1.25rem",
                    right: "1.25rem",
                    background: card.background,
                    padding: "0.65rem",
                    borderRadius: "0.75rem",
                    color: card.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Icon size={20} />
                </div>
              </div>
            );
          })}
        </div>

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
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
              flex: 1,
              flexWrap: "wrap"
            }}
          >
            <div style={{ position: "relative", width: "min(360px, 100%)" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: theme.muted
                }}
              />

              <input
                type="text"
                placeholder="Filter by name, email, plate, slot..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.75rem 0.65rem 2.25rem",
                  borderRadius: "0.6rem",
                  border: `1px solid ${theme.border}`,
                  background: theme.input,
                  color: theme.text,
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{
                padding: "0.65rem 1rem",
                borderRadius: "0.6rem",
                border: `1px solid ${theme.border}`,
                background: theme.input,
                color: theme.text,
                cursor: "pointer",
                fontSize: "0.9rem",
                outline: "none",
                minWidth: "160px"
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
              disabled={isLoading}
              style={{
                padding: "0.65rem",
                borderRadius: "0.6rem",
                border: `1px solid ${theme.border}`,
                background: theme.input,
                color: theme.text,
                cursor: isLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                opacity: isLoading ? 0.65 : 1
              }}
            >
              <RefreshCcw size={18} />
            </button>
          </div>

          <button
            title="Export report to CSV"
            onClick={handleExportCSV}
            style={{
              padding: "0.65rem",
              borderRadius: "0.6rem",
              border: `1px solid ${theme.border}`,
              background: "#111827",
              color: "#ffffff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center"
            }}
          >
            <Download size={18} />
          </button>
        </div>

        <div
          style={{
            background: theme.card,
            borderRadius: "0.85rem",
            border: `1px solid ${theme.border}`,
            overflow: "hidden",
            marginBottom: "1.5rem",
            boxShadow: theme.shadow,
            minHeight: "454px",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div
            style={{
              width: "100%",
              overflowX: "auto",
              flex: 1
            }}
          >
            <table
              style={{
                width: "100%",
                minWidth: "980px",
                height: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                color: theme.text
              }}
            >
              <thead>
                <tr
                  style={{
                    height: "62px",
                    borderBottom: `1px solid ${theme.border}`,
                    color: theme.muted,
                    fontSize: "0.85rem",
                    background: theme.tableHeader
                  }}
                >
                  <th style={{ padding: "1rem" }}>ID</th>
                  <th style={{ padding: "1rem" }}>Customer</th>
                  <th style={{ padding: "1rem" }}>Vehicle Plate</th>
                  <th style={{ padding: "1rem" }}>Slot</th>
                  <th style={{ padding: "1rem" }}>Schedule</th>
                  <th style={{ padding: "1rem" }}>Status</th>
                  <th style={{ padding: "1rem", textAlign: "right" }}>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr style={{ height: "320px" }}>
                    <td
                      colSpan="7"
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: theme.muted,
                        background: theme.tableRow
                      }}
                    >
                      Loading reservations...
                    </td>
                  </tr>
                ) : currentItems.length === 0 ? (
                  <tr style={{ height: "320px" }}>
                    <td
                      colSpan="7"
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: theme.muted,
                        background: theme.tableRow
                      }}
                    >
                      No reservations found.
                    </td>
                  </tr>
                ) : (
                  <>
                    {currentItems.map((row) => {
                      const badgeStyle = getStatusStyle(row.status);
                      const isFinalStatus =
                        row.status === "COMPLETED" ||
                        row.status === "CANCELLED";

                      return (
                        <tr
                          key={`${row.displayId}-${row.startTime}-${row.endTime}`}
                          style={{
                            height: "76px",
                            borderBottom: `1px solid ${theme.border}`,
                            color: theme.text,
                            fontSize: "0.9rem",
                            background: theme.tableRow
                          }}
                        >
                          <td
                            style={{
                              padding: "1rem",
                              color: theme.muted,
                              fontWeight: "700"
                            }}
                          >
                            {row.displayId}
                          </td>

                          <td style={{ padding: "1rem" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem"
                              }}
                            >
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  background: theme.blueSoft,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.8rem",
                                  fontWeight: "800",
                                  color: theme.blue,
                                  flexShrink: 0
                                }}
                              >
                                {getInitials(row.customer.name)}
                              </div>

                              <div style={{ minWidth: 0 }}>
                                <p
                                  style={{
                                    margin: 0,
                                    fontWeight: "700",
                                    color: theme.text,
                                    overflowWrap: "anywhere"
                                  }}
                                >
                                  {row.customer.name}
                                </p>

                                <p
                                  style={{
                                    margin: 0,
                                    fontSize: "0.75rem",
                                    color: theme.muted,
                                    overflowWrap: "anywhere"
                                  }}
                                >
                                  {row.customer.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: "1rem" }}>
                            <span
                              style={{
                                background: theme.cardSoft,
                                color: theme.text,
                                border: `1px solid ${theme.border}`,
                                padding: "0.3rem 0.6rem",
                                borderRadius: "0.45rem",
                                fontSize: "0.8rem",
                                letterSpacing: "0.5px",
                                fontWeight: "700"
                              }}
                            >
                              {row.plate}
                            </span>
                          </td>

                          <td style={{ padding: "1rem", color: theme.text }}>
                            <div style={{ fontWeight: "700" }}>{row.slot}</div>

                            {row.floorName && (
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: theme.muted
                                }}
                              >
                                {row.floorName}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: "1rem" }}>
                            <p
                              style={{
                                margin: 0,
                                fontWeight: "700",
                                color: theme.text
                              }}
                            >
                              {formatDate(row.startTime)},{" "}
                              <span
                                style={{
                                  color: theme.muted,
                                  fontSize: "0.8rem"
                                }}
                              >
                                {formatTime(row.startTime)}
                              </span>
                            </p>

                            <p
                              style={{
                                margin: 0,
                                fontSize: "0.75rem",
                                color: theme.muted
                              }}
                            >
                              Ends {formatTime(row.endTime)}
                            </p>
                          </td>

                          <td style={{ padding: "1rem" }}>
                            <span
                              style={{
                                padding: "0.3rem 0.65rem",
                                borderRadius: "0.45rem",
                                fontSize: "0.75rem",
                                fontWeight: "800",
                                display: "inline-flex",
                                alignItems: "center",
                                ...badgeStyle
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
                                color: theme.muted
                              }}
                            >
                              <button
                                title="View reservation details"
                                onClick={() =>
                                  setSelectedReservationDetail(row)
                                }
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: theme.muted,
                                  cursor: "pointer",
                                  padding: "4px"
                                }}
                              >
                                <Eye size={16} />
                              </button>

                              {!isFinalStatus && (
                                <>
                                  {row.status === "PENDING" && (
                                    <button
                                      title="Confirm reservation"
                                      onClick={() =>
                                        handleConfirmReservation(row)
                                      }
                                      style={{
                                        background: "transparent",
                                        border: "none",
                                        color: theme.green,
                                        cursor: "pointer",
                                        padding: "4px"
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
                                      color: theme.yellow,
                                      cursor: "pointer",
                                      padding: "4px"
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
                    })}

                    {Array.from({
                      length: Math.max(itemsPerPage - currentItems.length, 0)
                    }).map((_, index) => (
                      <tr
                        key={`reservation-empty-space-${index}`}
                        style={{
                          height: "76px",
                          background: theme.tableRow,
                          borderBottom:
                            index ===
                            Math.max(itemsPerPage - currentItems.length, 0) - 1
                              ? "none"
                              : `1px solid ${theme.border}`
                        }}
                      >
                        <td colSpan="7" />
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredData.length > itemsPerPage && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center"
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                flexWrap: "wrap"
              }}
            >
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                style={{
                  background: theme.input,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.45rem",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  opacity: currentPage === 1 ? 0.55 : 1
                }}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      background:
                        currentPage === page ? theme.blue : theme.input,
                      border:
                        currentPage === page
                          ? `1px solid ${theme.blue}`
                          : `1px solid ${theme.border}`,
                      color: currentPage === page ? "#ffffff" : theme.text,
                      padding: "0.5rem 0.75rem",
                      borderRadius: "0.45rem",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: "700"
                    }}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((page) => Math.min(page + 1, totalPages))
                }
                style={{
                  background: theme.input,
                  border: `1px solid ${theme.border}`,
                  color: theme.text,
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.45rem",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  opacity: currentPage === totalPages ? 0.55 : 1
                }}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {selectedReservationDetail && (
          <ReservationDetailModal
            selectedReservationDetail={selectedReservationDetail}
            setSelectedReservationDetail={setSelectedReservationDetail}
            setReservationToCancel={setReservationToCancel}
            handleConfirmReservation={handleConfirmReservation}
            getStatusStyle={getStatusStyle}
            getStatusLabel={getStatusLabel}
            formatDateTime={formatDateTime}
          />
        )}

        {reservationToCancel && (
          <CancelReservationModal
            reservationToCancel={reservationToCancel}
            setReservationToCancel={setReservationToCancel}
            confirmCancelReservation={confirmCancelReservation}
          />
        )}
      </main>
    </div>
  );
};

function ReservationDetailModal({
  selectedReservationDetail,
  setSelectedReservationDetail,
  setReservationToCancel,
  handleConfirmReservation,
  getStatusStyle,
  getStatusLabel,
  formatDateTime
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3, 7, 18, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        backdropFilter: "blur(4px)",
        padding: "1rem"
      }}
    >
      <div
        style={{
          background: theme.card,
          border: `1px solid ${theme.border}`,
          borderRadius: "0.85rem",
          width: "min(520px, 100%)",
          color: theme.text,
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            padding: "1.25rem 1.5rem",
            borderBottom: `1px solid ${theme.border}`
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "1.25rem",
                color: theme.text
              }}
            >
              Reservation Details
            </h3>

            <p
              style={{
                margin: "0.35rem 0 0",
                color: theme.muted,
                fontSize: "0.85rem"
              }}
            >
              {selectedReservationDetail.displayId}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setSelectedReservationDetail(null)}
            style={{
              background: "transparent",
              border: "none",
              color: theme.muted,
              cursor: "pointer",
              padding: "0.25rem"
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
              marginBottom: "1.25rem"
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: theme.muted,
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  textTransform: "uppercase"
                }}
              >
                Current Status
              </p>

              <span
                style={{
                  display: "inline-block",
                  marginTop: "0.4rem",
                  padding: "0.35rem 0.7rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  ...getStatusStyle(selectedReservationDetail.status)
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
                  background: theme.cardSoft,
                  border: `1px solid ${theme.border}`,
                  color: theme.muted,
                  fontSize: "0.78rem",
                  lineHeight: 1.45
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
              marginBottom: "1.25rem"
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
              ["End Time", formatDateTime(selectedReservationDetail.endTime)]
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  background: theme.cardSoft,
                  border: `1px solid ${theme.border}`,
                  borderRadius: "0.65rem",
                  padding: "0.8rem",
                  minWidth: 0
                }}
              >
                <p
                  style={{
                    margin: "0 0 0.35rem",
                    color: theme.muted,
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    textTransform: "uppercase"
                  }}
                >
                  {label}
                </p>

                <p
                  style={{
                    margin: 0,
                    color: theme.text,
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    overflowWrap: "anywhere"
                  }}
                >
                  {value || "-"}
                </p>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              flexWrap: "wrap"
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedReservationDetail(null)}
              style={{
                height: "42px",
                padding: "0 1rem",
                borderRadius: "0.65rem",
                border: `1px solid ${theme.border}`,
                background: theme.input,
                color: theme.text,
                cursor: "pointer",
                fontWeight: 700
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
                  background: theme.green,
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 700
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
                  background: theme.yellow,
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 700
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CancelReservationModal({
  reservationToCancel,
  setReservationToCancel,
  confirmCancelReservation
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3, 7, 18, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        backdropFilter: "blur(4px)",
        padding: "1rem"
      }}
    >
      <div
        style={{
          background: theme.card,
          border: `1px solid ${theme.border}`,
          padding: "2rem",
          borderRadius: "0.85rem",
          width: "420px",
          maxWidth: "100%",
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35)",
          color: theme.text
        }}
      >
        <div
          style={{
            background: theme.yellowSoft,
            color: theme.yellow,
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem auto"
          }}
        >
          <AlertTriangle size={28} />
        </div>

        <h3
          style={{
            color: theme.text,
            margin: "0 0 0.5rem 0",
            fontSize: "1.25rem",
            fontWeight: "800"
          }}
        >
          Cancel Reservation
        </h3>

        <p
          style={{
            color: theme.muted,
            fontSize: "0.9rem",
            margin: "0 0 2rem 0",
            lineHeight: "1.5"
          }}
        >
          Are you sure you want to cancel reservation{" "}
          <span style={{ color: theme.text, fontWeight: "800" }}>
            {reservationToCancel.displayId}
          </span>{" "}
          for{" "}
          <span style={{ color: theme.text, fontWeight: "800" }}>
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
              background: theme.input,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: "0.55rem",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "0.9rem"
            }}
          >
            No, Keep It
          </button>

          <button
            onClick={confirmCancelReservation}
            style={{
              flex: 1,
              padding: "0.65rem",
              background: theme.yellow,
              color: "#ffffff",
              border: "none",
              borderRadius: "0.55rem",
              cursor: "pointer",
              fontWeight: "700",
              fontSize: "0.9rem"
            }}
          >
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReservationAdmin;