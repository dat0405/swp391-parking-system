import React, { useState, useEffect } from "react";
import Sidebar from "../dashboard/Sidebar";
import Header from "../dashboard/Header";
import { SquarePlay, LogOut, ReceiptText } from "lucide-react";
import { parkingSessionApi } from "../api/parkingSessionApi";

function CheckInOutPage() {
  const generateTicketId = () =>
    `TK-${Math.floor(100000 + Math.random() * 900000)}`;

  const [floorsData, setFloorsData] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);

  const [licensePlateIn, setLicensePlateIn] = useState("");
  const [vehicleType, setVehicleType] = useState("Car");
  const [parkingFloor, setParkingFloor] = useState("");
  const [entryTime, setEntryTime] = useState("--:--:--");
  const [ticketId, setTicketId] = useState(() => generateTicketId());

  const [searchPlate, setSearchPlate] = useState("");
  const [searchTicketId, setSearchTicketId] = useState("");
  const [checkoutData, setCheckoutData] = useState(null);

  const normalizeVehicleType = (value) => {
    const text = String(value || "").trim().toLowerCase();

    if (
      text === "car" ||
      text === "cars" ||
      text === "oto" ||
      text === "ô tô" ||
      text === "automobile"
    ) {
      return "car";
    }

    if (
      text === "motorbike" ||
      text === "motorbikes" ||
      text === "bike" ||
      text === "motorcycle" ||
      text === "xe máy"
    ) {
      return "motorbike";
    }

    return text;
  };

  const cleanPlateInput = (value) => {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  };

  const formatCarPlate = (value) => {
    const raw = cleanPlateInput(value).slice(0, 8);

    const provinceCode = raw.slice(0, 2);
    const series = raw.slice(2, 3);
    const numbers = raw.slice(3, 8);

    let result = provinceCode;

    if (series) {
      result += series;
    }

    if (numbers.length > 0) {
      result += `-${numbers.slice(0, 3)}`;
    }

    if (numbers.length > 3) {
      result += `.${numbers.slice(3, 5)}`;
    }

    return result;
  };

  const formatMotorbikePlate = (value) => {
    const raw = cleanPlateInput(value).slice(0, 9);

    const provinceCode = raw.slice(0, 2);
    const rest = raw.slice(2);

    let series = "";
    let numberStartIndex = 0;

    if (/^[A-Z]{2}/.test(rest)) {
      series = rest.slice(0, 2);
      numberStartIndex = 2;
    } else if (/^[A-Z]\d/.test(rest)) {
      series = rest.slice(0, 2);
      numberStartIndex = 2;
    } else if (/^[A-Z]/.test(rest)) {
      series = rest.slice(0, 1);
      numberStartIndex = 1;
    }

    const numbers = rest.slice(numberStartIndex, numberStartIndex + 5);

    let result = provinceCode;

    if (series) {
      result += `-${series}`;
    }

    if (numbers.length > 0) {
      result += ` ${numbers.slice(0, 3)}`;
    }

    if (numbers.length > 3) {
      result += `.${numbers.slice(3, 5)}`;
    }

    return result;
  };

  const formatPlateByVehicleType = (value, type) => {
    if (normalizeVehicleType(type) === "car") {
      return formatCarPlate(value);
    }

    return formatMotorbikePlate(value);
  };

  const getPlatePlaceholder = (type) => {
    if (normalizeVehicleType(type) === "car") {
      return "e.g., 30F-256.58";
    }

    return "e.g., 29-K6 447.43 / 59-AA 123.56";
  };

  const getPlateHint = (type) => {
    if (normalizeVehicleType(type) === "car") {
      return "Car format: 30F-256.58";
    }

    return "Motorbike format: 29-K6 447.43 or 59-AA 123.56";
  };

  const validateVietnamPlate = (plate, type) => {
    const value = String(plate || "").trim().toUpperCase();

    const carRegex = /^\d{2}[A-Z]-\d{3}\.\d{2}$/;
    const motorbikeRegex = /^\d{2}-[A-Z]{1,2}\d?\s\d{3}\.\d{2}$/;

    if (normalizeVehicleType(type) === "car") {
      return carRegex.test(value);
    }

    return motorbikeRegex.test(value);
  };

  const formatPlateForSearch = (value) => {
    const raw = String(value || "").toUpperCase();

    if (raw.includes(" ")) {
      return formatMotorbikePlate(raw);
    }

    const cleaned = cleanPlateInput(raw);

    if (/^\d{2}[A-Z]\d/.test(cleaned) || /^\d{2}[A-Z]{2}/.test(cleaned)) {
      return formatMotorbikePlate(cleaned);
    }

    return formatCarPlate(cleaned);
  };

  const formatTicket = (value) => {
    let clean = value.toUpperCase().replace(/^TK-/, "");
    let raw = clean.replace(/[^0-9]/g, "");

    if (raw.length > 6) raw = raw.slice(0, 6);

    return raw.length ? `TK-${raw}` : "";
  };

  const formatDateTime = (value) => {
    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "N/A";

    return date.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
    });
  };

  const loadActiveSessions = async () => {
    try {
      const res = await parkingSessionApi.getActiveSessions();
      const sessions = Array.isArray(res.data) ? res.data : [];

      setActiveSessions(sessions);
    } catch (error) {
      console.error("Load active sessions failed:", error);
      setActiveSessions([]);
    }
  };

  const loadParkingFloorStats = async () => {
    try {
      const res = await parkingSessionApi.getParkingFloorStats();
      const floors = Array.isArray(res.data) ? res.data : [];

      setFloorsData(floors);
    } catch (error) {
      setFloorsData([]);
    }
  };

  useEffect(() => {
    loadActiveSessions();
    loadParkingFloorStats();
  }, []);

  useEffect(() => {
    const availableFloors = floorsData.filter(
      (floor) =>
        normalizeVehicleType(floor.vehicleType) ===
        normalizeVehicleType(vehicleType)
    );

    if (availableFloors.length > 0) {
      const defaultFloor =
        availableFloors.find((f) => Number(f.availableSlots) > 0) ||
        availableFloors[0];

      setParkingFloor(String(defaultFloor.floorId));
    } else {
      setParkingFloor("");
    }
  }, [vehicleType, floorsData]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setEntryTime(now.toTimeString().split(" ")[0]);
    };

    updateTime();

    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCheckInSubmit = async (e) => {
    e.preventDefault();

    const formattedPlate = licensePlateIn.trim().toUpperCase();

    if (!formattedPlate) return;

    if (!validateVietnamPlate(formattedPlate, vehicleType)) {
      alert(
        normalizeVehicleType(vehicleType) === "car"
          ? "Invalid car license plate format. Example: 30F-256.58"
          : "Invalid motorbike license plate format. Example: 29-K6 447.43 or 59-AA 123.56"
      );
      return;
    }

    const selectedFloor = floorsData.find(
      (floor) =>
        String(floor.floorId) === String(parkingFloor) &&
        normalizeVehicleType(floor.vehicleType) ===
          normalizeVehicleType(vehicleType)
    );

    if (!selectedFloor) {
      alert("No available parking floor for selected vehicle type");
      return;
    }

    if (Number(selectedFloor.availableSlots) === 0) {
      alert("Selected parking floor is full");
      return;
    }

    try {
      const payload = {
        licensePlate: formattedPlate,
        vehicleTypeId: selectedFloor.vehicleTypeId,
        floorId: selectedFloor.floorId,
      };

      const res = await parkingSessionApi.checkIn(payload);

      window.dispatchEvent(
        new CustomEvent("dispatchParkingNotification", {
          detail: {
            action: "checked in vehicle",
            target: res.data?.licensePlate || formattedPlate,
            detail: `at ${selectedFloor.floorName || "selected floor"}`,
          },
        })
      );

      setLicensePlateIn("");
      setTicketId(res.data?.ticketId || generateTicketId());

      await loadActiveSessions();
      await loadParkingFloorStats();
    } catch (error) {
      alert(
        error.response?.data?.message ||
          error.response?.data ||
          "Check-in thất bại"
      );
    }
  };

  const handleSearchCheckout = async (e) => {
    if (e) e.preventDefault();

    const plate = searchPlate.trim().toUpperCase();
    const ticket = searchTicketId.trim().toUpperCase();

    if (!plate && !ticket) {
      alert("Please enter License Plate or Ticket ID");
      return;
    }

    try {
      const res = await parkingSessionApi.searchCheckout({
        licensePlate: plate || undefined,
        ticketId: ticket || undefined,
      });

      setCheckoutData(res.data);
    } catch (error) {
      alert(error.response?.data?.message || "Vehicle not found in system");
      setCheckoutData(null);
    }
  };

  const handleConfirmCheckOut = async () => {
    if (!checkoutData) {
      alert("Vui lòng search tìm một xe cụ thể trước khi thực hiện Check-out!");
      return;
    }

    try {
      await parkingSessionApi.checkOut({
        ticketId: checkoutData.ticketId,
        paymentMethod: "CASH",
      });

      window.dispatchEvent(
        new CustomEvent("dispatchParkingNotification", {
          detail: {
            action: "checked out vehicle",
            target: checkoutData.licensePlate,
            detail: `ticket ${checkoutData.ticketId}`,
          },
        })
      );

      setSearchPlate("");
      setSearchTicketId("");
      setCheckoutData(null);

      await loadActiveSessions();
      await loadParkingFloorStats();
    } catch (error) {
      alert(error.response?.data?.message || "Check-out thất bại");
    }
  };

  const filteredFloors = floorsData.filter(
    (floor) =>
      normalizeVehicleType(floor.vehicleType) ===
      normalizeVehicleType(vehicleType)
  );

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main
        className="main-content"
        style={{ padding: "1.5rem 2rem", boxSizing: "border-box" }}
      >
        <Header />

        <div
          className="dashboard-title"
          style={{ padding: "1.5rem 0 0.5rem 0" }}
        >
          <h1
            style={{
              color: "#fff",
              fontSize: "1.75rem",
              margin: "0 0 0.25rem 0",
            }}
          >
            Check-in/out Portal
          </h1>

          <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>
            Manage vehicle flow and real-time gate operations.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
            marginBottom: "2rem",
            marginTop: "1.5rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              padding: "2rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <h3
              style={{
                color: "#fff",
                fontSize: "1.1rem",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: 0,
              }}
            >
              <SquarePlay size={18} style={{ color: "#3b82f6" }} />
              Check-in Entry
            </h3>

            <form onSubmit={handleCheckInSubmit}>
              <div style={{ marginBottom: "1.2rem" }}>
                <label
                  style={{
                    color: "#94a3b8",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    display: "block",
                    marginBottom: "0.5rem",
                  }}
                >
                  LICENSE PLATE NUMBER
                </label>

                <input
                  type="text"
                  value={licensePlateIn}
                  placeholder={getPlatePlaceholder(vehicleType)}
                  maxLength={normalizeVehicleType(vehicleType) === "car" ? 10 : 13}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "0.375rem",
                    color: "#fff",
                    outline: "none",
                    letterSpacing: "1px",
                    fontWeight: "600",
                  }}
                  required
                  onChange={(e) =>
                    setLicensePlateIn(
                      formatPlateByVehicleType(e.target.value, vehicleType)
                    )
                  }
                />

                <p
                  style={{
                    margin: "0.35rem 0 0",
                    color: "#64748b",
                    fontSize: "0.72rem",
                  }}
                >
                  {getPlateHint(vehicleType)}
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginBottom: "1.2rem",
                }}
              >
                <div>
                  <label
                    style={{
                      color: "#94a3b8",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      display: "block",
                      marginBottom: "0.5rem",
                    }}
                  >
                    VEHICLE TYPE
                  </label>

                  <select
                    value={vehicleType}
                    onChange={(e) => {
                      setVehicleType(e.target.value);
                      setLicensePlateIn("");
                    }}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "0.375rem",
                      color: "#fff",
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    <option value="Car">Car</option>
                    <option value="Motorbike">Motorbike</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      color: "#94a3b8",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      display: "block",
                      marginBottom: "0.5rem",
                    }}
                  >
                    PARKING FLOOR
                  </label>

                  <select
                    value={parkingFloor}
                    onChange={(e) => setParkingFloor(e.target.value)}
                    disabled={filteredFloors.length === 0}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "0.375rem",
                      color: "#fff",
                      cursor:
                        filteredFloors.length === 0 ? "not-allowed" : "pointer",
                      outline: "none",
                    }}
                  >
                    {filteredFloors.length === 0 ? (
                      <option value="">No floor available</option>
                    ) : (
                      filteredFloors.map((floor) => (
                        <option
                          key={`${floor.floorId}-${floor.vehicleTypeId}`}
                          value={String(floor.floorId)}
                          disabled={Number(floor.availableSlots) === 0}
                        >
                          {floor.floorName} (
                          {Number(floor.availableSlots) > 0
                            ? `Vacant: ${floor.availableSlots}/${floor.totalSlots}`
                            : "Full House"}
                          )
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginBottom: "2rem",
                }}
              >
                <div>
                  <label
                    style={{
                      color: "#94a3b8",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      display: "block",
                      marginBottom: "0.5rem",
                    }}
                  >
                    ENTRY TIME
                  </label>

                  <input
                    type="text"
                    value={entryTime}
                    readOnly
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "0.375rem",
                      color: "#94a3b8",
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      color: "#94a3b8",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      display: "block",
                      marginBottom: "0.5rem",
                    }}
                  >
                    TICKET ID
                  </label>

                  <input
                    type="text"
                    value={ticketId}
                    readOnly
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                      borderRadius: "0.375rem",
                      color: "#94a3b8",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={filteredFloors.length === 0}
                style={{
                  width: "100%",
                  padding: "1rem",
                  backgroundColor:
                    filteredFloors.length === 0 ? "#334155" : "#3b82f6",
                  color: filteredFloors.length === 0 ? "#64748b" : "#fff",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontWeight: "600",
                  cursor:
                    filteredFloors.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                Confirm Check-in
              </button>
            </form>
          </div>

          <div
            style={{
              backgroundColor: "#1e293b",
              padding: "2rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            <h3
              style={{
                color: "#fff",
                fontSize: "1.1rem",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: 0,
              }}
            >
              <LogOut size={18} style={{ color: "#10b981" }} />
              Check-out Exit
            </h3>

            <form
              onSubmit={handleSearchCheckout}
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <input
                type="text"
                value={searchPlate}
                placeholder="Biển số"
                onChange={(e) => setSearchPlate(formatPlateForSearch(e.target.value))}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  backgroundColor: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "0.375rem",
                  color: "#fff",
                  outline: "none",
                  letterSpacing: "1px",
                  fontWeight: "600",
                  fontSize: "0.9rem",
                }}
              />

              <input
                type="text"
                value={searchTicketId}
                placeholder="Mã vé (TK-926006)"
                onChange={(e) => setSearchTicketId(formatTicket(e.target.value))}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  backgroundColor: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "0.375rem",
                  color: "#fff",
                  outline: "none",
                  letterSpacing: "1px",
                  fontWeight: "600",
                  fontSize: "0.9rem",
                }}
              />

              <button
                type="submit"
                style={{
                  padding: "0 1.5rem",
                  backgroundColor: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.375rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                SEARCH
              </button>
            </form>

            {checkoutData ? (
              <div
                style={{
                  backgroundColor: "#0f172a",
                  padding: "1.25rem",
                  borderRadius: "0.5rem",
                  marginBottom: "1.5rem",
                  border: "1px solid #1e293b",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <h4
                      style={{
                        color: "#fff",
                        margin: 0,
                        fontSize: "1.2rem",
                        letterSpacing: "1px",
                      }}
                    >
                      {checkoutData.licensePlate}
                    </h4>

                    <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                      Slot: {checkoutData.slotCode || "N/A"}
                    </span>
                  </div>

                  <span
                    style={{
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                      color: "#10b981",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "0.25rem",
                      fontSize: "0.7rem",
                      fontWeight: "600",
                      height: "fit-content",
                    }}
                  >
                    STAY ACTIVE
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.75rem",
                    fontSize: "0.8rem",
                    color: "#94a3b8",
                    borderBottom: "1px solid #1e293b",
                    paddingBottom: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    ENTRY TIME
                    <div style={{ color: "#fff", marginTop: "0.2rem" }}>
                      {formatDateTime(checkoutData.checkInTime)}
                    </div>
                  </div>

                  <div>
                    CURRENT TIME
                    <div style={{ color: "#fff", marginTop: "0.2rem" }}>
                      {formatDateTime(checkoutData.checkOutTime)}
                    </div>
                  </div>

                  <div>
                    DURATION
                    <div style={{ color: "#fff", marginTop: "0.2rem" }}>
                      {checkoutData.durationHours
                        ? `${checkoutData.durationHours} giờ`
                        : "N/A"}
                    </div>
                  </div>

                  <div>
                    PRICE PER HOUR
                    <div style={{ color: "#fff", marginTop: "0.2rem" }}>
                      {checkoutData.pricePerHour
                        ? `${formatCurrency(checkoutData.pricePerHour)} / giờ`
                        : "N/A"}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#94a3b8",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Parking Fee</span>
                    <span style={{ color: "#fff" }}>
                      {formatCurrency(checkoutData.totalAmount)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Service Charge</span>
                    <span style={{ color: "#fff" }}>{formatCurrency(0)}</span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "1.1rem",
                      fontWeight: "700",
                      color: "#fff",
                      borderTop: "1px dashed #334155",
                      paddingTop: "0.75rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    <span>Total Amount</span>
                    <span style={{ color: "#10b981" }}>
                      {formatCurrency(checkoutData.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "#0f172a",
                  padding: "2rem",
                  borderRadius: "0.5rem",
                  marginBottom: "1.5rem",
                  border: "1px dashed #334155",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: "0.9rem",
                }}
              >
                No payment information available. Please enter a license plate
                number or ticket ID and click SEARCH to check.
              </div>
            )}

            <button
              onClick={handleConfirmCheckOut}
              disabled={!checkoutData}
              style={{
                width: "100%",
                padding: "1rem",
                backgroundColor: checkoutData ? "#10b981" : "#334155",
                color: checkoutData ? "#fff" : "#64748b",
                border: "none",
                borderRadius: "0.5rem",
                fontWeight: "600",
                cursor: checkoutData ? "pointer" : "not-allowed",
              }}
            >
              Confirm Check-out
            </button>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "#1e293b",
            padding: "1.5rem",
            borderRadius: "0.75rem",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <h3
            style={{
              color: "#fff",
              fontSize: "1rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <ReceiptText size={18} style={{ color: "#3b82f6" }} />
            Danh Sách Xe Đang Đỗ Trong Hệ Thống ({activeSessions.length} xe)
          </h3>

          {activeSessions.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>
              Bãi xe trống trơn, hãy thực hiện check-in thêm xe mới.
            </p>
          ) : (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {activeSessions.map((session) => (
                <div
                  key={session.ticketId}
                  onClick={async () => {
                    setSearchPlate(session.licensePlate);
                    setSearchTicketId(session.ticketId);

                    try {
                      const res = await parkingSessionApi.searchCheckout({
                        ticketId: session.ticketId,
                      });

                      setCheckoutData(res.data);
                    } catch (error) {
                      alert(
                        error.response?.data?.message ||
                          "Không lấy được thông tin checkout"
                      );

                      setCheckoutData(null);
                    }
                  }}
                  style={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.375rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                  title="Click nhanh để chọn xe này làm thủ tục Check-out"
                >
                  <span
                    style={{
                      color: "#fff",
                      fontWeight: "600",
                      fontSize: "0.85rem",
                    }}
                  >
                    {session.licensePlate}
                  </span>

                  <span style={{ color: "#3b82f6", fontSize: "0.7rem" }}>
                    Slot: {session.slotCode || "N/A"} | {session.ticketId}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default CheckInOutPage;