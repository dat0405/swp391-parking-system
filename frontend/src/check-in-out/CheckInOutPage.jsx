import React, { useState, useEffect } from "react";
import Sidebar from "../dashboard/Sidebar";
import Header from "../dashboard/Header";
import { SquarePlay, LogOut, ReceiptText, X, Zap, ShieldCheck } from "lucide-react";
import { parkingSessionApi } from "../api/parkingSessionApi";

const theme = {
  page: "var(--bg-dashboard)",
  card: "var(--bg-card)",
  cardSoft: "var(--bg-card-soft)",
  input: "var(--bg-input)",
  border: "var(--border-color)",
  borderSoft: "var(--border-soft)",
  text: "var(--text-main)",
  muted: "var(--text-muted)",
  blue: "var(--primary-blue)",
  blueSoft: "var(--primary-blue-soft)",
  green: "var(--success-green)",
  greenSoft: "var(--success-green-soft)",
  red: "var(--danger-red)",
  redSoft: "var(--danger-red-soft)",
  shadow: "var(--shadow-card)"
};

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

  // Quản lý trạng thái hiển thị Modal QR tính tiền khi Checkout thành công
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Fix lỗi ảnh QR bị đảo màu âm bản: Cố định thông số dark và bgcolor chuẩn mực
  const getFakeQRCode = (ticketId, amount) => {
    const dataString = `Payment-Ticket-${ticketId}-Amount-${amount}-VND`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=165x165&data=${encodeURIComponent(dataString)}&dark=000000&bgcolor=ffffff`;
  };

  const normalizeVehicleType = (value) => {
    const text = String(value || "").trim().toLowerCase();
    if (["car", "cars", "oto", "ô tô", "automobile"].includes(text)) return "car";
    if (["motorbike", "motorbikes", "bike", "motorcycle", "xe máy"].includes(text)) return "motorbike";
    return text;
  };

  const cleanPlateInput = (value) => {
    return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  };

  const formatCarPlate = (value) => {
    const raw = cleanPlateInput(value).slice(0, 8);
    const provinceCode = raw.slice(0, 2);
    const series = raw.slice(2, 3);
    const numbers = raw.slice(3, 8);

    let result = provinceCode;
    if (series) result += series;
    if (numbers.length > 0) result += `-${numbers.slice(0, 3)}`;
    if (numbers.length > 3) result += `.${numbers.slice(3, 5)}`;
    return result;
  };

  const formatMotorbikePlate = (value) => {
    const raw = cleanPlateInput(value).slice(0, 9);
    const provinceCode = raw.slice(0, 2);
    const rest = raw.slice(2);

    let series = "";
    let numberStartIndex = 0;

    if (/^[A-Z]{2}/.test(rest) || /^[A-Z]\d/.test(rest)) {
      series = rest.slice(0, 2);
      numberStartIndex = 2;
    } else if (/^[A-Z]/.test(rest)) {
      series = rest.slice(0, 1);
      numberStartIndex = 1;
    }

    const numbers = rest.slice(numberStartIndex, numberStartIndex + 5);

    let result = provinceCode;
    if (series) result += `-${series}`;
    if (numbers.length > 0) result += ` ${numbers.slice(0, 3)}`;
    if (numbers.length > 3) result += `.${numbers.slice(3, 5)}`;
    return result;
  };

  const formatPlateByVehicleType = (value, type) => {
    if (normalizeVehicleType(type) === "car") {
      return formatCarPlate(value);
    }
    return formatMotorbikePlate(value);
  };

  const getPlatePlaceholder = (type) => {
    if (normalizeVehicleType(type) === "car") return "e.g., 30F-256.58";
    return "e.g., 29-K6 447.43 / 59-AA 123.56";
  };

  const getPlateHint = (type) => {
    if (normalizeVehicleType(type) === "car") return "Car format: 30F-256.58";
    return "Motorbike format: 29-K6 447.43 or 59-AA 123.56";
  };

  const validateVietnamPlate = (plate, type) => {
    const value = String(plate || "").trim().toUpperCase();
    const carRegex = /^\d{2}[A-Z]-\d{3}\.\d{2}$/;
    const motorbikeRegex = /^\d{2}-[A-Z]{1,2}\d?\s\d{3}\.\d{2}$/;

    if (normalizeVehicleType(type) === "car") return carRegex.test(value);
    return motorbikeRegex.test(value);
  };

  const formatPlateForSearch = (value) => {
    const raw = String(value || "").toUpperCase();
    if (raw.includes(" ")) return formatMotorbikePlate(raw);
    const cleaned = cleanPlateInput(raw);
    if (/^\d{2}[A-Z]\d/.test(cleaned) || /^\d{2}[A-Z]{2}/.test(cleaned)) {
      return formatMotorbikePlate(cleaned);
    }
    return formatCarPlate(cleaned);
  };

  const formatTicket = (value) => {
    let clean = String(value || "").toUpperCase().replace(/^TK-/, "");
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
      year: "numeric"
    });
  };

  const formatCurrency = (value) => {
    return Number(value || 0).toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND"
    });
  };

  const loadActiveSessions = async () => {
    try {
      const res = await parkingSessionApi.getActiveSessions();
      setActiveSessions(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Load active sessions failed:", error);
      setActiveSessions([]);
    }
  };

  const loadParkingFloorStats = async () => {
    try {
      const res = await parkingSessionApi.getParkingFloorStats();
      setFloorsData(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Load parking floor stats failed:", error);
      setFloorsData([]);
    }
  };

  useEffect(() => {
    loadActiveSessions();
    loadParkingFloorStats();
  }, []);

  useEffect(() => {
    const availableFloors = floorsData.filter(
      (floor) => normalizeVehicleType(floor.vehicleType) === normalizeVehicleType(vehicleType)
    );

    if (availableFloors.length > 0) {
      const defaultFloor =
        availableFloors.find((floor) => Number(floor.availableSlots) > 0) || availableFloors[0];
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
        normalizeVehicleType(floor.vehicleType) === normalizeVehicleType(vehicleType)
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
        floorId: selectedFloor.floorId
      };

      const res = await parkingSessionApi.checkIn(payload);

      window.dispatchEvent(
        new CustomEvent("dispatchParkingNotification", {
          detail: {
            action: "checked in vehicle",
            target: res.data?.licensePlate || formattedPlate,
            detail: `at ${selectedFloor.floorName || "selected floor"}`
          }
        })
      );

      setLicensePlateIn("");
      setTicketId(res.data?.ticketId || generateTicketId());

      await loadActiveSessions();
      await loadParkingFloorStats();
    } catch (error) {
      alert(error.response?.data?.message || error.response?.data || "Check-in thất bại");
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
        ticketId: ticket || undefined
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
        paymentMethod: "QR_CODE"
      });

      window.dispatchEvent(
        new CustomEvent("dispatchParkingNotification", {
          detail: {
            action: "checked out vehicle",
            target: checkoutData.licensePlate,
            detail: `ticket ${checkoutData.ticketId}`
          }
        })
      );

      // Kích hoạt hiển thị Box Modal tính tiền thành công
      setShowPaymentModal(true);

      await loadActiveSessions();
      await loadParkingFloorStats();
    } catch (error) {
      alert(error.response?.data?.message || "Check-out thất bại");
    }
  };

  const handleCloseModal = () => {
    setShowPaymentModal(false);
    setSearchPlate("");
    setSearchTicketId("");
    setCheckoutData(null);
  };

  const filteredFloors = floorsData.filter(
    (floor) => normalizeVehicleType(floor.vehicleType) === normalizeVehicleType(vehicleType)
  );

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main
        className="main-content"
        style={{
          padding: "1.5rem 2rem",
          boxSizing: "border-box",
          background: theme.page,
          color: theme.text
        }}
      >
        <Header />

        {/* CSS STYLE BLOCK ĐIỀU KHIỂN ĐẢO MÀU THEO DARK/LIGHT MODE CHỐNG MỜ CHỮ */}
        <style>{`
          .pm-modal-card {
            background: #111827 !important;
            border: 1px solid rgba(59, 130, 246, 0.4) !important;
            box-shadow: 0 0 35px rgba(59, 130, 246, 0.55) !important;
          }
          .pm-text-title { color: #ffffff !important; }
          .pm-text-license { color: #ffffff !important; }
          .pm-text-label { color: #6b7280 !important; }
          .pm-text-value { color: #e5e7eb !important; }
          .pm-text-subrow { color: #9ca3af !important; }
          .pm-qr-box { 
            background: #1e293b !important; 
            border: 1px solid #334155 !important; 
          }

          body.light-mode .pm-modal-card {
            background: var(--bg-card) !important;
            border: 1px solid var(--border-color) !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08), 0 0 15px rgba(59, 130, 246, 0.15) !important;
          }
          body.light-mode .pm-text-title { color: var(--text-main) !important; }
          body.light-mode .pm-text-license { color: var(--text-main) !important; }
          body.light-mode .pm-text-label { color: var(--text-muted) !important; }
          body.light-mode .pm-text-value { color: var(--text-main) !important; }
          body.light-mode .pm-text-subrow { color: var(--text-muted) !important; }
          body.light-mode .pm-qr-box { 
            background: var(--bg-card-soft) !important; 
            border: 1px solid var(--border-color) !important; 
          }
        `}</style>

        <div className="dashboard-title" style={{ padding: "1.5rem 0 0.5rem 0" }}>
          <h1 style={{ color: theme.text, fontSize: "1.75rem", margin: "0 0 0.25rem 0" }}>
            Check-in/out Portal
          </h1>
          <p style={{ color: theme.muted, margin: 0, fontSize: "0.9rem" }}>
            Manage vehicle flow and real-time gate operations.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
            marginBottom: "2rem",
            marginTop: "1.5rem"
          }}
        >
          {/* COLUMN LEFT: CHECK-IN ENTRY */}
          <div
            style={{
              background: theme.card,
              padding: "2rem",
              borderRadius: "0.85rem",
              border: `1px solid ${theme.border}`,
              boxShadow: theme.shadow
            }}
          >
            <h3
              style={{
                color: theme.text,
                fontSize: "1.1rem",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: 0
              }}
            >
              <SquarePlay size={18} style={{ color: theme.blue }} />
              Check-in Entry
            </h3>

            <form onSubmit={handleCheckInSubmit}>
              <div style={{ marginBottom: "1.2rem" }}>
                <FieldLabel>LICENSE PLATE NUMBER</FieldLabel>
                <TextInput
                  type="text"
                  value={licensePlateIn}
                  placeholder={getPlatePlaceholder(vehicleType)}
                  maxLength={normalizeVehicleType(vehicleType) === "car" ? 10 : 13}
                  required
                  onChange={(e) =>
                    setLicensePlateIn(formatPlateByVehicleType(e.target.value, vehicleType))
                  }
                />
                <p style={{ margin: "0.35rem 0 0", color: theme.muted, fontSize: "0.72rem" }}>
                  {getPlateHint(vehicleType)}
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginBottom: "1.2rem"
                }}
              >
                <div>
                  <FieldLabel>VEHICLE TYPE</FieldLabel>
                  <SelectInput
                    value={vehicleType}
                    onChange={(e) => {
                      setVehicleType(e.target.value);
                      setLicensePlateIn("");
                    }}
                  >
                    <option value="Car">Car</option>
                    <option value="Motorbike">Motorbike</option>
                  </SelectInput>
                </div>

                <div>
                  <FieldLabel>PARKING FLOOR</FieldLabel>
                  <SelectInput
                    value={parkingFloor}
                    onChange={(e) => setParkingFloor(e.target.value)}
                    disabled={filteredFloors.length === 0}
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
                  </SelectInput>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginBottom: "2rem"
                }}
              >
                <div>
                  <FieldLabel>ENTRY TIME</FieldLabel>
                  <TextInput type="text" value={entryTime} readOnly muted />
                </div>
                <div>
                  <FieldLabel>TICKET ID</FieldLabel>
                  <TextInput type="text" value={ticketId} readOnly muted />
                </div>
              </div>

              <button
                type="submit"
                disabled={filteredFloors.length === 0}
                style={{
                  width: "100%",
                  padding: "1rem",
                  background: filteredFloors.length === 0 ? theme.cardSoft : theme.blue,
                  color: filteredFloors.length === 0 ? theme.muted : "#ffffff",
                  border: "none",
                  borderRadius: "0.6rem",
                  fontWeight: "700",
                  cursor: filteredFloors.length === 0 ? "not-allowed" : "pointer"
                }}
              >
                Confirm Check-in
              </button>
            </form>
          </div>

          {/* COLUMN RIGHT: CHECK-OUT EXIT */}
          <div
            style={{
              background: theme.card,
              padding: "2rem",
              borderRadius: "0.85rem",
              border: `1px solid ${theme.border}`,
              boxShadow: theme.shadow
            }}
          >
            <h3
              style={{
                color: theme.text,
                fontSize: "1.1rem",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: 0
              }}
            >
              <LogOut size={18} style={{ color: theme.green }} />
              Check-out Exit
            </h3>

            <form
              onSubmit={handleSearchCheckout}
              style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}
            >
              <TextInput
                type="text"
                value={searchPlate}
                placeholder="Biển số"
                onChange={(e) => setSearchPlate(formatPlateForSearch(e.target.value))}
                style={{ flex: 1 }}
              />

              <TextInput
                type="text"
                value={searchTicketId}
                placeholder="Mã vé (TK-926006)"
                onChange={(e) => setSearchTicketId(formatTicket(e.target.value))}
                style={{ flex: 1 }}
              />

              <button
                type="submit"
                style={{
                  padding: "0 1.5rem",
                  background: theme.green,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                SEARCH
              </button>
            </form>

            {checkoutData ? (
              <div
                style={{
                  background: theme.cardSoft,
                  padding: "1.25rem",
                  borderRadius: "0.7rem",
                  marginBottom: "1.5rem",
                  border: `1px solid ${theme.border}`
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                    gap: "1rem"
                  }}
                >
                  <div>
                    <h4 style={{ color: theme.text, margin: 0, fontSize: "1.2rem", letterSpacing: "1px" }}>
                      {checkoutData.licensePlate}
                    </h4>
                    <span style={{ color: theme.muted, fontSize: "0.75rem" }}>
                      Slot: {checkoutData.slotCode || "N/A"}
                    </span>
                  </div>
                  <span style={{ background: theme.greenSoft, color: theme.green, padding: "0.2rem 0.5rem", borderRadius: "0.35rem", fontSize: "0.7rem", fontWeight: "700", height: "fit-content" }}>
                    STAY ACTIVE
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.75rem",
                    fontSize: "0.8rem",
                    color: theme.muted,
                    borderBottom: `1px solid ${theme.border}`,
                    paddingBottom: "1rem",
                    marginBottom: "1rem"
                  }}
                >
                  <InfoItem label="ENTRY TIME">{formatDateTime(checkoutData.checkInTime)}</InfoItem>
                  <InfoItem label="CURRENT TIME">{formatDateTime(checkoutData.checkOutTime)}</InfoItem>
                  <InfoItem label="DURATION">{checkoutData.durationHours ? `${checkoutData.durationHours} giờ` : "N/A"}</InfoItem>
                  <InfoItem label="PRICE PER HOUR">{checkoutData.pricePerHour ? `${formatCurrency(checkoutData.pricePerHour)} / giờ` : "N/A"}</InfoItem>
                </div>

                <div style={{ fontSize: "0.85rem", color: theme.muted, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <PriceRow label="Parking Fee" value={formatCurrency(checkoutData.totalAmount)} />
                  <PriceRow label="Service Charge" value={formatCurrency(0)} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "800", color: theme.text, borderTop: `1px dashed ${theme.border}`, paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                    <span>Total Amount</span>
                    <span style={{ color: theme.green }}>{formatCurrency(checkoutData.totalAmount)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: theme.cardSoft, padding: "2rem", borderRadius: "0.7rem", marginBottom: "1.5rem", border: `1px dashed ${theme.border}`, textAlign: "center", color: theme.muted, fontSize: "0.9rem", lineHeight: 1.45 }}>
                No payment information available. Please enter a license plate number or ticket ID and click SEARCH to check.
              </div>
            )}

            <button
              onClick={handleConfirmCheckOut}
              disabled={!checkoutData}
              style={{
                width: "100%",
                padding: "1rem",
                background: checkoutData ? theme.green : theme.cardSoft,
                color: checkoutData ? "#ffffff" : theme.muted,
                border: "none",
                borderRadius: "0.6rem",
                fontWeight: "700",
                cursor: checkoutData ? "pointer" : "not-allowed"
              }}
            >
              Confirm Check-out
            </button>
          </div>
        </div>

        {/* ACTIVE VEHICLES LIST */}
        <div style={{ background: theme.card, padding: "1.5rem", borderRadius: "0.85rem", border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
          <h3 style={{ color: theme.text, fontSize: "1rem", margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ReceiptText size={18} style={{ color: theme.blue }} />
            Danh Sách Xe Đang Đỗ Trong Hệ Thống ({activeSessions.length} xe)
          </h3>

          {activeSessions.length === 0 ? (
            <p style={{ color: theme.muted, fontSize: "0.85rem", margin: 0 }}>
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
                      const res = await parkingSessionApi.searchCheckout({ ticketId: session.ticketId });
                      setCheckoutData(res.data);
                    } catch (error) {
                      alert(error.response?.data?.message || "Không lấy được thông tin checkout");
                      setCheckoutData(null);
                    }
                  }}
                  style={{ background: theme.cardSoft, border: `1px solid ${theme.border}`, padding: "0.65rem 0.8rem", borderRadius: "0.5rem", cursor: "pointer", display: "flex", flexDirection: "column", gap: "3px" }}
                  title="Click nhanh để chọn xe này làm thủ tục Check-out"
                >
                  <span style={{ color: theme.text, fontWeight: "700", fontSize: "0.85rem" }}>{session.licensePlate}</span>
                  <span style={{ color: theme.blue, fontSize: "0.7rem" }}>Slot: {session.slotCode || "N/A"} | {session.ticketId}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========================================================
            FIXED BOX OVERLAY MODAL: AUTODETECT LIGHT & DARK THEME
           ======================================================== */}
        {showPaymentModal && checkoutData && (
          <div
            style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(10, 15, 30, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              backdropFilter: "blur(4px)",
              padding: "1rem"
            }}
          >
            <div
              className="pm-modal-card"
              style={{
                padding: "2rem",
                borderRadius: "1rem",
                width: "720px",
                maxWidth: "100%",
                position: "relative",
                fontFamily: "sans-serif",
                boxSizing: "border-box",
                transition: "all 0.25s ease"
              }}
            >
              {/* Close Button X */}
              <button
                onClick={handleCloseModal}
                style={{
                  position: "absolute",
                  top: "1.25rem", right: "1.25rem",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af"
                }}
              >
                <X size={20} />
              </button>

              {/* Title Block */}
              <h3 className="pm-text-title" style={{ marginTop: 0, fontSize: "1.1rem", fontWeight: "600", marginBottom: "1.5rem" }}>
                Check-out & QR Payment
              </h3>

              {/* Two Column Content Grid Layout */}
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "2.5rem" }}>
                
                {/* LEFT DATA DETAILS SUMMARY PANEL */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className="pm-text-license" style={{ fontSize: "1.8rem", fontWeight: "800", letterSpacing: "0.5px" }}>
                      {checkoutData.licensePlate}
                    </span>
                    <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "0.25rem 0.6rem", borderRadius: "0.375rem", fontSize: "0.72rem", fontWeight: "700" }}>
                      STAY ACTIVE
                    </span>
                  </div>

                  <div className="pm-text-subrow" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                    Slot: {checkoutData.slotCode || "N/A"}
                  </div>

                  {/* Metadata Info Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem 1rem", marginTop: "1.5rem" }}>
                    <div>
                      <div className="pm-text-label" style={{ fontSize: "0.72rem", fontWeight: "700" }}>ENTRY TIME</div>
                      <div className="pm-text-value" style={{ fontSize: "0.88rem", fontWeight: "600", marginTop: "0.15rem" }}>
                        {checkoutData.checkInTime ? new Date(checkoutData.checkInTime).toLocaleTimeString("vi-VN") : "--:--"} {checkoutData.checkInTime ? new Date(checkoutData.checkInTime).toLocaleDateString("vi-VN") : ""}
                      </div>
                    </div>
                    <div>
                      <div className="pm-text-label" style={{ fontSize: "0.72rem", fontWeight: "700" }}>CURRENT TIME</div>
                      <div className="pm-text-value" style={{ fontSize: "0.88rem", fontWeight: "600", marginTop: "0.15rem" }}>
                        {checkoutData.checkOutTime ? new Date(checkoutData.checkOutTime).toLocaleTimeString("vi-VN") : "--:--"} {checkoutData.checkOutTime ? new Date(checkoutData.checkOutTime).toLocaleDateString("vi-VN") : ""}
                      </div>
                    </div>
                    <div>
                      <div className="pm-text-label" style={{ fontSize: "0.72rem", fontWeight: "700" }}>DURATION</div>
                      <div className="pm-text-value" style={{ fontSize: "0.88rem", fontWeight: "600", marginTop: "0.15rem" }}>
                        {checkoutData.durationHours || 1} giờ
                      </div>
                    </div>
                    <div>
                      <div className="pm-text-label" style={{ fontSize: "0.72rem", fontWeight: "700" }}>PRICE PER HOUR</div>
                      <div className="pm-text-value" style={{ fontSize: "0.88rem", fontWeight: "600", marginTop: "0.15rem" }}>
                        {formatCurrency(checkoutData.pricePerHour || 5000)} / giờ
                      </div>
                    </div>
                  </div>

                  {/* Price Row Breakdown */}
                  <div style={{ marginTop: "1.5rem", borderTop: "1px solid rgba(128,128,128,0.2)", paddingTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <span className="pm-text-subrow">Parking Fee</span>
                      <span className="pm-text-title" style={{ fontWeight: "600" }}>{formatCurrency(checkoutData.totalAmount)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                      <span className="pm-text-subrow">Service Charge</span>
                      <span className="pm-text-title" style={{ fontWeight: "600" }}>{formatCurrency(0)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "700", borderTop: "1px dashed rgba(128,128,128,0.3)", paddingTop: "1rem", marginTop: "0.25rem" }}>
                      <span className="pm-text-title">Total Amount</span>
                      <span style={{ color: "#10b981", fontSize: "1.25rem", fontWeight: "800" }}>
                        {formatCurrency(checkoutData.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT PANEL: INTERACTIVE SCAN QR CARD METHOD */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div className="pm-text-title" style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "1rem" }}>
                    Quét mã QR để thanh toán
                  </div>

                  <div className="pm-qr-box" style={{ padding: "1.25rem", borderRadius: "0.75rem", display: "inline-block" }}>
                    {/* Bọc cứng thẻ div nền trắng chuẩn mực ngăn chặn mã QR bị dính nền đen/âm bản */}
                    <div style={{ background: "#ffffff", padding: "0.5rem", borderRadius: "0.4rem", display: "block" }}>
                      <img
                        src={getFakeQRCode(checkoutData.ticketId, checkoutData.totalAmount)}
                        alt="Scannable real gate check-out payment QR simulation target"
                        style={{ display: "block" }}
                        width={165}
                        height={165}
                      />
                    </div>
                  </div>

                  <div className="pm-text-subrow" style={{ fontSize: "0.78rem", textAlign: "center", marginTop: "1rem", maxWidth: "220px", lineHeight: "1.4" }}>
                    Vui lòng quét mã QR để thanh toán phí gửi xe.
                  </div>

                  {/* Verification Secure Footers */}
                  <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", borderTop: "1px solid rgba(128,128,128,0.2)", paddingTop: "1rem", width: "100%", justifyContent: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#60a5fa", fontSize: "0.72rem", fontWeight: "600" }}>
                      <Zap size={13} fill="#60a5fa" /> Xác nhận tức thì
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#60a5fa", fontSize: "0.72rem", fontWeight: "600" }}>
                      <ShieldCheck size={13} fill="transparent" /> Thanh toán bảo mật
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label style={{ color: theme.muted, fontSize: "0.75rem", fontWeight: "700", display: "block", marginBottom: "0.5rem" }}>
      {children}
    </label>
  );
}

function TextInput({ muted = false, style = {}, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "0.75rem",
        background: muted ? theme.cardSoft : theme.input,
        border: `1px solid ${theme.border}`,
        borderRadius: "0.5rem",
        color: muted ? theme.muted : theme.text,
        outline: "none",
        letterSpacing: props.readOnly ? "0" : "1px",
        fontWeight: "650",
        fontSize: "0.9rem",
        boxSizing: "border-box",
        ...style
      }}
    />
  );
}

function SelectInput({ children, style = {}, ...props }) {
  return (
    <select
      {...props}
      style={{
        width: "100%",
        padding: "0.75rem",
        background: theme.input,
        border: `1px solid ${theme.border}`,
        borderRadius: "0.5rem",
        color: theme.text,
        cursor: props.disabled ? "not-allowed" : "pointer",
        outline: "none",
        fontWeight: "650",
        boxSizing: "border-box",
        ...style
      }}
    >
      {children}
    </select>
  );
}

function InfoItem({ label, children }) {
  return (
    <div>
      {label}
      <div style={{ color: theme.text, marginTop: "0.2rem", fontWeight: "650" }}>{children}</div>
    </div>
  );
}

function PriceRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span>{label}</span>
      <span style={{ color: theme.text, fontWeight: "650" }}>{value}</span>
    </div>
  );
}

export default CheckInOutPage;